/**
 * Intake Router
 * Handles secure patient intake flow via tokenized links
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/lib/trpc/server";
import {
  createIntakeRequest,
  validateToken,
  completeIntake,
  checkRateLimit,
  listIntakeTokens,
  cancelIntakeToken,
} from "@/server/services/intake-token";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { createClient } from "@/lib/supabase/server";
import { getStediClient } from "@/lib/stedi/client";

// Validation schemas
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format");

const createIntakeRequestSchema = z.object({
  phone: phoneSchema,
  providerId: z.string().uuid().optional(),
  dateOfService: z.string().optional(), // ISO date string
});

const addressSchema = z.object({
  line1: z.string().min(1, "Address is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2-letter code"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
});

const demographicsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  sex: z.enum(["M", "F", "O"], { errorMap: () => ({ message: "Please select sex" }) }),
  phone: phoneSchema,
  email: z.string().email("Invalid email address").optional(),
  address: addressSchema,
});

const insuranceSchema = z.object({
  payerId: z.string().uuid("Please select a payer"),
  memberId: z.string().min(1, "Member ID is required"),
  groupNumber: z.string().optional(),
  planType: z.string().optional(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subscriberRelationship: z.enum(["self", "spouse", "child", "other"]),
  subscriber: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
});

const submitIntakeSchema = z.object({
  token: z.string().min(1, "Token is required"),
  turnstileToken: z.string().min(1, "Verification required"),
  demographics: demographicsSchema,
  insurance: insuranceSchema.optional(),
  selfPay: z.boolean().default(false),
  consentAcknowledged: z.boolean().refine(val => val === true, "You must acknowledge the consent"),
});

export const intakeRouter = createTRPCRouter({
  /**
   * Create a new intake request (staff only)
   * Generates a secure token and sends SMS to patient
   */
  create: protectedProcedure
    .input(createIntakeRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await createIntakeRequest({
        phone: input.phone,
        providerId: input.providerId,
        dateOfService: input.dateOfService,
        createdBy: ctx.user?.id,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create intake request");
      }

      // Log to audit
      const supabase = await createClient();
      await supabase.from("audit_log").insert({
        table_name: "intake_tokens",
        record_id: result.token?.id,
        action: "INSERT",
        old_data: null,
        new_data: { phone: input.phone, providerId: input.providerId },
        performed_by: ctx.user?.id,
      } as any);

      return result.token;
    }),

  /**
   * List intake requests (staff only)
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "completed", "expired", "cancelled"]).optional(),
        providerId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      return listIntakeTokens({
        status: input?.status,
        providerId: input?.providerId,
        limit: input?.limit || 20,
        offset: input?.offset || 0,
      });
    }),

  /**
   * Cancel an intake request (staff only)
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const result = await cancelIntakeToken(input.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to cancel intake request");
      }

      // Log to audit
      const supabase = await createClient();
      await supabase.from("audit_log").insert({
        table_name: "intake_tokens",
        record_id: input.id,
        action: "UPDATE",
        old_data: { status: "pending" },
        new_data: { status: "cancelled" },
        performed_by: ctx.user?.id,
      } as any);

      return { success: true };
    }),

  /**
   * Validate an intake token (public - patient accessing form)
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const result = await validateToken(input.token);
      
      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }

      // Return limited info for the form
      return {
        valid: true,
        dateOfService: result.token?.dateOfService,
        expiresAt: result.token?.expiresAt,
      };
    }),

  /**
   * Submit intake form (public - patient submitting data)
   */
  submitIntake: publicProcedure
    .input(submitIntakeSchema)
    .mutation(async ({ input, ctx }) => {
      // Get client IP for rate limiting (from context or headers)
      const clientIp = ctx.headers?.get?.("x-forwarded-for")?.split(",")[0] || "unknown";

      // Check rate limits
      const tokenRateLimit = await checkRateLimit(input.token, "token");
      if (!tokenRateLimit.allowed) {
        throw new Error("Too many submission attempts. Please try again later.");
      }

      const ipRateLimit = await checkRateLimit(clientIp, "ip");
      if (!ipRateLimit.allowed) {
        throw new Error("Too many requests. Please try again later.");
      }

      // Verify Turnstile token
      const turnstileResult = await verifyTurnstileToken(input.turnstileToken, clientIp);
      if (!turnstileResult.success) {
        throw new Error(turnstileResult.error || "Verification failed");
      }

      // Validate the intake token
      const tokenValidation = await validateToken(input.token);
      if (!tokenValidation.valid) {
        throw new Error(tokenValidation.error || "Invalid intake link");
      }

      const supabase = await createClient();

      // Create patient record
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          first_name: input.demographics.firstName,
          last_name: input.demographics.lastName,
          middle_name: input.demographics.middleName || null,
          dob: input.demographics.dateOfBirth,
          sex: input.demographics.sex,
          phone: input.demographics.phone,
          email: input.demographics.email || null,
          address_line1: input.demographics.address.line1,
          address_line2: input.demographics.address.line2 || null,
          city: input.demographics.address.city,
          state: input.demographics.address.state,
          zip_code: input.demographics.address.zipCode,
        } as any)
        .select()
        .single();

      if (patientError || !patient) {
        console.error("Failed to create patient:", patientError);
        throw new Error("Failed to save patient information");
      }

      const patientData = patient as any;
      let coverageId: string | null = null;
      let eligibilityResult: any = null;

      // Create coverage policy if not self-pay
      if (!input.selfPay && input.insurance) {
        // First, create subscriber if different from patient
        let subscriberId: string | null = null;

        if (input.insurance.subscriberRelationship !== "self" && input.insurance.subscriber) {
          const { data: coverage } = await supabase
            .from("coverage_policies")
            .insert({
              patient_id: patientData.id,
              payer_id: input.insurance.payerId,
              member_id: input.insurance.memberId,
              group_number: input.insurance.groupNumber || null,
              plan_type: input.insurance.planType || null,
              effective_from: input.insurance.effectiveFrom,
              effective_to: input.insurance.effectiveTo || null,
              priority: 1,
              status: "active",
            } as any)
            .select()
            .single();

          if (coverage) {
            coverageId = (coverage as any).id;

            // Create subscriber record
            const { data: subscriber } = await supabase
              .from("subscribers")
              .insert({
                coverage_id: coverageId,
                member_id: input.insurance.memberId,
                group_number: input.insurance.groupNumber || null,
                first_name: input.insurance.subscriber.firstName,
                last_name: input.insurance.subscriber.lastName,
                dob: input.insurance.subscriber.dateOfBirth,
                relationship_to_patient: input.insurance.subscriberRelationship,
              } as any)
              .select()
              .single();

            if (subscriber) {
              subscriberId = (subscriber as any).id;
              // Update coverage with subscriber_id
              await supabase
                .from("coverage_policies")
                .update({ subscriber_id: subscriberId } as any)
                .eq("id", coverageId);
            }
          }
        } else {
          // Patient is subscriber
          const { data: coverage } = await supabase
            .from("coverage_policies")
            .insert({
              patient_id: patientData.id,
              payer_id: input.insurance.payerId,
              member_id: input.insurance.memberId,
              group_number: input.insurance.groupNumber || null,
              plan_type: input.insurance.planType || null,
              effective_from: input.insurance.effectiveFrom,
              effective_to: input.insurance.effectiveTo || null,
              priority: 1,
              status: "active",
            } as any)
            .select()
            .single();

          if (coverage) {
            coverageId = (coverage as any).id;
          }
        }

        // Run eligibility check if we have coverage and a provider
        if (coverageId && tokenValidation.token?.providerId) {
          try {
            // Get provider details
            const { data: provider } = await supabase
              .from("providers")
              .select("*")
              .eq("id", tokenValidation.token.providerId)
              .single();

            // Get payer details for trading partner ID
            const { data: payer } = await supabase
              .from("payers")
              .select("*")
              .eq("id", input.insurance.payerId)
              .single();

            if (provider && payer) {
              const providerData = provider as any;
              const payerData = payer as any;

              const stedi = getStediClient();
              const eligibilityResponse = await stedi.checkEligibility({
                controlNumber: `ELG${Date.now()}`,
                tradingPartnerServiceId: payerData.stedi_payer_id,
                provider: {
                  organizationName: providerData.organization_name || undefined,
                  firstName: providerData.first_name || undefined,
                  lastName: providerData.last_name || undefined,
                  npi: providerData.npi,
                },
                subscriber: {
                  memberId: input.insurance.memberId,
                  firstName: input.demographics.firstName,
                  lastName: input.demographics.lastName,
                  dateOfBirth: input.demographics.dateOfBirth,
                },
                encounter: {
                  dateOfService: tokenValidation.token.dateOfService || new Date().toISOString().split("T")[0],
                },
              });

              // Store eligibility check result
              const { data: eligCheck } = await supabase
                .from("eligibility_checks")
                .insert({
                  coverage_id: coverageId,
                  provider_id: tokenValidation.token.providerId,
                  date_of_service: tokenValidation.token.dateOfService || new Date().toISOString().split("T")[0],
                  request_payload: {
                    memberId: input.insurance.memberId,
                    firstName: input.demographics.firstName,
                    lastName: input.demographics.lastName,
                  },
                  response_payload: eligibilityResponse,
                  is_active: eligibilityResponse.planStatus?.some(
                    (s: any) => s.statusCode === "1" || s.status?.toLowerCase().includes("active")
                  ) ?? null,
                  benefits_summary: eligibilityResponse.benefitsInformation || null,
                } as any)
                .select()
                .single();

              eligibilityResult = {
                isActive: eligibilityResponse.planStatus?.some(
                  (s: any) => s.statusCode === "1" || s.status?.toLowerCase().includes("active")
                ),
                planStatus: eligibilityResponse.planStatus,
                benefits: eligibilityResponse.benefitsInformation,
              };
            }
          } catch (error) {
            console.error("Eligibility check failed:", error);
            // Don't fail the intake, just note the eligibility check failed
            eligibilityResult = {
              error: "Eligibility check could not be completed",
            };
          }
        }
      }

      // Mark intake as complete
      await completeIntake({
        token: input.token,
        patientId: patientData.id,
      });

      // Log to audit
      await supabase.from("audit_log").insert({
        table_name: "patients",
        record_id: patientData.id,
        action: "INSERT",
        old_data: null,
        new_data: { source: "intake_form", token: input.token },
        performed_by: null, // Patient submission, no user ID
      } as any);

      return {
        success: true,
        patientId: patientData.id,
        coverageId,
        eligibility: eligibilityResult,
      };
    }),

  /**
   * Get payers list for the intake form (public)
   */
  getPayers: publicProcedure.query(async () => {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("payers")
      .select("id, name, stedi_payer_id")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch payers:", error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      stediPayerId: p.stedi_payer_id,
    }));
  }),
});
