import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

const coverageSchema = z.object({
  patientId: z.string().uuid(),
  payerId: z.string().uuid(),
  planType: z.string().optional(),
  groupNumber: z.string().optional(),
  memberId: z.string().min(1, "Member ID is required"),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

const subscriberSchema = z.object({
  coverageId: z.string().uuid(),
  memberId: z.string().min(1),
  groupNumber: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string(),
  relationshipToPatient: z.enum([
    "self",
    "spouse",
    "child",
    "other",
  ]),
});

export const coverageRouter = createTRPCRouter({
  // Get coverage policies for a patient
  listByPatient: protectedProcedure
    .input(z.object({ patientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("coverage_policies")
        .select(
          `
          *,
          payers (*),
          subscribers (*),
          eligibility_checks (
            id,
            is_active,
            checked_at,
            benefits_summary
          )
        `
        )
        .eq("patient_id", input.patientId)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data;
    }),

  // Create coverage policy
  create: protectedProcedure
    .input(coverageSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("coverage_policies")
        .insert({
          patient_id: input.patientId,
          payer_id: input.payerId,
          plan_type: input.planType,
          group_number: input.groupNumber,
          member_id: input.memberId,
          effective_from: input.effectiveFrom,
          effective_to: input.effectiveTo,
          status: "incomplete",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update coverage policy
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: coverageSchema.partial().omit({ patientId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.payerId) updateData.payer_id = input.data.payerId;
      if (input.data.planType !== undefined)
        updateData.plan_type = input.data.planType;
      if (input.data.groupNumber !== undefined)
        updateData.group_number = input.data.groupNumber;
      if (input.data.memberId) updateData.member_id = input.data.memberId;
      if (input.data.effectiveFrom)
        updateData.effective_from = input.data.effectiveFrom;
      if (input.data.effectiveTo !== undefined)
        updateData.effective_to = input.data.effectiveTo;

      const { data, error } = await supabase
        .from("coverage_policies")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Add/update subscriber info
  upsertSubscriber: protectedProcedure
    .input(subscriberSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("subscribers")
        .upsert({
          coverage_id: input.coverageId,
          member_id: input.memberId,
          group_number: input.groupNumber,
          first_name: input.firstName,
          last_name: input.lastName,
          dob: input.dob,
          relationship_to_patient: input.relationshipToPatient,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // List payers (for payer picker)
  listPayers: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("payers")
        .select("*")
        .eq("is_active", true)
        .order("name")
        .limit(input.limit);

      if (input.search) {
        query = query.ilike("name", `%${input.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),
});
