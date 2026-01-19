"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PayerSearchCombobox } from "./PayerSearchCombobox";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Shield, User, CreditCard, FileCheck } from "lucide-react";

// Form schema matching the server-side validation
const intakeFormSchema = z.object({
  demographics: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    sex: z.enum(["M", "F", "O"], { errorMap: () => ({ message: "Please select sex" }) }),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.object({
      line1: z.string().min(1, "Address is required"),
      line2: z.string().optional(),
      city: z.string().min(1, "City is required"),
      state: z.string().length(2, "State must be 2-letter code"),
      zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
    }),
  }),
  selfPay: z.boolean(),
  insurance: z.object({
    payerId: z.string(),
    memberId: z.string(),
    groupNumber: z.string().optional(),
    planType: z.string().optional(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().optional(),
    subscriberRelationship: z.enum(["self", "spouse", "child", "other"]),
    subscriber: z.object({
      firstName: z.string(),
      lastName: z.string(),
      dateOfBirth: z.string(),
    }).optional(),
  }).optional(),
  consentAcknowledged: z.boolean(),
  turnstileToken: z.string(),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

interface PatientIntakeFormProps {
  token: string;
  dateOfService?: string | null;
  onSuccess: (result: { patientId: string; coverageId?: string | null; eligibility?: any }) => void;
}

const STEPS = [
  { id: "demographics", title: "Your Information", icon: User },
  { id: "insurance", title: "Insurance", icon: CreditCard },
  { id: "consent", title: "Consent", icon: Shield },
  { id: "review", title: "Review", icon: FileCheck },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export function PatientIntakeForm({ token, dateOfService, onSuccess }: PatientIntakeFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      demographics: {
        firstName: "",
        lastName: "",
        middleName: "",
        dateOfBirth: "",
        sex: undefined,
        phone: "",
        email: "",
        address: {
          line1: "",
          line2: "",
          city: "",
          state: "",
          zipCode: "",
        },
      },
      selfPay: false,
      insurance: {
        payerId: "",
        memberId: "",
        groupNumber: "",
        planType: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        effectiveTo: "",
        subscriberRelationship: "self",
        subscriber: undefined,
      },
      consentAcknowledged: false,
      turnstileToken: "",
    },
  });

  const submitMutation = trpc.intake.submitIntake.useMutation({
    onSuccess: (data) => {
      onSuccess({
        patientId: data.patientId,
        coverageId: data.coverageId,
        eligibility: data.eligibility,
      });
    },
  });

  const selfPay = form.watch("selfPay");
  const subscriberRelationship = form.watch("insurance.subscriberRelationship");

  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof IntakeFormData | string)[] = [];

    switch (currentStep) {
      case 0: // Demographics
        fieldsToValidate = [
          "demographics.firstName",
          "demographics.lastName",
          "demographics.dateOfBirth",
          "demographics.sex",
          "demographics.phone",
          "demographics.address.line1",
          "demographics.address.city",
          "demographics.address.state",
          "demographics.address.zipCode",
        ];
        break;
      case 1: // Insurance
        if (!selfPay) {
          fieldsToValidate = [
            "insurance.payerId",
            "insurance.memberId",
            "insurance.effectiveFrom",
            "insurance.subscriberRelationship",
          ];
          if (subscriberRelationship !== "self") {
            fieldsToValidate.push(
              "insurance.subscriber.firstName",
              "insurance.subscriber.lastName",
              "insurance.subscriber.dateOfBirth"
            );
          }
        }
        break;
      case 2: // Consent
        fieldsToValidate = ["consentAcknowledged"];
        break;
    }

    const result = await form.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (data: IntakeFormData) => {
    if (!turnstileToken) {
      form.setError("turnstileToken", { message: "Please complete the verification" });
      return;
    }

    const submissionData = {
      token,
      turnstileToken,
      demographics: data.demographics,
      selfPay: data.selfPay,
      insurance: data.selfPay ? undefined : {
        ...data.insurance!,
        subscriber: data.insurance?.subscriberRelationship !== "self" ? data.insurance?.subscriber : undefined,
      },
      consentAcknowledged: data.consentAcknowledged,
    };

    submitMutation.mutate(submissionData);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center flex-1 ${
                  index < STEPS.length - 1 ? "relative" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isActive
                      ? "border-sky-500 text-sky-500 bg-sky-50"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-[60%] w-[80%] h-0.5 ${
                      isCompleted ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* Step 1: Demographics */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Please provide your basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="demographics.firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demographics.middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Michael" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demographics.lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="demographics.dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demographics.sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sex" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                            <SelectItem value="O">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="demographics.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demographics.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Address</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="demographics.address.line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="demographics.address.line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apt, Suite, etc.</FormLabel>
                          <FormControl>
                            <Input placeholder="Apt 4B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="demographics.address.city"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="demographics.address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="State" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="demographics.address.zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP *</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Insurance */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Insurance Information</CardTitle>
                <CardDescription>
                  {dateOfService && (
                    <span className="text-sky-600">
                      For your appointment on {new Date(dateOfService).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="selfPay"
                    checked={selfPay}
                    onChange={(e) => form.setValue("selfPay", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label htmlFor="selfPay" className="text-sm font-medium">
                    I will be paying out of pocket (no insurance)
                  </Label>
                </div>

                {!selfPay && (
                  <>
                    <FormField
                      control={form.control}
                      name="insurance.payerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Company *</FormLabel>
                          <FormControl>
                            <PayerSearchCombobox
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="insurance.memberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member ID *</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insurance.groupNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Number</FormLabel>
                            <FormControl>
                              <Input placeholder="GRP001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="insurance.effectiveFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coverage Start Date *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="insurance.effectiveTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coverage End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="insurance.subscriberRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your relationship to the policy holder *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="self">Self (I am the policy holder)</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {subscriberRelationship && subscriberRelationship !== "self" && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-3">Policy Holder Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="insurance.subscriber.firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="insurance.subscriber.lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="insurance.subscriber.dateOfBirth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth *</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Consent */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Consent & Acknowledgment</CardTitle>
                <CardDescription>Please review and acknowledge the following</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-4 max-h-64 overflow-y-auto">
                  <h4 className="font-semibold">Notice of Privacy Practices</h4>
                  <p>
                    This practice is committed to protecting your health information. We use and
                    disclose your health information for treatment, payment, and healthcare
                    operations as permitted by law.
                  </p>
                  <h4 className="font-semibold">Consent to Treatment</h4>
                  <p>
                    By submitting this form, you consent to receive medical treatment and services
                    from our healthcare providers. You understand that the practice of medicine is
                    not an exact science and acknowledge that no guarantees have been made
                    regarding the outcome of treatment.
                  </p>
                  <h4 className="font-semibold">Financial Responsibility</h4>
                  <p>
                    You agree to be financially responsible for all charges not covered by your
                    insurance. This includes copays, deductibles, coinsurance, and any services
                    not covered by your plan.
                  </p>
                  <h4 className="font-semibold">Insurance Verification</h4>
                  <p>
                    We will verify your insurance eligibility and benefits. However, this is not a
                    guarantee of payment. Your insurance company makes the final determination of
                    coverage.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="consentAcknowledged"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 mt-1 rounded border-slate-300"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I have read and understand the above information. I consent to treatment
                          and acknowledge my financial responsibility. *
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-center">
                  <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      form.setValue("turnstileToken", token);
                    }}
                    onError={() => {
                      setTurnstileToken("");
                      form.setValue("turnstileToken", "");
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Information</CardTitle>
                <CardDescription>Please verify all information is correct before submitting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-slate-500 mb-2">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Name:</span>{" "}
                        {form.getValues("demographics.firstName")}{" "}
                        {form.getValues("demographics.middleName")}{" "}
                        {form.getValues("demographics.lastName")}
                      </div>
                      <div>
                        <span className="text-slate-500">DOB:</span>{" "}
                        {form.getValues("demographics.dateOfBirth")}
                      </div>
                      <div>
                        <span className="text-slate-500">Sex:</span>{" "}
                        {form.getValues("demographics.sex") === "M" ? "Male" : form.getValues("demographics.sex") === "F" ? "Female" : "Other"}
                      </div>
                      <div>
                        <span className="text-slate-500">Phone:</span>{" "}
                        {form.getValues("demographics.phone")}
                      </div>
                      {form.getValues("demographics.email") && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Email:</span>{" "}
                          {form.getValues("demographics.email")}
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-slate-500">Address:</span>{" "}
                        {form.getValues("demographics.address.line1")}
                        {form.getValues("demographics.address.line2") && `, ${form.getValues("demographics.address.line2")}`}
                        , {form.getValues("demographics.address.city")},{" "}
                        {form.getValues("demographics.address.state")}{" "}
                        {form.getValues("demographics.address.zipCode")}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-slate-500 mb-2">Insurance</h4>
                    {selfPay ? (
                      <p className="text-sm">Self-pay (no insurance)</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Member ID:</span>{" "}
                          {form.getValues("insurance.memberId")}
                        </div>
                        {form.getValues("insurance.groupNumber") && (
                          <div>
                            <span className="text-slate-500">Group #:</span>{" "}
                            {form.getValues("insurance.groupNumber")}
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Effective:</span>{" "}
                          {form.getValues("insurance.effectiveFrom")}
                        </div>
                        <div>
                          <span className="text-slate-500">Relationship:</span>{" "}
                          {form.getValues("insurance.subscriberRelationship")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {submitMutation.error && (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
                    {submitMutation.error.message}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={submitMutation.isPending || !turnstileToken}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
