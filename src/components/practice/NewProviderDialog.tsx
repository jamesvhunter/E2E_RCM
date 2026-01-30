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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const providerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  npi: z.string().length(10, "NPI must be exactly 10 digits"),
  credentials: z.string().optional(),
  taxonomyCode: z.string().optional(),
  isBillingProvider: z.boolean().default(false),
  isRenderingProvider: z.boolean().default(true),
});

type ProviderFormData = z.infer<typeof providerSchema>;

interface NewProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewProviderDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewProviderDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      isBillingProvider: false,
      isRenderingProvider: true,
    },
  });

  const isBillingProvider = watch("isBillingProvider");
  const isRenderingProvider = watch("isRenderingProvider");

  // Get organization for organizationId
  const { data: organization } = trpc.practice.getOrganization.useQuery();

  // Create provider mutation
  const createProvider = trpc.practice.createProvider.useMutation({
    onSuccess: () => {
      reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: ProviderFormData) => {
    if (!organization?.id) {
      alert("Please create an organization first");
      return;
    }

    createProvider.mutate({
      organizationId: organization.id,
      npi: data.npi,
      firstName: data.firstName,
      lastName: data.lastName,
      credentials: data.credentials,
      taxonomyCode: data.taxonomyCode,
      isBillingProvider: data.isBillingProvider,
      isRenderingProvider: data.isRenderingProvider,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Provider</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input {...register("firstName")} placeholder="John" />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input {...register("lastName")} placeholder="Smith" />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* NPI */}
          <div className="space-y-2">
            <Label>NPI (National Provider Identifier) *</Label>
            <Input
              {...register("npi")}
              placeholder="1234567890"
              maxLength={10}
            />
            {errors.npi && (
              <p className="text-sm text-destructive">{errors.npi.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              10-digit number. Find NPIs at{" "}
              <a
                href="https://npiregistry.cms.hhs.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                npiregistry.cms.hhs.gov
              </a>
            </p>
          </div>

          {/* Credentials */}
          <div className="space-y-2">
            <Label>Credentials</Label>
            <Input
              {...register("credentials")}
              placeholder="MD, DO, NP, PA, etc."
            />
            <p className="text-xs text-muted-foreground">
              e.g., MD, DO, NP, PA-C, RN
            </p>
          </div>

          {/* Taxonomy Code */}
          <div className="space-y-2">
            <Label>Taxonomy Code</Label>
            <Input
              {...register("taxonomyCode")}
              placeholder="207Q00000X"
            />
            <p className="text-xs text-muted-foreground">
              Healthcare Provider Taxonomy Code (e.g., 207Q00000X for Family Medicine)
            </p>
          </div>

          {/* Provider Types */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billing"
                checked={isBillingProvider}
                onCheckedChange={(checked) =>
                  setValue("isBillingProvider", checked as boolean)
                }
              />
              <label
                htmlFor="billing"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Billing Provider
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rendering"
                checked={isRenderingProvider}
                onCheckedChange={(checked) =>
                  setValue("isRenderingProvider", checked as boolean)
                }
              />
              <label
                htmlFor="rendering"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Rendering Provider
              </label>
            </div>
          </div>

          {/* Error message */}
          {createProvider.error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {createProvider.error.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createProvider.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProvider.isPending}>
              {createProvider.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
