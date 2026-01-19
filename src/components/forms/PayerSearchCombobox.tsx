"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

interface Payer {
  id: string;
  name: string;
  stediPayerId: string | null;
}

interface PayerSearchComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PayerSearchCombobox({
  value,
  onChange,
  disabled = false,
}: PayerSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch payers from the API
  const { data: payers = [], isLoading } = trpc.intake.getPayers.useQuery();

  // Filter payers based on search query
  const filteredPayers = React.useMemo(() => {
    if (!searchQuery) return payers;
    const query = searchQuery.toLowerCase();
    return payers.filter(
      (payer: Payer) =>
        payer.name.toLowerCase().includes(query) ||
        (payer.stediPayerId && payer.stediPayerId.toLowerCase().includes(query))
    );
  }, [payers, searchQuery]);

  // Get selected payer name
  const selectedPayer = payers.find((p: Payer) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            "Loading payers..."
          ) : selectedPayer ? (
            selectedPayer.name
          ) : (
            <span className="text-muted-foreground">Select insurance company...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search insurance companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No insurance company found.</CommandEmpty>
            <CommandGroup>
              {filteredPayers.map((payer: Payer) => (
                <CommandItem
                  key={payer.id}
                  value={payer.id}
                  onSelect={() => {
                    onChange(payer.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === payer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{payer.name}</span>
                    {payer.stediPayerId && (
                      <span className="text-xs text-muted-foreground">
                        ID: {payer.stediPayerId}
                      </span>
                    )}
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
