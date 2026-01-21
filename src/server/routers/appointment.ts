import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";
import { inngest } from "@/inngest/client";

// ============================================================================
// Appointment Router
// Handles appointment scheduling, listing, and status updates
// ============================================================================

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  locationId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format"),
  durationMinutes: z.number().min(15).max(480).default(30),
  appointmentType: z.string().optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});

export const appointmentRouter = createTRPCRouter({
  /**
   * Create new appointment with conflict checking
   */
  create: protectedProcedure
    .input(appointmentSchema)
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;

      // Normalize times to HH:MM:SS format
      const startTime = input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime;
      const endTime = input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime;

      // Check for scheduling conflicts
      const { data: conflictExists, error: conflictError } = await supabase.rpc(
        "check_appointment_conflict",
        {
          p_provider_id: input.providerId,
          p_appointment_date: input.appointmentDate,
          p_start_time: startTime,
          p_end_time: endTime,
        }
      );

      if (conflictError) {
        console.error("Conflict check error:", conflictError);
        throw new Error("Failed to check for appointment conflicts");
      }

      if (conflictExists) {
        throw new Error(
          "This appointment slot conflicts with an existing appointment for this provider"
        );
      }

      // Create appointment
      const { data: appointment, error: createError } = await supabase
        .from("appointments")
        .insert({
          patient_id: input.patientId,
          provider_id: input.providerId,
          location_id: input.locationId,
          appointment_date: input.appointmentDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: input.durationMinutes,
          appointment_type: input.appointmentType || null,
          chief_complaint: input.chiefComplaint || null,
          notes: input.notes || null,
          status: "scheduled",
          eligibility_status: "pending",
          created_by: ctx.user?.id || null,
        } as any)
        .select()
        .single();

      if (createError) {
        console.error("Appointment creation error:", createError);
        throw new Error("Failed to create appointment");
      }

      const appointmentData = appointment as any;

      // Trigger Inngest workflow for automated eligibility check
      // Check will run 48 hours before appointment
      const appointmentDateTime = new Date(
        `${input.appointmentDate}T${startTime}`
      );
      const checkEligibilityAt = new Date(
        appointmentDateTime.getTime() - 48 * 60 * 60 * 1000
      );

      try {
        await inngest.send({
          name: "appointment/scheduled",
          data: {
            appointmentId: appointmentData.id,
            patientId: input.patientId,
            providerId: input.providerId,
            appointmentDate: input.appointmentDate,
            checkEligibilityAt: checkEligibilityAt.toISOString(),
          },
        });
      } catch (inngestError) {
        // Don't fail appointment creation if Inngest fails
        console.error("Failed to trigger Inngest workflow:", inngestError);
      }

      return appointment;
    }),

  /**
   * List appointments with filters
   */
  list: protectedProcedure
    .input(
      z.object({
        providerId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z
          .enum([
            "scheduled",
            "confirmed",
            "arrived",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
          ])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          patients (
            id,
            first_name,
            last_name,
            dob,
            phone,
            email
          ),
          providers (
            id,
            first_name,
            last_name,
            npi
          ),
          locations (
            id,
            name
          )
        `,
          { count: "exact" }
        )
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      // Apply filters
      if (input.providerId) {
        query = query.eq("provider_id", input.providerId);
      }
      if (input.patientId) {
        query = query.eq("patient_id", input.patientId);
      }
      if (input.status) {
        query = query.eq("status", input.status);
      }
      if (input.dateFrom) {
        query = query.gte("appointment_date", input.dateFrom);
      }
      if (input.dateTo) {
        query = query.lte("appointment_date", input.dateTo);
      }

      // Apply pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Appointment list error:", error);
        throw new Error("Failed to fetch appointments");
      }

      return {
        appointments: data || [],
        total: count || 0,
      };
    }),

  /**
   * Get single appointment by ID with full details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patients (
            id,
            first_name,
            last_name,
            dob,
            phone,
            email,
            coverage_policies (
              id,
              member_id,
              payer_id,
              payers (
                id,
                name,
                stedi_payer_id
              )
            )
          ),
          providers (
            id,
            first_name,
            last_name,
            npi,
            organizations (
              id,
              name
            )
          ),
          locations (
            id,
            name,
            address_line_1,
            city,
            state,
            zip_code
          ),
          eligibility_checks (
            id,
            is_active,
            copay_amount,
            deductible_remaining,
            oop_max_remaining,
            checked_at
          )
        `
        )
        .eq("id", input.id)
        .single();

      if (error) {
        console.error("Appointment fetch error:", error);
        throw new Error("Failed to fetch appointment");
      }

      if (!data) {
        throw new Error("Appointment not found");
      }

      return data;
    }),

  /**
   * Get upcoming appointments needing eligibility checks
   * Used by automated workflows and dashboard
   */
  getUpcomingNeedingEligibility: protectedProcedure
    .input(
      z.object({
        hoursAhead: z.number().default(48),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const { supabase } = ctx;

      const now = new Date();
      const futureDate = new Date(now.getTime() + input.hoursAhead * 60 * 60 * 1000);
      const futureDateString = futureDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patients (
            id,
            first_name,
            last_name,
            dob,
            coverage_policies (
              id,
              member_id,
              payer_id,
              payers (
                stedi_payer_id
              )
            )
          ),
          providers (
            id,
            first_name,
            last_name,
            npi
          )
        `
        )
        .in("status", ["scheduled", "confirmed"])
        .in("eligibility_status", ["pending", "failed"])
        .lte("appointment_date", futureDateString)
        .limit(input.limit);

      if (error) {
        console.error("Upcoming appointments fetch error:", error);
        throw new Error("Failed to fetch upcoming appointments");
      }

      return data || [];
    }),

  /**
   * Update appointment status with audit trail
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "scheduled",
          "confirmed",
          "arrived",
          "in_progress",
          "completed",
          "cancelled",
          "no_show",
        ]),
        cancellationReason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;

      const updateData: any = {
        status: input.status,
      };

      // Add status-specific fields
      if (input.status === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = ctx.user?.id || null;
      } else if (input.status === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = ctx.user?.id || null;
        updateData.cancellation_reason = input.cancellationReason || null;
      }

      const { data, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("Appointment update error:", error);
        throw new Error("Failed to update appointment status");
      }

      return data;
    }),

  /**
   * Update appointment eligibility status
   * Called after eligibility check completes
   */
  updateEligibility: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        eligibilityCheckId: z.string().uuid(),
        eligibilityStatus: z.enum(["pending", "verified", "failed", "not_required"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("appointments")
        .update({
          eligibility_check_id: input.eligibilityCheckId,
          eligibility_verified_at: new Date().toISOString(),
          eligibility_status: input.eligibilityStatus,
        } as any)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("Eligibility update error:", error);
        throw new Error("Failed to update appointment eligibility");
      }

      return data;
    }),

  /**
   * Update appointment with conflict checking
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        providerId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
        appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        durationMinutes: z.number().min(15).max(480).optional(),
        appointmentType: z.string().optional(),
        chiefComplaint: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;

      // Get current appointment to check for rescheduling
      const { data: current } = await supabase
        .from("appointments")
        .select("provider_id, appointment_date, start_time, end_time")
        .eq("id", input.id)
        .single();

      if (!current) {
        throw new Error("Appointment not found");
      }

      const currentData = current as any;

      // If time/date/provider is changing, check for conflicts
      const isRescheduling =
        (input.providerId && input.providerId !== currentData.provider_id) ||
        (input.appointmentDate && input.appointmentDate !== currentData.appointment_date) ||
        (input.startTime && input.startTime !== currentData.start_time) ||
        (input.endTime && input.endTime !== currentData.end_time);

      if (isRescheduling) {
        const providerId = input.providerId || currentData.provider_id;
        const appointmentDate = input.appointmentDate || currentData.appointment_date;
        const startTime = input.startTime
          ? input.startTime.length === 5
            ? `${input.startTime}:00`
            : input.startTime
          : currentData.start_time;
        const endTime = input.endTime
          ? input.endTime.length === 5
            ? `${input.endTime}:00`
            : input.endTime
          : currentData.end_time;

        const { data: conflictExists } = await supabase.rpc("check_appointment_conflict", {
          p_provider_id: providerId,
          p_appointment_date: appointmentDate,
          p_start_time: startTime,
          p_end_time: endTime,
          p_appointment_id: input.id,
        });

        if (conflictExists) {
          throw new Error("This appointment slot conflicts with another appointment");
        }
      }

      // Build update object (only include provided fields)
      const updateData: any = {};

      if (input.providerId) updateData.provider_id = input.providerId;
      if (input.locationId) updateData.location_id = input.locationId;
      if (input.appointmentDate) updateData.appointment_date = input.appointmentDate;
      if (input.startTime)
        updateData.start_time =
          input.startTime.length === 5 ? `${input.startTime}:00` : input.startTime;
      if (input.endTime)
        updateData.end_time = input.endTime.length === 5 ? `${input.endTime}:00` : input.endTime;
      if (input.durationMinutes) updateData.duration_minutes = input.durationMinutes;
      if (input.appointmentType !== undefined) updateData.appointment_type = input.appointmentType;
      if (input.chiefComplaint !== undefined) updateData.chief_complaint = input.chiefComplaint;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { data, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("Appointment update error:", error);
        throw new Error("Failed to update appointment");
      }

      return data;
    }),

  /**
   * Delete/cancel appointment
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { supabase } = ctx;

      // Soft delete by setting status to cancelled
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: ctx.user?.id || null,
          cancellation_reason: input.reason || null,
        } as any)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        console.error("Appointment cancellation error:", error);
        throw new Error("Failed to cancel appointment");
      }

      return data;
    }),
});
