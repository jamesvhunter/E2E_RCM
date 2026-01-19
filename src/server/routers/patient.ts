import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

// Validation schemas
const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  sex: z.enum(["M", "F", "U"]),
  ssnLastFour: z.string().length(4).optional(),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const patientRouter = createTRPCRouter({
  // List all patients with pagination
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      const { limit, cursor, search } = input;

      let query = supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      let nextCursor: string | undefined;
      if (data && data.length > limit) {
        const nextItem = data.pop();
        nextCursor = nextItem?.created_at;
      }

      return {
        items: data || [],
        nextCursor,
      };
    }),

  // Get single patient by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          *,
          coverage_policies (
            *,
            payers (*)
          ),
          guarantors (*)
        `
        )
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Create new patient
  create: protectedProcedure
    .input(patientSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("patients")
        .insert({
          first_name: input.firstName,
          last_name: input.lastName,
          middle_name: input.middleName,
          dob: input.dob,
          sex: input.sex,
          ssn_last_four: input.ssnLastFour,
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          phone: input.phone,
          email: input.email,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Update patient
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: patientSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.firstName) updateData.first_name = input.data.firstName;
      if (input.data.lastName) updateData.last_name = input.data.lastName;
      if (input.data.middleName !== undefined)
        updateData.middle_name = input.data.middleName;
      if (input.data.dob) updateData.dob = input.data.dob;
      if (input.data.sex) updateData.sex = input.data.sex;
      if (input.data.ssnLastFour !== undefined)
        updateData.ssn_last_four = input.data.ssnLastFour;
      if (input.data.addressLine1)
        updateData.address_line1 = input.data.addressLine1;
      if (input.data.addressLine2 !== undefined)
        updateData.address_line2 = input.data.addressLine2;
      if (input.data.city) updateData.city = input.data.city;
      if (input.data.state) updateData.state = input.data.state;
      if (input.data.zipCode) updateData.zip_code = input.data.zipCode;
      if (input.data.phone !== undefined) updateData.phone = input.data.phone;
      if (input.data.email !== undefined) updateData.email = input.data.email;

      const { data, error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),
});
