"use client";

import { useState, use, useRef } from "react";
import { PatientIntakeForm } from "@/components/forms/PatientIntakeForm";
import { IntakeChatWidget } from "@/components/chat/IntakeChatWidget";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Clock, Loader2, Shield } from "lucide-react";

interface IntakePageProps {
  params: Promise<{ token: string }>;
}

export default function IntakePage({ params }: IntakePageProps) {
  const { token } = use(params);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    patientId: string;
    coverageId?: string | null;
    eligibility?: any;
  } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Validate token on page load
  const { data: validation, isLoading, error } = trpc.intake.validateToken.useQuery(
    { token },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const handleSuccess = (data: {
    patientId: string;
    coverageId?: string | null;
    eligibility?: any;
  }) => {
    setResult(data);
    setSubmitted(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
        <p className="text-slate-600">Validating your intake link...</p>
      </div>
    );
  }

  // Invalid or expired token
  if (error || !validation?.valid) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-red-700">Invalid Intake Link</CardTitle>
            <CardDescription className="text-red-600">
              {validation?.error || "This intake link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-600 mb-4">
              Please contact our office to request a new intake link.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Intake links expire after 48 hours</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after submission
  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <CardTitle className="text-emerald-700 text-2xl">
              Thank You!
            </CardTitle>
            <CardDescription className="text-emerald-600 text-lg">
              Your intake form has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Eligibility Results */}
            {result.eligibility && !result.eligibility.error && (
              <div className="bg-white rounded-lg p-6 border border-emerald-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-500" />
                  Insurance Verification Results
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-slate-600">Coverage Status</span>
                    <span className={`font-medium ${result.eligibility.isActive ? "text-emerald-600" : "text-amber-600"}`}>
                      {result.eligibility.isActive ? "Active" : "Please verify with your insurer"}
                    </span>
                  </div>

                  {result.eligibility.benefits?.map((benefit: any, index: number) => {
                    if (benefit.code === "30" || benefit.name?.toLowerCase().includes("copay")) {
                      return (
                        <div key={index} className="flex items-center justify-between py-2 border-b">
                          <span className="text-slate-600">Copay</span>
                          <span className="font-medium text-slate-800">
                            {benefit.benefitAmount ? `$${benefit.benefitAmount}` : "See plan details"}
                          </span>
                        </div>
                      );
                    }
                    if (benefit.code === "C" || benefit.name?.toLowerCase().includes("deductible")) {
                      return (
                        <div key={index} className="flex items-center justify-between py-2 border-b">
                          <span className="text-slate-600">Deductible Remaining</span>
                          <span className="font-medium text-slate-800">
                            {benefit.benefitAmount ? `$${benefit.benefitAmount}` : "See plan details"}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  * This is an estimate based on your insurance information. Final costs may vary.
                </p>
              </div>
            )}

            {result.eligibility?.error && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-amber-700 text-sm">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  We couldn&apos;t verify your insurance at this time. Our staff will verify your coverage before your appointment.
                </p>
              </div>
            )}

            <div className="text-center pt-4">
              <h4 className="font-medium text-slate-800 mb-2">What&apos;s Next?</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ Your information has been securely saved</li>
                <li>✓ Our team will review your intake form</li>
                <li>✓ You&apos;ll receive a confirmation before your appointment</li>
              </ul>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-600">
                Questions? Contact our office at{" "}
                <a href="tel:+15551234567" className="text-sky-600 font-medium">
                  (555) 123-4567
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the chat-driven intake flow
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Patient Check-In
        </h2>
        <p className="text-slate-600">
          Let&apos;s verify your insurance and complete your intake.
        </p>
        {validation.expiresAt && (
          <p className="text-sm text-slate-500 mt-2">
            This link expires on{" "}
            {new Date(validation.expiresAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>

      {/* Chat-Driven Intake Widget (now full-screen capable on mobile) */}
      <IntakeChatWidget
        token={token}
        onComplete={handleSuccess}
      />
    </div>
  );
}
