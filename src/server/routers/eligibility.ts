import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { getStediClient, EligibilityResponse } from "@/lib/stedi/client";
import { formatDateForStedi, generateControlNumber, parseStediDate } from "@/lib/stedi/utils";
import { logEligibilityRequest, logEligibilityResponse, logEligibilityError } from "@/lib/stedi/logger";

interface ParsedEligibilityResult {
  isActive: boolean;
  networkStatus?: string;
  planName?: string;
  groupNumber?: string;
  effectiveDate?: string;
  terminationDate?: string;
  subscriberName?: string;
  copayAmount?: number;
  deductibleAmount?: number;
  deductibleRemaining?: number;
  coinsurancePercent?: number;
  oopMaxAmount?: number;
  oopMaxRemaining?: number;
  coverageLevel?: string;
  benefitsSummary: any[];
  planStatus: any[];
}

/**
 * Helper function to find a benefit by code with optional filters
 */
function findBenefit(
  benefits: any[],
  code: string,
  options?: {
    inNetwork?: boolean;
    coverageLevel?: string;
    timeQualifier?: string;
  }
): any | undefined {
  return benefits.find((b) => {
    // Match benefit code
    if (b.code !== code) return false;

    // Match network status if specified
    if (options?.inNetwork !== undefined) {
      const isInNetwork = b.inPlanNetworkIndicatorCode === "Y";
      if (options.inNetwork !== isInNetwork) return false;
    }

    // Match coverage level if specified (IND = Individual, FAM = Family)
    if (options?.coverageLevel && b.coverageLevelCode !== options.coverageLevel) {
      return false;
    }

    // Match time qualifier if specified (e.g., "29" = Remaining)
    if (options?.timeQualifier && b.timeQualifierCode !== options.timeQualifier) {
      return false;
    }

    return true;
  });
}

/**
 * Parse Stedi eligibility response into normalized benefit summary
 * Comprehensive parsing following Stedi documentation
 */
function parseEligibilityResponse(response: EligibilityResponse): ParsedEligibilityResult {
  // Determine if coverage is active
  const isActive =
    response.planStatus?.some(
      (status) =>
        status.statusCode === "1" || status.status?.toLowerCase().includes("active")
    ) ?? false;

  // Extract plan information
  const planName = response.planInformation?.planName;
  const groupNumber = response.planInformation?.groupNumber;

  // Extract plan dates
  let effectiveDate: string | undefined;
  let terminationDate: string | undefined;

  if (response.planDateInformation) {
    // Try eligibility dates first, then fall back to plan dates
    const eligibilityBegin =
      response.planDateInformation.eligibilityBegin || response.planDateInformation.planBegin;
    const eligibilityEnd =
      response.planDateInformation.eligibilityEnd || response.planDateInformation.planEnd;

    // Convert from YYYYMMDD to YYYY-MM-DD
    if (eligibilityBegin) {
      try {
        effectiveDate = parseStediDate(eligibilityBegin);
      } catch {
        effectiveDate = eligibilityBegin;
      }
    }

    if (eligibilityEnd) {
      try {
        terminationDate = parseStediDate(eligibilityEnd);
      } catch {
        terminationDate = eligibilityEnd;
      }
    }
  }

  // Extract subscriber name
  let subscriberName: string | undefined;
  if (response.subscriber?.firstName && response.subscriber?.lastName) {
    subscriberName = `${response.subscriber.firstName} ${response.subscriber.lastName}`;
  }

  // Initialize benefit variables
  let networkStatus: string | undefined;
  let copayAmount: number | undefined;
  let deductibleAmount: number | undefined;
  let deductibleRemaining: number | undefined;
  let coinsurancePercent: number | undefined;
  let oopMaxAmount: number | undefined;
  let oopMaxRemaining: number | undefined;
  let coverageLevel: string | undefined;

  // Parse benefits information
  if (response.benefitsInformation && response.benefitsInformation.length > 0) {
    const benefits = response.benefitsInformation;

    // Determine overall network status
    const hasInNetwork = benefits.some((b) => b.inPlanNetworkIndicatorCode === "Y");
    const hasOutOfNetwork = benefits.some((b) => b.inPlanNetworkIndicatorCode === "N");

    if (hasInNetwork && !hasOutOfNetwork) {
      networkStatus = "in-network";
    } else if (hasOutOfNetwork && !hasInNetwork) {
      networkStatus = "out-of-network";
    } else if (hasInNetwork && hasOutOfNetwork) {
      networkStatus = "mixed";
    }

    // Prefer in-network benefits for individual coverage
    const preferInNetwork = true;
    const preferCoverageLevel = "IND";

    // Co-Payment (code B)
    const copayBenefit =
      findBenefit(benefits, "B", { inNetwork: preferInNetwork }) || findBenefit(benefits, "B");
    if (copayBenefit?.benefitAmount !== undefined) {
      copayAmount = copayBenefit.benefitAmount;
    }

    // Deductible (code C)
    // Try to find both total and remaining
    const deductibleBenefitTotal =
      findBenefit(benefits, "C", { inNetwork: preferInNetwork, coverageLevel: preferCoverageLevel }) ||
      findBenefit(benefits, "C", { inNetwork: preferInNetwork }) ||
      findBenefit(benefits, "C");

    if (deductibleBenefitTotal?.benefitAmount !== undefined) {
      deductibleAmount = deductibleBenefitTotal.benefitAmount;
    }

    // Deductible Remaining (code C with timeQualifierCode = "29")
    const deductibleBenefitRemaining =
      findBenefit(benefits, "C", { inNetwork: preferInNetwork, timeQualifier: "29" }) ||
      benefits.find((b) => b.code === "C" && b.timeQualifierCode === "29");

    if (deductibleBenefitRemaining?.benefitAmount !== undefined) {
      deductibleRemaining = deductibleBenefitRemaining.benefitAmount;
    } else if (deductibleAmount !== undefined) {
      // If no remaining amount, assume it's the same as total (not yet met)
      deductibleRemaining = deductibleAmount;
    }

    // Co-Insurance (code A) - returned as percentage
    const coinsuranceBenefit =
      findBenefit(benefits, "A", { inNetwork: preferInNetwork }) || findBenefit(benefits, "A");
    if (coinsuranceBenefit?.benefitPercent !== undefined) {
      // Stedi returns as decimal (e.g., 0.2 for 20%), convert to percentage
      coinsurancePercent = coinsuranceBenefit.benefitPercent * 100;
    }

    // Out of Pocket Maximum (code G)
    const oopBenefitTotal =
      findBenefit(benefits, "G", { inNetwork: preferInNetwork, coverageLevel: preferCoverageLevel }) ||
      findBenefit(benefits, "G", { inNetwork: preferInNetwork }) ||
      findBenefit(benefits, "G");

    if (oopBenefitTotal?.benefitAmount !== undefined) {
      oopMaxAmount = oopBenefitTotal.benefitAmount;
    }

    // Out of Pocket Remaining (code G with timeQualifierCode = "29")
    const oopBenefitRemaining =
      findBenefit(benefits, "G", { inNetwork: preferInNetwork, timeQualifier: "29" }) ||
      benefits.find((b) => b.code === "G" && b.timeQualifierCode === "29");

    if (oopBenefitRemaining?.benefitAmount !== undefined) {
      oopMaxRemaining = oopBenefitRemaining.benefitAmount;
    } else if (oopMaxAmount !== undefined) {
      // If no remaining amount, assume it's the same as total (not yet met)
      oopMaxRemaining = oopMaxAmount;
    }

    // Extract coverage level from any benefit that has it
    const benefitWithCoverageLevel = benefits.find((b) => b.coverageLevelCode);
    if (benefitWithCoverageLevel?.coverageLevelCode) {
      coverageLevel = benefitWithCoverageLevel.coverageLevelCode;
    }
  }

  return {
    isActive,
    networkStatus,
    planName,
    groupNumber,
    effectiveDate,
    terminationDate,
    subscriberName,
    copayAmount,
    deductibleAmount,
    deductibleRemaining,
    coinsurancePercent,
    oopMaxAmount,
    oopMaxRemaining,
    coverageLevel,
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
      const controlNumber = generateControlNumber("ELG");

      // Convert dates to Stedi format (YYYYMMDD)
      const dobFormatted = formatDateForStedi(coverageData.patients.dob);
      const dateOfServiceFormatted = formatDateForStedi(input.dateOfService);

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
          dateOfBirth: dobFormatted,
        },
        encounter: {
          dateOfService: dateOfServiceFormatted,
          serviceTypeCodes: ["30"], // Health Benefit Plan Coverage (general)
        },
      };

      let responsePayload: EligibilityResponse | null = null;
      let parsedResponse: ReturnType<typeof parseEligibilityResponse> | null = null;
      let apiError: string | null = null;

      // Make actual Stedi API call
      try {
        // Log request
        logEligibilityRequest(requestPayload, {
          coverageId: input.coverageId,
          providerId: input.providerId,
        });

        const stedi = getStediClient();
        responsePayload = await stedi.checkEligibility(requestPayload);

        // Log response
        logEligibilityResponse(responsePayload, {
          coverageId: input.coverageId,
          providerId: input.providerId,
        });

        parsedResponse = parseEligibilityResponse(responsePayload);
      } catch (error) {
        // Log error with context
        logEligibilityError(
          error instanceof Error ? error : new Error(String(error)),
          requestPayload,
          {
            coverageId: input.coverageId,
            providerId: input.providerId,
          }
        );

        apiError = error instanceof Error ? error.message : "Unknown error";
      }

      // Create eligibility check record with all parsed fields
      const { data: eligibilityCheck, error: insertError} = await supabase
        .from("eligibility_checks")
        .insert({
          coverage_id: input.coverageId,
          provider_id: input.providerId,
          date_of_service: input.dateOfService,
          request_payload: requestPayload,
          response_payload: responsePayload,
          // Status fields
          is_active: parsedResponse?.isActive ?? null,
          network_status: parsedResponse?.networkStatus ?? null,
          // Plan information
          plan_name: parsedResponse?.planName ?? null,
          group_number: parsedResponse?.groupNumber ?? null,
          effective_date: parsedResponse?.effectiveDate ?? null,
          termination_date: parsedResponse?.terminationDate ?? null,
          subscriber_name: parsedResponse?.subscriberName ?? null,
          // Benefit amounts
          copay_amount: parsedResponse?.copayAmount ?? null,
          deductible_amount: parsedResponse?.deductibleAmount ?? null,
          deductible_remaining: parsedResponse?.deductibleRemaining ?? null,
          coinsurance_percent: parsedResponse?.coinsurancePercent ?? null,
          oop_max_amount: parsedResponse?.oopMaxAmount ?? null,
          oop_max_remaining: parsedResponse?.oopMaxRemaining ?? null,
          coverage_level: parsedResponse?.coverageLevel ?? null,
          // Raw data
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
        // Status
        isActive: parsedResponse?.isActive,
        networkStatus: parsedResponse?.networkStatus,
        // Plan information
        planName: parsedResponse?.planName,
        groupNumber: parsedResponse?.groupNumber,
        effectiveDate: parsedResponse?.effectiveDate,
        terminationDate: parsedResponse?.terminationDate,
        subscriberName: parsedResponse?.subscriberName,
        // Benefits
        copayAmount: parsedResponse?.copayAmount,
        deductibleAmount: parsedResponse?.deductibleAmount,
        deductibleRemaining: parsedResponse?.deductibleRemaining,
        coinsurancePercent: parsedResponse?.coinsurancePercent,
        oopMaxAmount: parsedResponse?.oopMaxAmount,
        oopMaxRemaining: parsedResponse?.oopMaxRemaining,
        coverageLevel: parsedResponse?.coverageLevel,
        // Raw data
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
