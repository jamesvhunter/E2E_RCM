"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar, Clock, User, MapPin, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface AppointmentDetailDialogProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailDialog({
  appointmentId,
  open,
  onOpenChange,
}: AppointmentDetailDialogProps) {
  const { data: appointment, isLoading } = trpc.appointment.getById.useQuery(
    { id: appointmentId! },
    { enabled: !!appointmentId }
  );

  const utils = trpc.useUtils();

  const updateStatus = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      utils.appointment.getById.invalidate();
    },
  });

  const cancelAppointment = trpc.appointment.delete.useMutation({
    onSuccess: () => {
      utils.appointment.list.invalidate();
      onOpenChange(false);
    },
  });

  if (!appointmentId) return null;

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({
      id: appointmentId,
      status: newStatus as any,
    });
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointment.mutate({
        id: appointmentId,
        reason: "Cancelled by staff",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      arrived: "bg-purple-100 text-purple-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      no_show: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge className={colors[status] || ""}>{status.replace("_", " ")}</Badge>
    );
  };

  const getEligibilityBadge = (status?: string | null) => {
    if (!status) return null;

    const badges: Record<string, React.ReactNode> = {
      verified: (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Verified</span>
        </div>
      ),
      failed: (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          <span>Failed</span>
        </div>
      ),
      pending: (
        <div className="flex items-center gap-2 text-yellow-600">
          <Clock className="w-4 h-4" />
          <span>Pending</span>
        </div>
      ),
      not_required: (
        <div className="flex items-center gap-2 text-gray-600">
          <AlertCircle className="w-4 h-4" />
          <span>Not Required</span>
        </div>
      ),
    };

    return badges[status];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : appointment ? (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                {getStatusBadge(appointment.status)}
              </div>
              <Select
                value={appointment.status}
                onValueChange={handleStatusChange}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Patient Info */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Patient
              </div>
              <div className="ml-6">
                <div className="font-semibold">
                  {appointment.patients?.first_name} {appointment.patients?.last_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  DOB: {appointment.patients?.dob ? format(new Date(appointment.patients.dob), "PP") : "N/A"}
                </div>
                {appointment.patients?.phone && (
                  <div className="text-sm text-muted-foreground">
                    Phone: {appointment.patients.phone}
                  </div>
                )}
                {appointment.patients?.email && (
                  <div className="text-sm text-muted-foreground">
                    Email: {appointment.patients.email}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Appointment Details */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Appointment
              </div>
              <div className="ml-6 space-y-1">
                <div>
                  <span className="text-sm text-muted-foreground">Date: </span>
                  <span className="font-medium">
                    {format(new Date(appointment.appointment_date), "PPPP")}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Time: </span>
                  <span className="font-medium">
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Duration: </span>
                  <span className="font-medium">{appointment.duration_minutes} minutes</span>
                </div>
                {appointment.appointment_type && (
                  <div>
                    <span className="text-sm text-muted-foreground">Type: </span>
                    <span className="font-medium">{appointment.appointment_type}</span>
                  </div>
                )}
                {appointment.chief_complaint && (
                  <div>
                    <span className="text-sm text-muted-foreground">Chief Complaint: </span>
                    <span className="font-medium">{appointment.chief_complaint}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Provider */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Provider
              </div>
              <div className="ml-6">
                <div className="font-medium">
                  {appointment.providers?.first_name} {appointment.providers?.last_name}
                </div>
                {appointment.providers?.npi && (
                  <div className="text-sm text-muted-foreground">
                    NPI: {appointment.providers.npi}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </div>
              <div className="ml-6">
                <div className="font-medium">{appointment.locations?.name}</div>
                {appointment.locations?.address_line_1 && (
                  <div className="text-sm text-muted-foreground">
                    {appointment.locations.address_line_1}
                    {appointment.locations.city && `, ${appointment.locations.city}`}
                    {appointment.locations.state && `, ${appointment.locations.state}`}
                    {appointment.locations.zip_code && ` ${appointment.locations.zip_code}`}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Eligibility Status */}
            <div>
              <div className="text-sm font-medium mb-2">Eligibility Status</div>
              <div className="ml-6">
                {getEligibilityBadge(appointment.eligibility_status)}
                {appointment.eligibility_checks && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    <div>Status: {appointment.eligibility_checks.is_active ? "Active" : "Inactive"}</div>
                    {appointment.eligibility_checks.copay_amount && (
                      <div>Copay: ${appointment.eligibility_checks.copay_amount}</div>
                    )}
                    {appointment.eligibility_checks.checked_at && (
                      <div>
                        Checked: {format(new Date(appointment.eligibility_checks.checked_at), "PPp")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium mb-2">Notes</div>
                  <div className="ml-6 text-sm text-muted-foreground">{appointment.notes}</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Appointment not found</div>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelAppointment.isPending || appointment?.status === "cancelled"}
          >
            Cancel Appointment
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
