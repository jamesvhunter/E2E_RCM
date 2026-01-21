"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface PreVisitChecklistProps {
  appointment: {
    id: string;
    appointmentDate: string;
    startTime: string;
    status: string;
    intakeCompletedAt?: string | null;
    eligibilityStatus?: string | null;
    eligibilityVerifiedAt?: string | null;
    patient: {
      firstName: string;
      lastName: string;
    };
  };
  onCheckEligibility?: () => void;
  isCheckingEligibility?: boolean;
}

export function PreVisitChecklist({
  appointment,
  onCheckEligibility,
  isCheckingEligibility = false,
}: PreVisitChecklistProps) {
  const checks = [
    {
      id: "intake",
      label: "Patient Intake Completed",
      status: appointment.intakeCompletedAt ? "complete" : "pending",
      timestamp: appointment.intakeCompletedAt,
      description: appointment.intakeCompletedAt
        ? `Completed ${format(new Date(appointment.intakeCompletedAt), "MMM d, yyyy 'at' h:mm a")}`
        : "Waiting for patient to submit intake form",
    },
    {
      id: "eligibility",
      label: "Insurance Eligibility Verified",
      status: appointment.eligibilityStatus === "verified"
        ? "complete"
        : appointment.eligibilityStatus === "failed"
        ? "failed"
        : appointment.eligibilityStatus === "pending"
        ? "pending"
        : "not_started",
      timestamp: appointment.eligibilityVerifiedAt,
      description: appointment.eligibilityStatus === "verified"
        ? `Verified ${appointment.eligibilityVerifiedAt ? format(new Date(appointment.eligibilityVerifiedAt), "MMM d, yyyy 'at' h:mm a") : "recently"}`
        : appointment.eligibilityStatus === "failed"
        ? "Eligibility verification failed - requires manual review"
        : appointment.eligibilityStatus === "pending"
        ? "Eligibility check in progress"
        : "Eligibility check not yet run",
      action: appointment.eligibilityStatus !== "verified" && appointment.eligibilityStatus !== "pending",
    },
    {
      id: "confirmed",
      label: "Appointment Confirmed",
      status: appointment.status === "confirmed" || appointment.status === "arrived" || appointment.status === "completed"
        ? "complete"
        : "pending",
      description: appointment.status === "confirmed"
        ? "Patient confirmed appointment"
        : appointment.status === "arrived"
        ? "Patient has arrived"
        : appointment.status === "completed"
        ? "Visit completed"
        : "Waiting for patient confirmation",
    },
  ];

  const completedCount = checks.filter((c) => c.status === "complete").length;
  const totalCount = checks.length;
  const isReady = completedCount === totalCount;
  const hasFailed = checks.some((c) => c.status === "failed");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    if (isReady) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Ready for Visit
        </Badge>
      );
    }
    if (hasFailed) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Requires Action
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        {completedCount} of {totalCount} Pending
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Pre-Visit Checklist</CardTitle>
            <CardDescription>
              {appointment.patient.firstName} {appointment.patient.lastName} •{" "}
              {format(new Date(appointment.appointmentDate + "T" + appointment.startTime), "MMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex-shrink-0 mt-0.5">{getStatusIcon(check.status)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{check.label}</p>
                {check.status === "complete" && check.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(check.timestamp), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{check.description}</p>

              {check.action && check.id === "eligibility" && onCheckEligibility && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={onCheckEligibility}
                  disabled={isCheckingEligibility}
                >
                  {isCheckingEligibility ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Check Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}

        {isReady && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">All pre-visit requirements completed!</p>
            <p className="text-sm text-green-600 mt-1">This patient is ready for their visit.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDistanceToNow(date: Date, options: { addSuffix: boolean }): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return options.addSuffix ? "just now" : "now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ${options.addSuffix ? "ago" : ""}`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ${options.addSuffix ? "ago" : ""}`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ${options.addSuffix ? "ago" : ""}`;

  return format(date, "MMM d, yyyy");
}
