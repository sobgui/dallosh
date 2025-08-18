import React, { useState, useEffect, useRef } from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionType {
  label: string;
  value: string;
  description?: string;
}

interface AsyncSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  fetchOptions: (search: string) => Promise<OptionType[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AsyncSearchSelect({
  value,
  onChange,
  fetchOptions,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: AsyncSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<OptionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus the input when dropdown opens
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const opts = await fetchOptions(search);
        setOptions(opts);
        // Set label for selected value
        const selected = opts.find(opt => opt.value === value);
        setSelectedLabel(selected ? selected.label : "");
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, value, fetchOptions]);

  useEffect(() => {
    if (!open && value && !selectedLabel) {
      // Fetch label for selected value if not present
      fetchOptions("").then(opts => {
        const selected = opts.find(opt => opt.value === value);
        setSelectedLabel(selected ? selected.label : "");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span>
            {selectedLabel || placeholder}
          </span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] z-50">
        <Command>
          <CommandInput
            ref={inputRef}
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
            disabled={disabled}
          />
          <CommandEmpty>{loading ? "Loading..." : "No options found."}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map(option => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={(_value) => {
                  onChange(option.value);
                  setOpen(false);
                  setSelectedLabel(option.label);
                }}
              >
                {option.label}
                {option.description && (
                  <span className="ml-2 text-xs text-muted-foreground">{option.description}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 