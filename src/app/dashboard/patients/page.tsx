"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Send,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Calendar,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format, formatDistanceToNow } from "date-fns";

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isIntakeDialogOpen, setIsIntakeDialogOpen] = useState(false);
  const [intakePhone, setIntakePhone] = useState("");
  const [intakeDOS, setIntakeDOS] = useState("");
  const [activeTab, setActiveTab] = useState("patients");

  // Fetch patients
  const { data: patientsData, isLoading: patientsLoading } = trpc.patient.list.useQuery({
    limit: 50,
  });

  // Fetch intake requests
  const { data: intakeData, isLoading: intakeLoading, refetch: refetchIntake } = trpc.intake.list.useQuery({
    limit: 50,
  });

  // Create intake mutation
  const createIntakeMutation = trpc.intake.create.useMutation({
    onSuccess: () => {
      setIsIntakeDialogOpen(false);
      setIntakePhone("");
      setIntakeDOS("");
      refetchIntake();
    },
  });

  // Cancel intake mutation
  const cancelIntakeMutation = trpc.intake.cancel.useMutation({
    onSuccess: () => {
      refetchIntake();
    },
  });

  const handleCreateIntake = () => {
    if (!intakePhone) return;

    createIntakeMutation.mutate({
      phone: intakePhone,
      dateOfService: intakeDOS || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300 bg-slate-50">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-muted-foreground">
            Manage patient demographics and intake requests
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isIntakeDialogOpen} onOpenChange={setIsIntakeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Send className="w-4 h-4 mr-2" />
                Send Intake Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Patient Intake Link</DialogTitle>
                <DialogDescription>
                  Send a secure intake form link via SMS. The patient will receive a text message
                  with a link to complete their information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Patient Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+1 (555) 123-4567"
                      value={intakePhone}
                      onChange={(e) => setIntakePhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the patient&apos;s mobile phone number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dos">Date of Service (Optional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="dos"
                      type="date"
                      value={intakeDOS}
                      onChange={(e) => setIntakeDOS(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If provided, eligibility will be checked for this date
                  </p>
                </div>
              </div>
              {createIntakeMutation.error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                  {createIntakeMutation.error.message}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsIntakeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateIntake}
                  disabled={!intakePhone || createIntakeMutation.isPending}
                >
                  {createIntakeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send SMS
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="patients">
            Patients
            {patientsData?.items && (
              <Badge variant="secondary" className="ml-2">
                {patientsData.items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="intake">
            Intake Requests
            {intakeData?.tokens && (
              <Badge variant="secondary" className="ml-2">
                {intakeData.tokens.filter((t) => t.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {patientsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : patientsData?.items && patientsData.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientsData.items
                      .filter((patient: any) => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          patient.first_name?.toLowerCase().includes(query) ||
                          patient.last_name?.toLowerCase().includes(query) ||
                          patient.email?.toLowerCase().includes(query) ||
                          patient.phone?.includes(query)
                        );
                      })
                      .map((patient: any) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </TableCell>
                          <TableCell>
                            {patient.dob ? format(new Date(patient.dob), "MM/dd/yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {patient.phone ? formatPhone(patient.phone) : "-"}
                          </TableCell>
                          <TableCell>{patient.email || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {patient.created_at
                              ? formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Check Eligibility</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg font-medium mb-2">No patients yet</p>
                  <p className="text-sm">
                    Send an intake link to get started, or add a patient manually.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intake" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Intake Requests</CardTitle>
                  <CardDescription>
                    Track patient intake form submissions
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchIntake()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {intakeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : intakeData?.tokens && intakeData.tokens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date of Service</TableHead>
                      <TableHead>SMS Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intakeData.tokens.map((intake) => (
                      <TableRow key={intake.id}>
                        <TableCell className="font-medium">
                          {formatPhone(intake.phone)}
                        </TableCell>
                        <TableCell>{getStatusBadge(intake.status)}</TableCell>
                        <TableCell>
                          {intake.dateOfService
                            ? format(new Date(intake.dateOfService), "MM/dd/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {intake.smsDeliveryStatus === "sent" ? (
                            <Badge variant="outline" className="text-emerald-600">
                              Delivered
                            </Badge>
                          ) : intake.smsDeliveryStatus === "failed" ? (
                            <Badge variant="outline" className="text-red-600">
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(intake.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {intake.status === "pending" ? (
                            formatDistanceToNow(new Date(intake.expiresAt), { addSuffix: true })
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {intake.status === "pending" && (
                                <>
                                  <DropdownMenuItem>Resend SMS</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => cancelIntakeMutation.mutate({ id: intake.id })}
                                  >
                                    Cancel Request
                                  </DropdownMenuItem>
                                </>
                              )}
                              {intake.status === "completed" && intake.patientId && (
                                <DropdownMenuItem>View Patient</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No intake requests</p>
                  <p className="text-sm mb-4">
                    Send an intake link to collect patient information securely.
                  </p>
                  <Button onClick={() => setIsIntakeDialogOpen(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Send First Intake Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
