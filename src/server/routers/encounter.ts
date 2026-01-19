import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

const encounterSchema = z.object({
  patientId: z.string().uuid(),
  coverageId: z.string().uuid().optional(),
  providerId: z.string().uuid(),
  locationId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().optional(),
  placeOfService: z.string().length(2),
  chiefComplaint: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  notes: z.string().optional(),
  isSelfPay: z.boolean().default(false),
});

const serviceLineSchema = z.object({
  chargeSetId: z.string().uuid(),
  lineNumber: z.number().min(1),
  cptCode: z.string().min(5).max(5),
  modifiers: z.array(z.string().length(2)).max(4).default([]),
  dxCodes: z.array(z.string()).min(1).max(12),
  units: z.number().min(1).default(1),
  chargeAmount: z.number().min(0),
  dosFrom: z.string(),
  dosTo: z.string(),
  placeOfService: z.string().length(2),
  aiSuggested: z.boolean().default(false),
  aiConfidence: z.number().min(0).max(1).optional(),
});

export const encounterRouter = createTRPCRouter({
  // List encounters with filters
  list: protectedProcedure
    .input(
      z.object({
        patientId: z.string().uuid().optional(),
        providerId: z.string().uuid().optional(),
        status: z.enum(["all", "pending_charges", "ready_to_bill"]).optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("encounters")
        .select(
          `
          *,
          patients (id, first_name, last_name),
          providers (id, first_name, last_name, npi),
          locations (id, name),
          charge_sets (id, status, version)
        `
        )
        .order("start_time", { ascending: false })
        .limit(input.limit + 1);

      if (input.patientId) {
        query = query.eq("patient_id", input.patientId);
      }

      if (input.providerId) {
        query = query.eq("provider_id", input.providerId);
      }

      if (input.cursor) {
        query = query.lt("start_time", input.cursor);
      }

      const { data, error } = await query;

      if (error) throw error;

      let nextCursor: string | undefined;
      if (data && data.length > input.limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.start_time;
      }

      return {
        items: data || [],
        nextCursor,
      };
    }),

  // Get single encounter with full details
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("encounters")
        .select(
          `
          *,
          patients (*),
          coverage_policies (
            *,
            payers (*)
          ),
          providers (*),
          locations (*),
          charge_sets (
            *,
            service_lines (*)
          )
        `
        )
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Create encounter
  create: protectedProcedure
    .input(encounterSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("encounters")
        .insert({
          patient_id: input.patientId,
          coverage_id: input.coverageId,
          provider_id: input.providerId,
          location_id: input.locationId,
          start_time: input.startTime,
          end_time: input.endTime,
          place_of_service: input.placeOfService,
          chief_complaint: input.chiefComplaint,
          assessment: input.assessment,
          plan: input.plan,
          notes: input.notes,
          is_self_pay: input.isSelfPay,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update encounter
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: encounterSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.coverageId !== undefined)
        updateData.coverage_id = input.data.coverageId;
      if (input.data.providerId) updateData.provider_id = input.data.providerId;
      if (input.data.locationId) updateData.location_id = input.data.locationId;
      if (input.data.endTime !== undefined)
        updateData.end_time = input.data.endTime;
      if (input.data.chiefComplaint !== undefined)
        updateData.chief_complaint = input.data.chiefComplaint;
      if (input.data.assessment !== undefined)
        updateData.assessment = input.data.assessment;
      if (input.data.plan !== undefined) updateData.plan = input.data.plan;
      if (input.data.notes !== undefined) updateData.notes = input.data.notes;

      const { data, error } = await supabase
        .from("encounters")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Create charge set for encounter
  createChargeSet: protectedProcedure
    .input(
      z.object({
        encounterId: z.string().uuid(),
        aiConfidence: z.number().optional(),
        aiRationale: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get current max version for this encounter
      const { data: existing } = await supabase
        .from("charge_sets")
        .select("version")
        .eq("encounter_id", input.encounterId)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

      const { data, error } = await supabase
        .from("charge_sets")
        .insert({
          encounter_id: input.encounterId,
          version: nextVersion,
          status: "draft",
          ai_confidence: input.aiConfidence,
          ai_rationale: input.aiRationale,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Add service line to charge set
  addServiceLine: protectedProcedure
    .input(serviceLineSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("service_lines")
        .insert({
          charge_set_id: input.chargeSetId,
          line_number: input.lineNumber,
          cpt_code: input.cptCode,
          modifiers: input.modifiers,
          dx_codes: input.dxCodes,
          units: input.units,
          charge_amount: input.chargeAmount,
          dos_from: input.dosFrom,
          dos_to: input.dosTo,
          place_of_service: input.placeOfService,
          ai_suggested: input.aiSuggested,
          ai_confidence: input.aiConfidence,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Finalize charge set (transitions to finalized, posts to ledger)
  finalizeChargeSet: protectedProcedure
    .input(
      z.object({
        chargeSetId: z.string().uuid(),
        reviewedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get the charge set with service lines
      const { data: chargeSet, error: fetchError } = await supabase
        .from("charge_sets")
        .select(
          `
          *,
          service_lines (*),
          encounters (patient_id)
        `
        )
        .eq("id", input.chargeSetId)
        .single();

      if (fetchError) throw fetchError;

      // Update charge set status
      const { data: updated, error: updateError } = await supabase
        .from("charge_sets")
        .update({
          status: "finalized",
          reviewed_by: input.reviewedBy,
          reviewed_at: new Date().toISOString(),
          finalized_at: new Date().toISOString(),
        })
        .eq("id", input.chargeSetId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Post charge entries to ledger
      const ledgerEntries = chargeSet.service_lines.map((line: { id: string; charge_amount: number; cpt_code: string }) => ({
        patient_id: chargeSet.encounters.patient_id,
        encounter_id: chargeSet.encounter_id,
        service_line_id: line.id,
        entry_type: "charge",
        amount: line.charge_amount,
        description: `Service: ${line.cpt_code}`,
      }));

      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert(ledgerEntries);

      if (ledgerError) throw ledgerError;

      return updated;
    }),
});
