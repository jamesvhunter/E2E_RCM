"use client";

import { useState } from "react";
import { AppointmentCalendar } from "@/components/calendar/AppointmentCalendar";
import { NewAppointmentDialog } from "@/components/appointments/NewAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { SchedulesChatPanel } from "@/components/appointments/SchedulesChatPanel";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AppointmentsPage() {
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
  };

  const handleCloseDetail = () => {
    setSelectedAppointmentId(null);
  };

  const handleAppointmentCreated = () => {
    setIsNewAppointmentOpen(false);
    // Calendar will auto-refresh via tRPC
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left sidebar - Chat interface */}
      <SchedulesChatPanel />

      {/* Main content - Calendar */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Schedules</h1>
            <Button onClick={() => setIsNewAppointmentOpen(true)} className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              New visit
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-6">
          <AppointmentCalendar onAppointmentClick={handleAppointmentClick} />
        </div>
      </div>

      {/* Dialogs */}
      <NewAppointmentDialog
        open={isNewAppointmentOpen}
        onOpenChange={setIsNewAppointmentOpen}
        onSuccess={handleAppointmentCreated}
      />

      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={!!selectedAppointmentId}
        onOpenChange={(open) => !open && handleCloseDetail()}
      />
    </div>
  );
}
