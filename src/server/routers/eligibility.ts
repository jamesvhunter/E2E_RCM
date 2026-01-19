import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { getStediClient, EligibilityResponse } from "@/lib/stedi/client";

/**
 * Parse Stedi eligibility response into normalized benefit summary
 */
function parseEligibilityResponse(response: EligibilityResponse) {
  const isActive = response.planStatus?.some(
    (status) =>
      status.statusCode === "1" ||
      status.status?.toLowerCase().includes("active")
  ) ?? false;

  let networkStatus: string | undefined;
  let copayAmount: number | undefined;
  let deductibleRemaining: number | undefined;
  let oopMaxRemaining: number | undefined;

  // Parse benefits information
  if (response.benefitsInformation) {
    for (const benefit of response.benefitsInformation) {
      // Network status
      if (benefit.inPlanNetworkIndicatorCode) {
        networkStatus = benefit.inPlanNetworkIndicatorCode === "Y" ? "in-network" : "out-of-network";
      }

      // Copay (code 30 or B = Co-Payment)
      if (benefit.code === "B" || benefit.code === "30") {
        if (benefit.benefitAmount !== undefined) {
          copayAmount = benefit.benefitAmount;
        }
      }

      // Deductible (code C)
      if (benefit.code === "C") {
        if (benefit.benefitAmount !== undefined) {
          deductibleRemaining = benefit.benefitAmount;
        }
      }

      // Out of Pocket Maximum (code G)
      if (benefit.code === "G") {
        if (benefit.benefitAmount !== undefined) {
          oopMaxRemaining = benefit.benefitAmount;
        }
      }
    }
  }

  return {
    isActive,
    networkStatus,
    copayAmount,
    deductibleRemaining,
    oopMaxRemaining,
    benefitsSummary: response.benefitsInformation || [],
    planStatus: response.planStatus || [],
  };
}

export const eligibilityRouter = createTRPCRouter({
  // Check eligibility for a coverage - makes real Stedi API call
  check: protectedProcedure
    .input(
      z.object({
        coverageId: z.string().uuid(),
        providerId: z.string().uuid(),
        dateOfService: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get coverage and related data
      const { data: coverage, error: coverageError } = await supabase
        .from("coverage_policies")
        .select(
          `
          *,
          payers (*),
          patients (*)
        `
        )
        .eq("id", input.coverageId)
        .single();

      if (coverageError) throw coverageError;

      const coverageData = coverage as any;

      // Get provider
      const { data: provider, error: providerError } = await supabase
        .from("providers")
        .select("*, organizations (*)")
        .eq("id", input.providerId)
        .single();

      if (providerError) throw providerError;

      const providerData = provider as any;

      // Build request payload for Stedi
      const controlNumber = `ELG${Date.now().toString().slice(-9)}`;
      const requestPayload = {
        controlNumber,
        tradingPartnerServiceId: coverageData.payers.stedi_payer_id,
        provider: {
          organizationName: providerData.organizations?.name,
          firstName: providerData.first_name || undefined,
          lastName: providerData.last_name || undefined,
          npi: providerData.npi,
        },
        subscriber: {
          memberId: coverageData.member_id,
          firstName: coverageData.patients.first_name,
          lastName: coverageData.patients.last_name,
          dateOfBirth: coverageData.patients.dob,
        },
        encounter: {
          dateOfService: input.dateOfService,
        },
      };

      let responsePayload: EligibilityResponse | null = null;
      let parsedResponse: ReturnType<typeof parseEligibilityResponse> | null = null;
      let apiError: string | null = null;

      // Make actual Stedi API call
      try {
        const stedi = getStediClient();
        responsePayload = await stedi.checkEligibility(requestPayload);
        parsedResponse = parseEligibilityResponse(responsePayload);
      } catch (error) {
        console.error("Stedi eligibility check failed:", error);
        apiError = error instanceof Error ? error.message : "Unknown error";
      }

      // Create eligibility check record
      const { data: eligibilityCheck, error: insertError } = await supabase
        .from("eligibility_checks")
        .insert({
          coverage_id: input.coverageId,
          provider_id: input.providerId,
          date_of_service: input.dateOfService,
          request_payload: requestPayload,
          response_payload: responsePayload,
          is_active: parsedResponse?.isActive ?? null,
          network_status: parsedResponse?.networkStatus ?? null,
          copay_amount: parsedResponse?.copayAmount ?? null,
          deductible_remaining: parsedResponse?.deductibleRemaining ?? null,
          oop_max_remaining: parsedResponse?.oopMaxRemaining ?? null,
          benefits_summary: parsedResponse?.benefitsSummary ?? null,
          checked_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update coverage status if we got a successful response
      if (parsedResponse) {
        const newStatus = parsedResponse.isActive ? "verified" : "inactive";
        await supabase
          .from("coverage_policies")
          .update({ status: newStatus } as any)
          .eq("id", input.coverageId);
      }

      const checkData = eligibilityCheck as any;

      return {
        eligibilityCheckId: checkData.id,
        status: apiError ? "error" : "completed",
        error: apiError,
        isActive: parsedResponse?.isActive,
        networkStatus: parsedResponse?.networkStatus,
        copayAmount: parsedResponse?.copayAmount,
        deductibleRemaining: parsedResponse?.deductibleRemaining,
        oopMaxRemaining: parsedResponse?.oopMaxRemaining,
        benefitsSummary: parsedResponse?.benefitsSummary,
        planStatus: parsedResponse?.planStatus,
      };
    }),

  // Get eligibility history for a coverage
  getHistory: protectedProcedure
    .input(
      z.object({
        coverageId: z.string().uuid(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("eligibility_checks")
        .select(
          `
          *,
          providers (id, first_name, last_name, npi)
        `
        )
        .eq("coverage_id", input.coverageId)
        .order("checked_at", { ascending: false })
        .limit(input.limit);

      if (error) throw error;
      return data;
    }),

  // Get latest eligibility for a coverage
  getLatest: protectedProcedure
    .input(z.object({ coverageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("eligibility_checks")
        .select("*")
        .eq("coverage_id", input.coverageId)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    }),

  // Update eligibility with Stedi response (for webhook/async updates)
  updateWithResponse: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        responsePayload: z.record(z.unknown()),
        isActive: z.boolean(),
        networkStatus: z.string().optional(),
        copayAmount: z.number().optional(),
        deductibleRemaining: z.number().optional(),
        oopMaxRemaining: z.number().optional(),
        benefitsSummary: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("eligibility_checks")
        .update({
          response_payload: input.responsePayload,
          is_active: input.isActive,
          network_status: input.networkStatus,
          copay_amount: input.copayAmount,
          deductible_remaining: input.deductibleRemaining,
          oop_max_remaining: input.oopMaxRemaining,
          benefits_summary: input.benefitsSummary,
        } as any)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;

      const checkData = data as any;

      // Update coverage status based on eligibility
      const newStatus = input.isActive ? "verified" : "inactive";
      await supabase
        .from("coverage_policies")
        .update({ status: newStatus } as any)
        .eq("id", checkData.coverage_id);

      return data;
    }),

  // Re-check eligibility (convenience method)
  recheck: protectedProcedure
    .input(z.object({ eligibilityCheckId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get the existing check to get coverage and provider IDs
      const { data: existingCheck, error: fetchError } = await supabase
        .from("eligibility_checks")
        .select("coverage_id, provider_id, date_of_service")
        .eq("id", input.eligibilityCheckId)
        .single();

      if (fetchError) throw fetchError;

      const checkData = existingCheck as any;

      // Use the check mutation to run a new check
      // This is a bit of a workaround - in production you might want to
      // extract the logic into a shared service
      return {
        message: "Please use the check mutation with the coverage and provider IDs",
        coverageId: checkData.coverage_id,
        providerId: checkData.provider_id,
        dateOfService: checkData.date_of_service,
      };
    }),
});
