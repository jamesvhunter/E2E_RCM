"use client";

import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface OrganizationFormData {
  name: string;
  taxId: string;
  npi: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
}

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  organization?: {
    id: string;
    name: string;
    tax_id: string | null;
    npi: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip_code: string;
    phone: string | null;
  } | null;
}

export function OrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
  organization,
}: OrganizationDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: "",
      taxId: "",
      npi: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
    },
  });

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      reset({
        name: organization.name,
        taxId: organization.tax_id || "",
        npi: organization.npi || "",
        addressLine1: organization.address_line1,
        addressLine2: organization.address_line2 || "",
        city: organization.city,
        state: organization.state,
        zipCode: organization.zip_code,
        phone: organization.phone || "",
      });
    } else {
      reset({
        name: "",
        taxId: "",
        npi: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
      });
    }
  }, [organization, reset]);

  // Create organization mutation
  const createOrganization = trpc.practice.createOrganization.useMutation({
    onSuccess: () => {
      reset();
      onSuccess?.();
    },
  });

  // Update organization mutation
  const updateOrganization = trpc.practice.updateOrganization.useMutation({
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const onSubmit = (data: OrganizationFormData) => {
    // Convert empty strings to undefined
    const cleanData = {
      name: data.name || undefined,
      taxId: data.taxId || undefined,
      npi: data.npi || undefined,
      addressLine1: data.addressLine1 || undefined,
      addressLine2: data.addressLine2 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      zipCode: data.zipCode || undefined,
      phone: data.phone || undefined,
    };

    if (organization?.id) {
      // Update existing organization
      updateOrganization.mutate({
        id: organization.id,
        data: cleanData,
      });
    } else {
      // Create new organization
      createOrganization.mutate(cleanData);
    }
  };

  const isLoading = createOrganization.isPending || updateOrganization.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Edit Organization" : "Create Organization"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              {...register("name")}
              placeholder="Freed RCM Medical Group"
            />
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label>Tax ID (EIN)</Label>
            <Input
              {...register("taxId")}
              placeholder="12-3456789"
            />
          </div>

          {/* NPI */}
          <div className="space-y-2">
            <Label>NPI (National Provider Identifier)</Label>
            <Input
              {...register("npi")}
              placeholder="1234567890"
              maxLength={10}
            />
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label>Address Line 1</Label>
            <Input
              {...register("addressLine1")}
              placeholder="123 Healthcare Blvd"
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label>Address Line 2</Label>
            <Input
              {...register("addressLine2")}
              placeholder="Suite 100 (optional)"
            />
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>City</Label>
              <Input {...register("city")} placeholder="San Francisco" />
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Input
                {...register("state")}
                placeholder="CA"
                maxLength={2}
                className="uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ZIP Code</Label>
              <Input {...register("zipCode")} placeholder="94102" />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="(415) 555-0100" />
            </div>
          </div>

          {/* Error message */}
          {(createOrganization.error || updateOrganization.error) && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {createOrganization.error?.message || updateOrganization.error?.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {organization ? "Update Organization" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
