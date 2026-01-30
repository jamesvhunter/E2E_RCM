"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type ViewMode = "day" | "week";

interface AppointmentCalendarProps {
  providerId?: string;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function AppointmentCalendar({ providerId, onAppointmentClick }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(providerId);
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch providers
  const { data: providers } = trpc.practice.listProviders.useQuery({});

  // Fetch appointments for the view
  const startDate = viewMode === "day" ? format(currentDate, "yyyy-MM-dd") : format(weekStart, "yyyy-MM-dd");
  const endDate = viewMode === "day" ? format(currentDate, "yyyy-MM-dd") : format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: appointmentsData, isLoading } = trpc.appointment.list.useQuery({
    providerId: selectedProvider === "all" ? undefined : selectedProvider,
    dateFrom: startDate,
    dateTo: endDate,
    limit: 100,
  });

  const appointments = appointmentsData?.appointments || [];

  // Group appointments by day
  const appointmentsByDay = weekDays.map((day) => ({
    date: day,
    appointments: appointments.filter((apt) =>
      isSameDay(parseISO(apt.appointmentDate), day)
    ),
  }));

  const goToPrevious = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "arrived":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "no_show":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEligibilityBadge = (eligibilityStatus?: string | null) => {
    if (!eligibilityStatus) return null;

    switch (eligibilityStatus) {
      case "verified":
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            Failed
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-1 text-xs text-yellow-600">
            <Clock className="w-3 h-3" />
            Pending
          </div>
        );
      default:
        return null;
    }
  };

  // Generate time slots for day view (8 AM to 8 PM)
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 7; // Start at 7 AM
    return `${hour}:00`;
  });

  // Helper to get risk badges
  const getRiskBadge = (appointment: any) => {
    // This is placeholder logic - would come from actual risk assessment
    const risks = [];
    if (appointment.chiefComplaint?.includes("chest")) {
      risks.push("High-risk");
    }
    if (appointment.notes?.includes("prep")) {
      risks.push(`${Math.floor(Math.random() * 3) + 1} prep`);
    }
    return risks;
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between mb-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Current date display */}
        <h2 className="text-2xl font-semibold">
          {viewMode === "day" ? format(currentDate, "EEEE M/d, yyyy") : `Week of ${format(weekStart, "M/d/yyyy")}`}
        </h2>
      </CardHeader>

      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading appointments...</div>
          </div>
        ) : viewMode === "day" ? (
          /* Day view - Time-based list */
          <div className="space-y-0 border rounded-lg overflow-hidden">
            {timeSlots.map((time, idx) => {
              const hour = parseInt(time.split(":")[0]);
              const slotAppointments = appointments.filter((apt: any) => {
                const aptHour = parseInt(apt.start_time.split(":")[0]);
                return aptHour === hour && isSameDay(parseISO(apt.appointment_date), currentDate);
              });

              return (
                <div key={time} className="flex border-b last:border-b-0">
                  {/* Time column */}
                  <div className="w-24 py-3 px-4 text-sm text-muted-foreground border-r bg-muted/30">
                    {format(new Date().setHours(hour, 0), "h a")}
                  </div>

                  {/* Appointments column */}
                  <div className="flex-1 py-2 px-4 min-h-[60px]">
                    {slotAppointments.length === 0 ? (
                      <div className="text-sm text-muted-foreground/50 py-2">—</div>
                    ) : (
                      <div className="space-y-2">
                        {slotAppointments.map((appointment: any) => {
                          const risks = getRiskBadge(appointment);
                          return (
                            <button
                              key={appointment.id}
                              onClick={() => onAppointmentClick?.(appointment.id)}
                              className="w-full text-left p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-sm mb-1">
                                    {appointment.patients?.first_name} {appointment.patients?.last_name}{" "}
                                    <span className="text-muted-foreground font-normal">
                                      ({appointment.patients?.dob ? new Date().getFullYear() - new Date(appointment.patients.dob).getFullYear() : "?"}
                                      {appointment.patients?.dob && new Date(appointment.patients.dob).getMonth() > new Date().getMonth() ? "M" : "F"})
                                    </span>
                                  </div>
                                  {risks.length > 0 && (
                                    <div className="flex items-center gap-2 mb-1">
                                      {risks.map((risk, i) => (
                                        <Badge key={i} variant="destructive" className="text-xs">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          {risk}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    {appointment.chief_complaint || appointment.appointment_type || "Visit"}
                                    {appointment.notes && ` • ${appointment.notes}`}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Week view - Grid layout */
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {weekDays.map((date) => {
              const dayAppointments = appointments.filter((apt: any) =>
                isSameDay(parseISO(apt.appointment_date), date)
              );

              return (
                <div key={date.toISOString()}>
                  <div
                    className={`p-3 text-center border-b-2 mb-2 ${
                      isSameDay(date, new Date())
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="text-sm font-medium">{format(date, "EEE")}</div>
                    <div className={`text-2xl font-semibold ${isSameDay(date, new Date()) ? "text-primary" : ""}`}>
                      {format(date, "d")}
                    </div>
                    <div className="text-xs text-muted-foreground">{format(date, "MMM")}</div>
                  </div>

                  <div className={`min-h-[400px] space-y-2 p-2 rounded-lg ${isSameDay(date, new Date()) ? "bg-primary/5" : ""}`}>
                    {dayAppointments.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center pt-4">No appointments</div>
                    ) : (
                      dayAppointments.map((appointment: any) => (
                        <button
                          key={appointment.id}
                          onClick={() => onAppointmentClick?.(appointment.id)}
                          className="w-full text-left p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors text-xs"
                        >
                          <div className="font-medium mb-1">{appointment.start_time}</div>
                          <div className="font-semibold text-sm">
                            {appointment.patients?.first_name} {appointment.patients?.last_name}
                          </div>
                          <div className="text-muted-foreground mt-1">{appointment.duration_minutes} min</div>
                          {getEligibilityBadge(appointment.eligibility_status)}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
