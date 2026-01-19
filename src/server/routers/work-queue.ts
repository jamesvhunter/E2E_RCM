import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

export const workQueueRouter = createTRPCRouter({
  // List work items with filters
  list: protectedProcedure
    .input(
      z.object({
        type: z
          .enum([
            "all",
            "coverage_incomplete",
            "eligibility_failed",
            "charge_review",
            "claim_rejected",
            "remit_unmatched",
            "denial_review",
          ])
          .optional(),
        status: z
          .enum(["all", "pending", "assigned", "in_progress", "completed", "escalated"])
          .optional(),
        assignedTo: z.string().optional(),
        limit: z.number().default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("work_items")
        .select(
          `
          *,
          patients (id, first_name, last_name),
          encounters (id, start_time),
          claims (id, patient_control_number, status),
          coverage_policies (id, member_id, payers (name))
        `
        )
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(input.limit + 1);

      if (input.type && input.type !== "all") {
        query = query.eq("item_type", input.type);
      }

      if (input.status && input.status !== "all") {
        query = query.eq("status", input.status);
      }

      if (input.assignedTo) {
        query = query.eq("assigned_to", input.assignedTo);
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

  // Get single work item
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("work_items")
        .select(
          `
          *,
          patients (*),
          encounters (
            *,
            providers (*),
            locations (*),
            charge_sets (*, service_lines (*))
          ),
          claims (
            *,
            claim_responses (*)
          ),
          coverage_policies (
            *,
            payers (*),
            subscribers (*),
            eligibility_checks (*)
          )
        `
        )
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Create work item
  create: protectedProcedure
    .input(
      z.object({
        itemType: z.enum([
          "coverage_incomplete",
          "eligibility_failed",
          "charge_review",
          "claim_rejected",
          "remit_unmatched",
          "denial_review",
        ]),
        priority: z.number().min(1).max(10).default(5),
        title: z.string().min(1),
        description: z.string().optional(),
        patientId: z.string().uuid().optional(),
        encounterId: z.string().uuid().optional(),
        claimId: z.string().uuid().optional(),
        coverageId: z.string().uuid().optional(),
        dueAt: z.string().optional(),
        context: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("work_items")
        .insert({
          item_type: input.itemType,
          priority: input.priority,
          title: input.title,
          description: input.description,
          patient_id: input.patientId,
          encounter_id: input.encounterId,
          claim_id: input.claimId,
          coverage_id: input.coverageId,
          due_at: input.dueAt,
          context: input.context,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Assign work item
  assign: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        assignedTo: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("work_items")
        .update({
          assigned_to: input.assignedTo,
          assigned_at: new Date().toISOString(),
          status: "assigned",
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update work item status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "assigned",
          "in_progress",
          "completed",
          "escalated",
        ]),
        resolutionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {
        status: input.status,
      };

      if (input.status === "completed") {
        updateData.completed_at = new Date().toISOString();
        if (input.resolutionNotes) {
          updateData.resolution_notes = input.resolutionNotes;
        }
      }

      const { data, error } = await supabase
        .from("work_items")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Get queue counts by type
  getCounts: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("work_items")
      .select("item_type, status")
      .in("status", ["pending", "assigned", "in_progress"]);

    if (error) throw error;

    // Aggregate counts
    const counts: Record<string, { total: number; pending: number }> = {};

    for (const item of data || []) {
      if (!counts[item.item_type]) {
        counts[item.item_type] = { total: 0, pending: 0 };
      }
      counts[item.item_type].total++;
      if (item.status === "pending") {
        counts[item.item_type].pending++;
      }
    }

    return counts;
  }),
});
