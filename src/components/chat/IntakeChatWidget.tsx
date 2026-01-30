"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MinimalEligibilityForm,
  RemainingDemographicsForm,
  FullDemographicsForm,
  FullInsuranceForm,
  ConsentForm,
} from "@/components/forms/EmbeddedIntakeForms";
import { trpc } from "@/lib/trpc/client";

// ============================================================================
// TYPES
// ============================================================================

type FormType =
  | "minimal_eligibility"
  | "remaining_demographics"
  | "full_demographics"
  | "full_insurance"
  | "consent";

type Phase = "initial" | "collecting" | "eligibility_check" | "completing" | "done";

interface CollectedData {
  demographics: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    sex?: "M" | "F" | "O";
    phone?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  insurance?: {
    payerId?: string;
    memberId?: string;
    groupNumber?: string;
    planType?: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    subscriberRelationship?: "self" | "spouse" | "child" | "other";
    subscriber?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
    };
  };
  hasInsurance: boolean | null;
}

interface EligibilityResult {
  success: boolean;
  isActive?: boolean;
  planStatus?: any[];
  benefits?: any[];
  summary?: {
    copayAmount?: number | null;
    deductibleRemaining?: number | null;
    oopMaxRemaining?: number | null;
  };
  error?: string;
  rawResponse?: any;
}

interface IntakeChatWidgetProps {
  token: string;
  onComplete?: (result: { patientId: string; coverageId?: string }) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IntakeChatWidget({ token, onComplete }: IntakeChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(true); // Start open for chat-driven flow
  const [phase, setPhase] = useState<Phase>("initial");
  const [currentForm, setCurrentForm] = useState<FormType | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [collectedData, setCollectedData] = useState<CollectedData>({
    demographics: {},
    hasInsurance: null,
  });
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isProcessingToolCall, setIsProcessingToolCall] = useState(false);
  const [hasUserResponded, setHasUserResponded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPC mutations
  const checkEligibilityMutation = trpc.intake.checkEligibilityOnly.useMutation();
  const submitIntakeMutation = trpc.intake.submitChatIntake.useMutation();

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: "/api/chat/intake",
    body: { token, collectedData },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! 👋 Welcome to our patient check-in assistant. I'm here to help verify your insurance coverage before your visit. Ready to get started?",
      },
    ],
  });

  // Parse function calls from assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.content) {
      console.log("Checking message for tool calls:", lastMessage.content);
      // Check if message contains tool_calls JSON
      const toolCallMatch = lastMessage.content.match(/\{"tool_calls":\[.*?\]\}/);
      if (toolCallMatch) {
        // Show loading state immediately to hide the JSON
        setIsProcessingToolCall(true);

        try {
          console.log("Found tool call JSON:", toolCallMatch[0]);
          const parsed = JSON.parse(toolCallMatch[0]);
          const toolCall = parsed.tool_calls[0];
          const functionName = toolCall.function?.name;
          console.log("Function name:", functionName);

          if (functionName === "showMinimalEligibilityForm") {
            setCurrentForm("minimal_eligibility");
            setPhase("collecting");
            // Hide loading state after form is set
            setTimeout(() => setIsProcessingToolCall(false), 100);
          } else if (functionName === "showRemainingDemographicsForm") {
            setCurrentForm("remaining_demographics");
            setTimeout(() => setIsProcessingToolCall(false), 100);
          } else if (functionName === "showFullDemographicsForm") {
            setCurrentForm("full_demographics");
            setPhase("collecting");
            setTimeout(() => setIsProcessingToolCall(false), 100);
          } else if (functionName === "showFullInsuranceForm") {
            setCurrentForm("full_insurance");
            setTimeout(() => setIsProcessingToolCall(false), 100);
          } else if (functionName === "showConsentForm") {
            setCurrentForm("consent");
            setPhase("completing");
            setTimeout(() => setIsProcessingToolCall(false), 100);
          } else if (functionName === "checkEligibility") {
            console.log("=== Triggering handleEligibilityCheck ===");
            handleEligibilityCheck();
            setIsProcessingToolCall(false);
          } else {
            setIsProcessingToolCall(false);
          }
        } catch (e) {
          console.error("Failed to parse tool call:", e);
          setIsProcessingToolCall(false);
        }
      } else {
        setIsProcessingToolCall(false);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentForm, eligibilityResult]);

  // ========================================================================
  // FORM SUBMISSION HANDLERS
  // ========================================================================

  const handleMinimalEligibilitySubmit = async (data: any) => {
    // Store collected data with default values for required fields
    setCollectedData((prev) => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        ...(data.address && { address: data.address }),
      },
      insurance: {
        ...prev.insurance,
        payerId: data.payerId,
        memberId: data.memberId,
        effectiveFrom: new Date().toISOString().split('T')[0], // Default to today
        subscriberRelationship: "self" as const, // Default to self
      },
      hasInsurance: true,
    }));

    // Hide form
    setCurrentForm(null);

    // Send message to chat
    await append({
      role: "user",
      content: `I've provided my insurance information. My name is ${data.firstName} ${data.lastName}, born ${data.dateOfBirth}, with insurance member ID ${data.memberId}.`,
    });
  };

  const handleEligibilityCheck = async () => {
    console.log("=== handleEligibilityCheck called ===");
    console.log("collectedData:", collectedData);

    setPhase("eligibility_check");
    setIsCheckingEligibility(true);

    try {
      console.log("Calling checkEligibilityMutation with:", {
        token,
        firstName: collectedData.demographics.firstName,
        lastName: collectedData.demographics.lastName,
        dateOfBirth: collectedData.demographics.dateOfBirth,
        payerId: collectedData.insurance?.payerId,
        memberId: collectedData.insurance?.memberId,
      });

      const result = await checkEligibilityMutation.mutateAsync({
        token,
        firstName: collectedData.demographics.firstName!,
        lastName: collectedData.demographics.lastName!,
        dateOfBirth: collectedData.demographics.dateOfBirth!,
        payerId: collectedData.insurance?.payerId!,
        memberId: collectedData.insurance?.memberId!,
        address: collectedData.demographics.address,
      });

      console.log("Eligibility check result:", result);

      setEligibilityResult(result as EligibilityResult);

      // Send result back to chat
      if (result.success && result.isActive) {
        const summary: any = result.summary || {};
        let benefitsText = "";
        if (summary.copayAmount) benefitsText += `Copay: $${summary.copayAmount}. `;
        if (summary.deductibleRemaining) benefitsText += `Deductible remaining: $${summary.deductibleRemaining}. `;

        await append({
          role: "assistant",
          content: `Great news! Your coverage is active. ${benefitsText}Now let's collect your contact information.`,
        });
      } else {
        await append({
          role: "assistant",
          content: result.error || "We couldn't automatically verify your coverage. Would you like to continue with insurance details or switch to self-pay?",
        });
      }
    } catch (error) {
      console.error("Eligibility check failed:", error);
      setEligibilityResult({
        success: false,
        error: "Eligibility check failed. Please try again or provide full insurance details.",
      });
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleRemainingDemographicsSubmit = async (data: any) => {
    setCollectedData((prev) => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        middleName: data.middleName,
        sex: data.sex,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
    }));

    setCurrentForm(null);

    await append({
      role: "user",
      content: "I've completed my contact information.",
    });
  };

  const handleFullDemographicsSubmit = async (data: any) => {
    setCollectedData((prev) => ({
      ...prev,
      demographics: data,
      hasInsurance: false,
    }));

    setCurrentForm(null);

    await append({
      role: "user",
      content: "I've completed my information.",
    });
  };

  const handleFullInsuranceSubmit = async (data: any) => {
    setCollectedData((prev) => ({
      ...prev,
      insurance: {
        ...prev.insurance,
        ...data,
      },
    }));

    setCurrentForm(null);

    await append({
      role: "user",
      content: "I've provided additional insurance details.",
    });
  };

  const handleConsentSubmit = async (data: { consentAcknowledged: boolean; turnstileToken?: string }) => {
    setPhase("completing");
    setCurrentForm(null);

    try {
      const result = await submitIntakeMutation.mutateAsync({
        token,
        turnstileToken: data.turnstileToken || "",
        demographics: collectedData.demographics as any,
        insurance: collectedData.hasInsurance ? (collectedData.insurance as any) : undefined,
        selfPay: !collectedData.hasInsurance,
        consentAcknowledged: data.consentAcknowledged,
        eligibilityResult: eligibilityResult || undefined,
      });

      setPhase("done");

      await append({
        role: "assistant",
        content: "✅ All done! Your intake is complete. Thank you for providing your information. Our team will see you soon!",
      });

      // Call completion callback
      if (onComplete) {
        onComplete({
          patientId: result.patientId,
          coverageId: result.coverageId || undefined,
        });
      }
    } catch (error) {
      console.error("Intake submission failed:", error);
      await append({
        role: "assistant",
        content: "I'm sorry, there was an error submitting your information. Please try again or contact our office.",
      });
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  // Wrapper submit handler to track user response
  const handleFormSubmit = (e: React.FormEvent) => {
    setHasUserResponded(true);
    handleSubmit(e);
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white">
      {/* Header - only show after user responds */}
      {hasUserResponded && (
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Check-In Assistant</h2>
              </div>
              {phase === "done" && (
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages area - scrollable full page */}
      <div className={cn("flex-1 w-full", !hasUserResponded && "flex items-center justify-center")}>
        <div className={cn("max-w-2xl mx-auto px-4 space-y-4", hasUserResponded ? "py-6 pb-32" : "w-full")}>
          {messages.map((message, index) => {
            // Check if message contains tool calls
            const hasToolCalls = message.content.includes('"tool_calls"');
            const isLastMessage = index === messages.length - 1;

            // Hide messages with tool calls entirely and show processing state instead
            if (hasToolCalls && message.role === "assistant") {
              if (isLastMessage && isProcessingToolCall) {
                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2 max-w-[85%] flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    </div>
                  </div>
                );
              }
              return null;
            }

            // Filter out tool_calls JSON from display (backup)
            const cleanContent = message.content.replace(/\{"tool_calls":\[.*?\]\}/g, "").trim();

            // Don't render empty messages
            if (!cleanContent && message.role === "assistant") {
              return null;
            }

            // Style welcome message differently when centered
            const isWelcomeMessage = index === 0 && !hasUserResponded;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isWelcomeMessage ? "justify-center" : message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-2",
                    isWelcomeMessage
                      ? "text-2xl font-medium text-center"
                      : "text-sm max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-foreground"
                  )}
                >
                  {cleanContent}
                </div>
              </div>
            );
          })}

          {/* Eligibility checking state */}
          {isCheckingEligibility && (
            <div className="flex justify-start">
              <div className="bg-sky-50 border-2 border-sky-200 rounded-lg px-4 py-3 max-w-[85%] flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                <div>
                  <p className="font-medium text-sky-700">Checking your coverage...</p>
                  <p className="text-sm text-sky-600">This usually takes 5-10 seconds</p>
                </div>
              </div>
            </div>
          )}

          {/* Eligibility result card */}
          {eligibilityResult && !isCheckingEligibility && (
            <div className="flex justify-start">
              {eligibilityResult.success && eligibilityResult.isActive ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-emerald-800 mb-2">Coverage Verified!</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Status:</span>
                          <span className="font-medium text-emerald-600">Active</span>
                        </div>
                        {eligibilityResult.summary?.copayAmount && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Copay:</span>
                            <span className="font-medium">${eligibilityResult.summary.copayAmount}</span>
                          </div>
                        )}
                        {eligibilityResult.summary?.deductibleRemaining && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Deductible Remaining:</span>
                            <span className="font-medium">${eligibilityResult.summary.deductibleRemaining}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-3">* This is an estimate. Final costs may vary.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-800 mb-2">Coverage Check Incomplete</h4>
                      <p className="text-sm text-slate-700 mb-2">
                        {eligibilityResult.error || "We couldn't automatically verify your insurance."}
                      </p>
                      <p className="text-xs text-slate-600">
                        Our billing team will verify your coverage before your appointment.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Embedded forms */}
          {currentForm === "minimal_eligibility" && (
            <div className="flex justify-start">
              <MinimalEligibilityForm
                onSubmit={handleMinimalEligibilitySubmit}
                onCancel={() => setCurrentForm(null)}
              />
            </div>
          )}

          {currentForm === "remaining_demographics" && (
            <div className="flex justify-start">
              <RemainingDemographicsForm
                prepopulatedData={collectedData.demographics as any}
                onSubmit={handleRemainingDemographicsSubmit}
              />
            </div>
          )}

          {currentForm === "full_demographics" && (
            <div className="flex justify-start">
              <FullDemographicsForm onSubmit={handleFullDemographicsSubmit} />
            </div>
          )}

          {currentForm === "full_insurance" && (
            <div className="flex justify-start">
              <FullInsuranceForm
                demographics={collectedData.demographics as any}
                onSubmit={handleFullInsuranceSubmit}
              />
            </div>
          )}

          {currentForm === "consent" && (
            <div className="flex justify-start">
              <ConsentForm onSubmit={handleConsentSubmit} />
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Typing...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - centered initially, then fixed to bottom after user responds */}
      {phase !== "done" && (
        <div className={cn(
          "bg-white",
          hasUserResponded ? "fixed bottom-0 left-0 right-0 border-t shadow-lg" : "w-full"
        )}>
          <div className="max-w-2xl mx-auto px-4 py-4">
            <form onSubmit={handleFormSubmit}>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  disabled={isLoading || !!currentForm || isCheckingEligibility}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim() || !!currentForm || isCheckingEligibility}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                🔒 Secure and HIPAA compliant
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
