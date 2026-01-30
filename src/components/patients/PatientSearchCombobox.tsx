"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";

interface PatientSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function PatientSearchCombobox({ value, onValueChange }: PatientSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: patientsData } = trpc.patient.list.useQuery({
    limit: 50,
  });

  const patients = patientsData?.items || [];

  // Filter patients based on search
  const filteredPatients = patients.filter((patient: any) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const dob = patient.dob || "";
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      dob.includes(searchQuery)
    );
  });

  const selectedPatient = patients.find((p: any) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPatient ? (
            <span>
              {selectedPatient.first_name} {selectedPatient.last_name}
              {selectedPatient.dob && (
                <span className="text-muted-foreground ml-2">
                  (DOB: {new Date(selectedPatient.dob).toLocaleDateString()})
                </span>
              )}
            </span>
          ) : (
            "Search for patient..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search patient by name or DOB..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No patient found.</CommandEmpty>
            <CommandGroup>
              {filteredPatients.map((patient: any) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === patient.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      DOB: {patient.dob ? new Date(patient.dob).toLocaleDateString() : "N/A"}
                      {patient.phone && ` • Phone: ${patient.phone}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
