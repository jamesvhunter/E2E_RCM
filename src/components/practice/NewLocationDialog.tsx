"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().min(5, "ZIP code is required"),
  phone: z.string().optional(),
  placeOfServiceCode: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface NewLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewLocationDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewLocationDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      placeOfServiceCode: "11", // Office
    },
  });

  const placeOfServiceCode = watch("placeOfServiceCode");

  // Get organization for organizationId
  const { data: organization } = trpc.practice.getOrganization.useQuery();

  // Create location mutation
  const createLocation = trpc.practice.createLocation.useMutation({
    onSuccess: () => {
      reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: LocationFormData) => {
    if (!organization?.id) {
      alert("Please create an organization first");
      return;
    }

    createLocation.mutate({
      organizationId: organization.id,
      name: data.name,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      placeOfServiceCode: data.placeOfServiceCode || "11",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Name */}
          <div className="space-y-2">
            <Label>Location Name *</Label>
            <Input
              {...register("name")}
              placeholder="Main Clinic"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <Label>Address Line 1 *</Label>
            <Input
              {...register("addressLine1")}
              placeholder="123 Main Street"
            />
            {errors.addressLine1 && (
              <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
            )}
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
              <Label>City *</Label>
              <Input {...register("city")} placeholder="San Francisco" />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>State *</Label>
              <Input
                {...register("state")}
                placeholder="CA"
                maxLength={2}
                className="uppercase"
              />
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input {...register("zipCode")} placeholder="94102" />
              {errors.zipCode && (
                <p className="text-sm text-destructive">{errors.zipCode.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="(415) 555-0100" />
            </div>
          </div>

          {/* Place of Service Code */}
          <div className="space-y-2">
            <Label>Place of Service Code</Label>
            <Select
              value={placeOfServiceCode}
              onValueChange={(value) => setValue("placeOfServiceCode", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="11">11 - Office</SelectItem>
                <SelectItem value="12">12 - Home</SelectItem>
                <SelectItem value="21">21 - Inpatient Hospital</SelectItem>
                <SelectItem value="22">22 - Outpatient Hospital</SelectItem>
                <SelectItem value="23">23 - Emergency Room</SelectItem>
                <SelectItem value="24">24 - Ambulatory Surgical Center</SelectItem>
                <SelectItem value="31">31 - Skilled Nursing Facility</SelectItem>
                <SelectItem value="32">32 - Nursing Facility</SelectItem>
                <SelectItem value="49">49 - Independent Clinic</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Standard CMS Place of Service code for claim submission
            </p>
          </div>

          {/* Error message */}
          {createLocation.error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {createLocation.error.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createLocation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLocation.isPending}>
              {createLocation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
