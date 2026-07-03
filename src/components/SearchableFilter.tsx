import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface SearchableFilterProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  allLabel?: string;
  allValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function SearchableFilter({
  value,
  onChange,
  options,
  allLabel,
  allValue = "todos",
  placeholder = "Selecionar...",
  searchPlaceholder = "Pesquisar...",
  className,
}: SearchableFilterProps) {
  const [open, setOpen] = useState(false);
  const selected =
    value === allValue
      ? allLabel ?? placeholder
      : options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("h-10 justify-between font-normal", className)}
        >
          <span className="truncate">{selected}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder={searchPlaceholder} className="border-0 focus:ring-0 h-10" />
          </div>
          <CommandList className="max-h-[280px]">
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {allLabel && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange(allValue);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === allValue ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
