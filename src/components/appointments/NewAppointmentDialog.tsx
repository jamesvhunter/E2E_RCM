"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientSearchCombobox } from "@/components/patients/PatientSearchCombobox";

const appointmentSchema = z.object({
  patientId: z.string().uuid("Please select a patient"),
  providerId: z.string().uuid("Please select a provider"),
  locationId: z.string().uuid("Please select a location"),
  appointmentDate: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string().min(1, "Please enter a start time"),
  durationMinutes: z.number().min(15).max(480),
  appointmentType: z.string().optional(),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewAppointmentDialogProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      durationMinutes: 30,
    },
  });

  const appointmentDate = watch("appointmentDate");
  const startTime = watch("startTime");
  const durationMinutes = watch("durationMinutes");

  // Fetch practice data for providers and locations
  const { data: providers } = trpc.practice.listProviders.useQuery({});
  const { data: locations } = trpc.practice.listLocations.useQuery({});

  // Create appointment mutation
  const createAppointment = trpc.appointment.create.useMutation({
    onSuccess: () => {
      reset();
      setSelectedPatientId("");
      onSuccess?.();
    },
  });

  // Calculate end time based on start time and duration
  const calculateEndTime = (start: string, duration: number): string => {
    const [hours, minutes] = start.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
  };

  const onSubmit = (data: AppointmentFormData) => {
    const endTime = calculateEndTime(data.startTime, data.durationMinutes);

    createAppointment.mutate({
      patientId: data.patientId,
      providerId: data.providerId,
      locationId: data.locationId,
      appointmentDate: format(data.appointmentDate, "yyyy-MM-dd"),
      startTime: data.startTime,
      endTime,
      durationMinutes: data.durationMinutes,
      appointmentType: data.appointmentType,
      chiefComplaint: data.chiefComplaint,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Visit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>Patient *</Label>
            <PatientSearchCombobox
              value={selectedPatientId}
              onValueChange={(value) => {
                setSelectedPatientId(value);
                setValue("patientId", value);
              }}
            />
            {errors.patientId && (
              <p className="text-sm text-destructive">{errors.patientId.message}</p>
            )}
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label>Provider *</Label>
            <Select onValueChange={(value) => setValue("providerId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {(providers || []).map((provider: any) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.first_name} {provider.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.providerId && (
              <p className="text-sm text-destructive">{errors.providerId.message}</p>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Location *</Label>
            <Select onValueChange={(value) => setValue("locationId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {(locations || []).map((location: any) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.locationId && (
              <p className="text-sm text-destructive">{errors.locationId.message}</p>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !appointmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {appointmentDate ? format(appointmentDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={appointmentDate}
                  onSelect={(date) => date && setValue("appointmentDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.appointmentDate && (
              <p className="text-sm text-destructive">{errors.appointmentDate.message}</p>
            )}
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" {...register("startTime")} />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes) *</Label>
              <Select
                value={durationMinutes?.toString()}
                onValueChange={(value) => setValue("durationMinutes", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
              {errors.durationMinutes && (
                <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>
              )}
            </div>
          </div>

          {/* End time display */}
          {startTime && durationMinutes && (
            <div className="text-sm text-muted-foreground">
              End time: {calculateEndTime(startTime, durationMinutes)}
            </div>
          )}

          {/* Appointment Type */}
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Input placeholder="e.g., Annual Physical, Follow-up" {...register("appointmentType")} />
          </div>

          {/* Chief Complaint */}
          <div className="space-y-2">
            <Label>Chief Complaint</Label>
            <Input placeholder="e.g., Routine checkup" {...register("chiefComplaint")} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes or instructions..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Error message */}
          {createAppointment.error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {createAppointment.error.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAppointment.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule Visit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
