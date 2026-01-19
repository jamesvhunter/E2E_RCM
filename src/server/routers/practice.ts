import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc/server";

const organizationSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  npi: z.string().length(10).optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string(),
  phone: z.string().optional(),
});

const providerSchema = z.object({
  organizationId: z.string().uuid(),
  npi: z.string().length(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  credentials: z.string().optional(),
  taxonomyCode: z.string().optional(),
  isBillingProvider: z.boolean().default(false),
  isRenderingProvider: z.boolean().default(true),
});

const locationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string(),
  placeOfServiceCode: z.string().length(2),
  isPrimary: z.boolean().default(false),
});

export const practiceRouter = createTRPCRouter({
  // ========== Organizations ==========
  getOrganization: protectedProcedure.query(async ({ ctx }) => {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }),

  createOrganization: protectedProcedure
    .input(organizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: input.name,
          tax_id: input.taxId,
          npi: input.npi,
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          phone: input.phone,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  updateOrganization: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: organizationSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.name) updateData.name = input.data.name;
      if (input.data.taxId !== undefined) updateData.tax_id = input.data.taxId;
      if (input.data.npi !== undefined) updateData.npi = input.data.npi;
      if (input.data.addressLine1)
        updateData.address_line1 = input.data.addressLine1;
      if (input.data.addressLine2 !== undefined)
        updateData.address_line2 = input.data.addressLine2;
      if (input.data.city) updateData.city = input.data.city;
      if (input.data.state) updateData.state = input.data.state;
      if (input.data.zipCode) updateData.zip_code = input.data.zipCode;
      if (input.data.phone !== undefined) updateData.phone = input.data.phone;

      const { data, error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // ========== Providers ==========
  listProviders: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("providers")
        .select("*, organizations (*)")
        .order("last_name");

      if (input.organizationId) {
        query = query.eq("organization_id", input.organizationId);
      }

      if (input.search) {
        query = query.or(
          `first_name.ilike.%${input.search}%,last_name.ilike.%${input.search}%,npi.ilike.%${input.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  getProvider: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("providers")
        .select("*, organizations (*)")
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  createProvider: protectedProcedure
    .input(providerSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("providers")
        .insert({
          organization_id: input.organizationId,
          npi: input.npi,
          first_name: input.firstName,
          last_name: input.lastName,
          credentials: input.credentials,
          taxonomy_code: input.taxonomyCode,
          is_billing_provider: input.isBillingProvider,
          is_rendering_provider: input.isRenderingProvider,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  updateProvider: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: providerSchema.partial().omit({ organizationId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.npi) updateData.npi = input.data.npi;
      if (input.data.firstName) updateData.first_name = input.data.firstName;
      if (input.data.lastName) updateData.last_name = input.data.lastName;
      if (input.data.credentials !== undefined)
        updateData.credentials = input.data.credentials;
      if (input.data.taxonomyCode !== undefined)
        updateData.taxonomy_code = input.data.taxonomyCode;
      if (input.data.isBillingProvider !== undefined)
        updateData.is_billing_provider = input.data.isBillingProvider;
      if (input.data.isRenderingProvider !== undefined)
        updateData.is_rendering_provider = input.data.isRenderingProvider;

      const { data, error } = await supabase
        .from("providers")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // ========== Locations ==========
  listLocations: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from("locations")
        .select("*, organizations (*)")
        .order("name");

      if (input.organizationId) {
        query = query.eq("organization_id", input.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }),

  createLocation: protectedProcedure
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from("locations")
        .insert({
          organization_id: input.organizationId,
          name: input.name,
          address_line1: input.addressLine1,
          address_line2: input.addressLine2,
          city: input.city,
          state: input.state,
          zip_code: input.zipCode,
          place_of_service_code: input.placeOfServiceCode,
          is_primary: input.isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  updateLocation: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: locationSchema.partial().omit({ organizationId: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updateData: Record<string, unknown> = {};
      if (input.data.name) updateData.name = input.data.name;
      if (input.data.addressLine1)
        updateData.address_line1 = input.data.addressLine1;
      if (input.data.addressLine2 !== undefined)
        updateData.address_line2 = input.data.addressLine2;
      if (input.data.city) updateData.city = input.data.city;
      if (input.data.state) updateData.state = input.data.state;
      if (input.data.zipCode) updateData.zip_code = input.data.zipCode;
      if (input.data.placeOfServiceCode)
        updateData.place_of_service_code = input.data.placeOfServiceCode;
      if (input.data.isPrimary !== undefined)
        updateData.is_primary = input.data.isPrimary;

      const { data, error } = await supabase
        .from("locations")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // ========== NPI Validation ==========
  validateNpi: protectedProcedure
    .input(z.object({ npi: z.string().length(10) }))
    .query(async ({ input }) => {
      // Call NPPES NPI Registry API
      const response = await fetch(
        `https://npiregistry.cms.hhs.gov/api/?number=${input.npi}&version=2.1`
      );

      if (!response.ok) {
        throw new Error("Failed to validate NPI");
      }

      const data = await response.json();

      if (data.result_count === 0) {
        return {
          valid: false,
          message: "NPI not found",
        };
      }

      const result = data.results[0];
      return {
        valid: true,
        data: {
          npi: result.number,
          entityType: result.enumeration_type,
          name:
            result.enumeration_type === "NPI-1"
              ? `${result.basic.first_name} ${result.basic.last_name}`
              : result.basic.organization_name,
          taxonomies: result.taxonomies,
          addresses: result.addresses,
        },
      };
    }),
});
