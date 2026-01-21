"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle2, AlertCircle } from "lucide-react";

interface AppointmentCalendarProps {
  providerId?: string;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function AppointmentCalendar({ providerId, onAppointmentClick }: AppointmentCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(providerId);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch providers
  const { data: practiceData } = trpc.practice.getCurrent.useQuery();
  const providers = practiceData?.providers || [];

  // Fetch appointments for the week
  const { data: appointmentsData, isLoading } = trpc.appointment.list.useQuery({
    providerId: selectedProvider,
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(addDays(weekStart, 6), "yyyy-MM-dd"),
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

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToToday = () => setCurrentWeek(new Date());

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Appointment Calendar
          </CardTitle>

          <div className="flex items-center gap-3">
            {/* Provider selector */}
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider: any) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.firstName} {provider.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading appointments...</div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {appointmentsByDay.map(({ date }) => (
              <div
                key={date.toISOString()}
                className={`p-3 text-center border-b-2 ${
                  isSameDay(date, new Date())
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="text-sm font-medium text-foreground">
                  {format(date, "EEE")}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isSameDay(date, new Date()) ? "text-primary" : "text-foreground"
                  }`}
                >
                  {format(date, "d")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(date, "MMM")}
                </div>
              </div>
            ))}

            {/* Appointment slots */}
            {appointmentsByDay.map(({ date, appointments: dayAppointments }) => (
              <div
                key={date.toISOString()}
                className={`min-h-[400px] p-2 space-y-2 border-r last:border-r-0 ${
                  isSameDay(date, new Date()) ? "bg-primary/5" : "bg-background"
                }`}
              >
                {dayAppointments.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center pt-4">
                    No appointments
                  </div>
                ) : (
                  dayAppointments.map((appointment: any) => (
                    <button
                      key={appointment.id}
                      onClick={() => onAppointmentClick?.(appointment.id)}
                      className="w-full text-left p-2 rounded-md border bg-card hover:bg-accent/10 transition-colors"
                    >
                      {/* Time */}
                      <div className="flex items-center gap-1 text-xs font-medium mb-1">
                        <Clock className="w-3 h-3" />
                        {appointment.startTime}
                      </div>

                      {/* Patient name */}
                      <div className="flex items-center gap-1 text-sm font-semibold mb-1">
                        <User className="w-3 h-3" />
                        {appointment.patient?.firstName} {appointment.patient?.lastName}
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.status}
                      </Badge>

                      {/* Eligibility status */}
                      {getEligibilityBadge(appointment.eligibilityStatus)}

                      {/* Duration */}
                      <div className="text-xs text-muted-foreground mt-1">
                        {appointment.durationMinutes} min
                      </div>
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
