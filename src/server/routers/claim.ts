import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

export const claimRouter = createTRPCRouter({
  // List claims with filters
  list: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "all",
            "ready",
            "submitted",
            "ack_accepted",
            "ack_rejected",
            "adjudicated",
            "closed",
          ])
          .optional(),
        patientId: z.string().uuid().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("claims")
        .select(
          `
          *,
          encounters (
            id,
            start_time,
            patients (id, first_name, last_name),
            providers (id, first_name, last_name)
          ),
          charge_sets (
            id,
            service_lines (*)
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(input.limit + 1);

      if (input.status && input.status !== "all") {
        query = query.eq("status", input.status);
      }

      if (input.patientId) {
        query = query.eq("encounters.patients.id", input.patientId);
      }

      if (input.cursor) {
        query = query.lt("created_at", input.cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      let nextCursor: string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (data ?? []) as any[];
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.created_at;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Get single claim with full details
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("claims")
        .select(
          `
          *,
          encounters (
            *,
            patients (*),
            providers (*),
            locations (*),
            coverage_policies (
              *,
              payers (*),
              subscribers (*)
            )
          ),
          charge_sets (
            *,
            service_lines (*)
          ),
          claim_responses (*)
        `
        )
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Create claim from finalized charge set
  create: protectedProcedure
    .input(
      z.object({
        encounterId: z.string().uuid(),
        chargeSetId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get charge set to calculate total
      const { data: chargeSet, error: fetchError } = await supabase
        .from("charge_sets")
        .select("*, service_lines (*)")
        .eq("id", input.chargeSetId)
        .single();

      if (fetchError) throw fetchError;
      if (!chargeSet) throw new Error("Charge set not found");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chargeSetData = chargeSet as any;

      if (chargeSetData.status !== "finalized") {
        throw new Error("Cannot create claim from non-finalized charge set");
      }

      const totalCharge = (chargeSetData.service_lines || []).reduce(
        (sum: number, line: { charge_amount: number }) => sum + line.charge_amount,
        0
      );

      // Check for existing claims on this encounter
      const { data: existing } = await supabase
        .from("claims")
        .select("claim_version")
        .eq("encounter_id", input.encounterId)
        .order("claim_version", { ascending: false })
        .limit(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingClaims = (existing || []) as any[];
      const nextVersion = existingClaims.length > 0 ? existingClaims[0].claim_version + 1 : 1;

      const { data, error } = await supabase
        .from("claims")
        .insert({
          encounter_id: input.encounterId,
          charge_set_id: input.chargeSetId,
          claim_version: nextVersion,
          status: "ready",
          total_charge_amount: totalCharge,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update claim status (for internal state machine transitions)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "ready",
          "submitted",
          "ack_accepted",
          "ack_rejected",
          "adjudicated",
          "closed",
        ]),
        stediTransactionId: z.string().optional(),
        stediCorrelationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {
        status: input.status,
      };

      if (input.stediTransactionId) {
        updateData.stedi_transaction_id = input.stediTransactionId;
      }

      if (input.stediCorrelationId) {
        updateData.stedi_correlation_id = input.stediCorrelationId;
      }

      if (input.status === "submitted") {
        updateData.submitted_at = new Date().toISOString();
      }

      if (input.status === "ack_accepted" || input.status === "ack_rejected") {
        updateData.acknowledged_at = new Date().toISOString();
      }

      if (input.status === "adjudicated") {
        updateData.adjudicated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("claims")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Get claims ready for submission
  getReadyToSubmit: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("claims")
      .select(
        `
        *,
        encounters (
          *,
          patients (*),
          providers (*),
          locations (*),
          coverage_policies (
            *,
            payers (*),
            subscribers (*)
          )
        ),
        charge_sets (
          *,
          service_lines (*)
        )
      `
      )
      .eq("status", "ready")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  }),
});
