"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayerSearchCombobox } from "./PayerSearchCombobox";
import { Shield, User, CreditCard, CheckCircle2 } from "lucide-react";

// ============================================================================
// SHARED TYPES AND SCHEMAS
// ============================================================================

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

interface FormCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function FormCard({ icon: Icon, title, children }: FormCardProps) {
  return (
    <div className="bg-white border-2 border-sky-200 rounded-lg p-4 shadow-sm max-w-md my-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-sky-500" />
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// 1. MINIMAL ELIGIBILITY FORM
// ============================================================================

const minimalEligibilitySchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  payerId: z.string().min(1, "Insurance company is required"),
  memberId: z.string().min(1, "Member ID is required"),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
});

type MinimalEligibilityData = z.infer<typeof minimalEligibilitySchema>;

interface MinimalEligibilityFormProps {
  onSubmit: (data: MinimalEligibilityData) => void;
  onCancel?: () => void;
}

export function MinimalEligibilityForm({ onSubmit, onCancel }: MinimalEligibilityFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MinimalEligibilityData>({
    resolver: zodResolver(minimalEligibilitySchema),
  });

  const showAddress = watch("address.line1");

  return (
    <FormCard icon={Shield} title="Insurance Information">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" className="text-sm">First Name *</Label>
            <Input
              id="firstName"
              {...register("firstName")}
              className="mt-1"
            />
            {errors.firstName && (
              <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
            <Input
              id="lastName"
              {...register("lastName")}
              className="mt-1"
            />
            {errors.lastName && (
              <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth")}
            className="mt-1"
          />
          {errors.dateOfBirth && (
            <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth.message}</p>
          )}
        </div>

        <div>
          <Label className="text-sm">Insurance Company *</Label>
          <PayerSearchCombobox
            value={watch("payerId")}
            onChange={(value) => setValue("payerId", value)}
          />
          {errors.payerId && (
            <p className="text-xs text-red-600 mt-1">{errors.payerId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="memberId" className="text-sm">Member ID *</Label>
          <Input
            id="memberId"
            {...register("memberId")}
            placeholder="Found on your insurance card"
            className="mt-1"
          />
          {errors.memberId && (
            <p className="text-xs text-red-600 mt-1">{errors.memberId.message}</p>
          )}
        </div>

        {/* Optional address for better matching */}
        <div className="pt-2 border-t">
          <p className="text-xs text-slate-600 mb-2">
            Optional: Adding your address helps verify coverage faster
          </p>
          <div className="space-y-2">
            <Input
              {...register("address.line1")}
              placeholder="Street Address"
              className="text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                {...register("address.city")}
                placeholder="City"
                className="text-sm"
              />
              <Select
                value={watch("address.state")}
                onValueChange={(value) => setValue("address.state", value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Checking..." : "Check Coverage"}
          </Button>
        </div>
      </form>
    </FormCard>
  );
}

// ============================================================================
// 2. REMAINING DEMOGRAPHICS FORM
// ============================================================================

const remainingDemographicsSchema = z.object({
  middleName: z.string().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  sex: z.enum(["M", "F", "O"], { errorMap: () => ({ message: "Please select sex" }) }),
  address: z.object({
    line1: z.string().min(1, "Address is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().length(2, "State must be 2-letter code"),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  }),
});

type RemainingDemographicsData = z.infer<typeof remainingDemographicsSchema>;

interface RemainingDemographicsFormProps {
  prepopulatedData?: Partial<RemainingDemographicsData>;
  onSubmit: (data: RemainingDemographicsData) => void;
}

export function RemainingDemographicsForm({ prepopulatedData, onSubmit }: RemainingDemographicsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RemainingDemographicsData>({
    resolver: zodResolver(remainingDemographicsSchema),
    defaultValues: prepopulatedData || {},
  });

  return (
    <FormCard icon={User} title="Complete Your Information">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <Label htmlFor="middleName" className="text-sm">Middle Name</Label>
          <Input
            id="middleName"
            {...register("middleName")}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="sex" className="text-sm">Sex *</Label>
          <Select
            value={watch("sex")}
            onValueChange={(value: "M" | "F" | "O") => setValue("sex", value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="O">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.sex && (
            <p className="text-xs text-red-600 mt-1">{errors.sex.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="+1234567890"
            className="mt-1"
          />
          {errors.phone && (
            <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className="mt-1"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="addressLine1" className="text-sm">Street Address *</Label>
          <Input
            id="addressLine1"
            {...register("address.line1")}
            className="mt-1"
          />
          {errors.address?.line1 && (
            <p className="text-xs text-red-600 mt-1">{errors.address.line1.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="addressLine2" className="text-sm">Apt / Suite</Label>
          <Input
            id="addressLine2"
            {...register("address.line2")}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label htmlFor="city" className="text-sm">City *</Label>
            <Input
              id="city"
              {...register("address.city")}
              className="mt-1"
            />
            {errors.address?.city && (
              <p className="text-xs text-red-600 mt-1">{errors.address.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="state" className="text-sm">State *</Label>
            <Select
              value={watch("address.state")}
              onValueChange={(value) => setValue("address.state", value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.address?.state && (
              <p className="text-xs text-red-600 mt-1">{errors.address.state.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="zipCode" className="text-sm">ZIP Code *</Label>
          <Input
            id="zipCode"
            {...register("address.zipCode")}
            placeholder="12345"
            className="mt-1"
          />
          {errors.address?.zipCode && (
            <p className="text-xs text-red-600 mt-1">{errors.address.zipCode.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </form>
    </FormCard>
  );
}

// ============================================================================
// 3. FULL DEMOGRAPHICS FORM (for self-pay)
// ============================================================================

const fullDemographicsSchema = remainingDemographicsSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

type FullDemographicsData = z.infer<typeof fullDemographicsSchema>;

interface FullDemographicsFormProps {
  onSubmit: (data: FullDemographicsData) => void;
}

export function FullDemographicsForm({ onSubmit }: FullDemographicsFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FullDemographicsData>({
    resolver: zodResolver(fullDemographicsSchema),
  });

  return (
    <FormCard icon={User} title="Your Information">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName" className="text-sm">First Name *</Label>
            <Input id="firstName" {...register("firstName")} className="mt-1" />
            {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
            <Input id="lastName" {...register("lastName")} className="mt-1" />
            {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="middleName" className="text-sm">Middle Name</Label>
          <Input id="middleName" {...register("middleName")} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="dateOfBirth" className="text-sm">Date of Birth *</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} className="mt-1" />
          {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth.message}</p>}
        </div>

        <div>
          <Label htmlFor="sex" className="text-sm">Sex *</Label>
          <Select value={watch("sex")} onValueChange={(value: "M" | "F" | "O") => setValue("sex", value)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select sex" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="O">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.sex && <p className="text-xs text-red-600 mt-1">{errors.sex.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
          <Input id="phone" type="tel" {...register("phone")} placeholder="+1234567890" className="mt-1" />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm">Email</Label>
          <Input id="email" type="email" {...register("email")} className="mt-1" />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="addressLine1" className="text-sm">Street Address *</Label>
          <Input id="addressLine1" {...register("address.line1")} className="mt-1" />
          {errors.address?.line1 && <p className="text-xs text-red-600 mt-1">{errors.address.line1.message}</p>}
        </div>

        <div>
          <Label htmlFor="addressLine2" className="text-sm">Apt / Suite</Label>
          <Input id="addressLine2" {...register("address.line2")} className="mt-1" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label htmlFor="city" className="text-sm">City *</Label>
            <Input id="city" {...register("address.city")} className="mt-1" />
            {errors.address?.city && <p className="text-xs text-red-600 mt-1">{errors.address.city.message}</p>}
          </div>
          <div>
            <Label htmlFor="state" className="text-sm">State *</Label>
            <Select value={watch("address.state")} onValueChange={(value) => setValue("address.state", value)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
              </SelectContent>
            </Select>
            {errors.address?.state && <p className="text-xs text-red-600 mt-1">{errors.address.state.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="zipCode" className="text-sm">ZIP Code *</Label>
          <Input id="zipCode" {...register("address.zipCode")} placeholder="12345" className="mt-1" />
          {errors.address?.zipCode && <p className="text-xs text-red-600 mt-1">{errors.address.zipCode.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </form>
    </FormCard>
  );
}

// ============================================================================
// 4. FULL INSURANCE FORM (when eligibility fails)
// ============================================================================

const fullInsuranceSchema = z.object({
  groupNumber: z.string().optional(),
  planType: z.string().optional(),
  effectiveFrom: z.string().min(1, "Start date is required"),
  effectiveTo: z.string().optional(),
  subscriberRelationship: z.enum(["self", "spouse", "child", "other"]),
  subscriber: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
  }).optional(),
});

type FullInsuranceData = z.infer<typeof fullInsuranceSchema>;

interface FullInsuranceFormProps {
  demographics: { firstName: string; lastName: string; dateOfBirth: string };
  onSubmit: (data: FullInsuranceData) => void;
}

export function FullInsuranceForm({ demographics, onSubmit }: FullInsuranceFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FullInsuranceData>({
    resolver: zodResolver(fullInsuranceSchema),
    defaultValues: {
      subscriberRelationship: "self",
      effectiveFrom: new Date().toISOString().split("T")[0],
    },
  });

  const relationship = watch("subscriberRelationship");

  return (
    <FormCard icon={CreditCard} title="Additional Insurance Details">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <Label htmlFor="groupNumber" className="text-sm">Group Number</Label>
          <Input id="groupNumber" {...register("groupNumber")} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="planType" className="text-sm">Plan Type</Label>
          <Input id="planType" {...register("planType")} placeholder="e.g., PPO, HMO, EPO" className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="effectiveFrom" className="text-sm">Coverage Start Date *</Label>
            <Input id="effectiveFrom" type="date" {...register("effectiveFrom")} className="mt-1" />
            {errors.effectiveFrom && <p className="text-xs text-red-600 mt-1">{errors.effectiveFrom.message}</p>}
          </div>
          <div>
            <Label htmlFor="effectiveTo" className="text-sm">Coverage End Date</Label>
            <Input id="effectiveTo" type="date" {...register("effectiveTo")} className="mt-1" />
          </div>
        </div>

        <div>
          <Label htmlFor="subscriberRelationship" className="text-sm">Your Relationship to Policy Holder *</Label>
          <Select
            value={watch("subscriberRelationship")}
            onValueChange={(value: "self" | "spouse" | "child" | "other") => setValue("subscriberRelationship", value)}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Self (I am the policy holder)</SelectItem>
              <SelectItem value="spouse">Spouse</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {relationship !== "self" && (
          <div className="space-y-3 pt-3 border-t">
            <p className="text-sm font-medium text-slate-700">Policy Holder Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="subFirstName" className="text-sm">First Name *</Label>
                <Input id="subFirstName" {...register("subscriber.firstName")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="subLastName" className="text-sm">Last Name *</Label>
                <Input id="subLastName" {...register("subscriber.lastName")} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="subDOB" className="text-sm">Date of Birth *</Label>
              <Input id="subDOB" type="date" {...register("subscriber.dateOfBirth")} className="mt-1" />
            </div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
          {isSubmitting ? "Submitting..." : "Continue"}
        </Button>
      </form>
    </FormCard>
  );
}

// ============================================================================
// 5. CONSENT FORM
// ============================================================================

const consentSchema = z.object({
  consentAcknowledged: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge consent to continue",
  }),
  turnstileToken: z.string().optional(),
});

type ConsentData = z.infer<typeof consentSchema>;

interface ConsentFormProps {
  onSubmit: (data: ConsentData) => void;
}

export function ConsentForm({ onSubmit }: ConsentFormProps) {
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const hasTurnstileKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConsentData>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      consentAcknowledged: false,
      turnstileToken: "",
    },
  });

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    setValue("turnstileToken", token);
  };

  return (
    <FormCard icon={CheckCircle2} title="Consent & Verification">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-slate-50 rounded-md p-3 space-y-3 text-sm text-slate-700">
          <p><strong>Consent to Treatment:</strong> I consent to medical treatment and authorize the release of medical information for billing purposes.</p>
          <p><strong>Financial Responsibility:</strong> I understand that I am financially responsible for all charges not covered by insurance.</p>
          <p><strong>Privacy Notice:</strong> I acknowledge receipt of the HIPAA Notice of Privacy Practices.</p>
          <p><strong>Insurance Verification:</strong> I authorize verification of my insurance benefits and assignment of benefits to the provider.</p>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="consent"
            checked={watch("consentAcknowledged")}
            onCheckedChange={(checked) => setValue("consentAcknowledged", checked as boolean)}
          />
          <label htmlFor="consent" className="text-sm leading-tight cursor-pointer">
            I have read and agree to the above statements *
          </label>
        </div>
        {errors.consentAcknowledged && (
          <p className="text-xs text-red-600">{errors.consentAcknowledged.message}</p>
        )}

        {hasTurnstileKey && (
          <div>
            <Label className="text-sm mb-2 block">Security Verification *</Label>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
              onSuccess={handleTurnstileSuccess}
            />
            {errors.turnstileToken && (
              <p className="text-xs text-red-600 mt-1">{errors.turnstileToken.message}</p>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || (hasTurnstileKey && !turnstileToken) || !watch("consentAcknowledged")}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Complete Intake"}
        </Button>
      </form>
    </FormCard>
  );
}
