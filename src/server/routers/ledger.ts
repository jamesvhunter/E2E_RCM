import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

export const ledgerRouter = createTRPCRouter({
  // Get patient balance summary
  getPatientBalance: protectedProcedure
    .input(z.object({ patientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get all non-voided ledger entries for patient
      const { data: entries, error } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("patient_id", input.patientId)
        .is("voided_at", null);

      if (error) throw error;

      // Calculate balances
      let totalCharges = 0;
      let insurancePayments = 0;
      let patientPayments = 0;
      let adjustments = 0;
      let refunds = 0;
      let writeoffs = 0;

      for (const entry of entries || []) {
        switch (entry.entry_type) {
          case "charge":
            totalCharges += entry.amount;
            break;
          case "insurance_payment":
            insurancePayments += entry.amount;
            break;
          case "patient_payment":
            patientPayments += entry.amount;
            break;
          case "adjustment":
            adjustments += entry.amount;
            break;
          case "refund":
            refunds += entry.amount;
            break;
          case "writeoff":
            writeoffs += entry.amount;
            break;
        }
      }

      const insuranceBalance = totalCharges - insurancePayments - adjustments;
      const patientBalance =
        totalCharges -
        insurancePayments -
        patientPayments -
        adjustments -
        writeoffs +
        refunds;

      return {
        totalCharges,
        insurancePayments,
        patientPayments,
        adjustments,
        refunds,
        writeoffs,
        insuranceBalance,
        patientBalance,
      };
    }),

  // Get ledger entries for a patient
  listByPatient: protectedProcedure
    .input(
      z.object({
        patientId: z.string().uuid(),
        includeVoided: z.boolean().default(false),
        limit: z.number().default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("ledger_entries")
        .select(
          `
          *,
          encounters (id, start_time),
          service_lines (id, cpt_code, charge_amount),
          claims (id, patient_control_number, status)
        `
        )
        .eq("patient_id", input.patientId)
        .order("created_at", { ascending: false })
        .limit(input.limit + 1);

      if (!input.includeVoided) {
        query = query.is("voided_at", null);
      }

      if (input.cursor) {
        query = query.lt("created_at", input.cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      let nextCursor: string | undefined;
      if (data && data.length > input.limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.created_at;
      }

      return {
        items: data || [],
        nextCursor,
      };
    }),

  // Get ledger entries for an encounter
  listByEncounter: protectedProcedure
    .input(
      z.object({
        encounterId: z.string().uuid(),
        includeVoided: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("ledger_entries")
        .select(
          `
          *,
          service_lines (id, cpt_code, line_number),
          claims (id, patient_control_number)
        `
        )
        .eq("encounter_id", input.encounterId)
        .order("created_at", { ascending: true });

      if (!input.includeVoided) {
        query = query.is("voided_at", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  // Post a payment
  postPayment: protectedProcedure
    .input(
      z.object({
        patientId: z.string().uuid(),
        encounterId: z.string().uuid().optional(),
        serviceLineId: z.string().uuid().optional(),
        claimId: z.string().uuid().optional(),
        entryType: z.enum(["patient_payment", "insurance_payment"]),
        amount: z.number().positive(),
        description: z.string().optional(),
        referenceNumber: z.string().optional(),
        // For insurance payments from 835
        claimResponseId: z.string().uuid().optional(),
        carcCode: z.string().optional(),
        rarcCode: z.string().optional(),
        adjustmentGroup: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("ledger_entries")
        .insert({
          patient_id: input.patientId,
          encounter_id: input.encounterId,
          service_line_id: input.serviceLineId,
          claim_id: input.claimId,
          claim_response_id: input.claimResponseId,
          entry_type: input.entryType,
          amount: input.amount,
          description: input.description,
          reference_number: input.referenceNumber,
          carc_code: input.carcCode,
          rarc_code: input.rarcCode,
          adjustment_group: input.adjustmentGroup,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Post an adjustment
  postAdjustment: protectedProcedure
    .input(
      z.object({
        patientId: z.string().uuid(),
        encounterId: z.string().uuid().optional(),
        serviceLineId: z.string().uuid().optional(),
        claimId: z.string().uuid().optional(),
        claimResponseId: z.string().uuid().optional(),
        entryType: z.enum(["adjustment", "writeoff"]),
        amount: z.number(),
        description: z.string().optional(),
        carcCode: z.string().optional(),
        rarcCode: z.string().optional(),
        adjustmentGroup: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("ledger_entries")
        .insert({
          patient_id: input.patientId,
          encounter_id: input.encounterId,
          service_line_id: input.serviceLineId,
          claim_id: input.claimId,
          claim_response_id: input.claimResponseId,
          entry_type: input.entryType,
          amount: input.amount,
          description: input.description,
          carc_code: input.carcCode,
          rarc_code: input.rarcCode,
          adjustment_group: input.adjustmentGroup,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Void a ledger entry
  voidEntry: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("ledger_entries")
        .update({
          voided_at: new Date().toISOString(),
          void_reason: input.reason,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),
});
