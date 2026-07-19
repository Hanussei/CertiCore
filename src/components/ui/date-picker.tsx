import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePickerProps = {
  value?: string; // Expects YYYY-MM-DD or ISO datetime string
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select day",
  className,
  disabled = false,
}: DatePickerProps) {
  // Parse incoming date string safely in local time to avoid timezone shifting
  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    
    // Check if it's an ISO datetime string or just a plain YYYY-MM-DD string
    if (value.includes("T") || value.includes("Z")) {
      return new Date(value);
    }
    
    const [year, month, day] = value.split("-").map(Number);
    // Months are 0-indexed in JS Date
    return new Date(year, month - 1, day);
  }, [value]);

  const handleSelect = (date?: Date) => {
    if (!date) {
      onChange("");
      return;
    }
    
    // Determine target format based on incoming value format
    if (value && (value.includes("T") || value.includes("Z"))) {
      // Return ISO datetime string. Set local hours to noon (12:00) to prevent date shift in UTC conversion
      const localDate = new Date(date);
      localDate.setHours(12, 0, 0, 0);
      onChange(localDate.toISOString());
    } else {
      // Return plain YYYY-MM-DD local format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal py-3 px-4 h-auto block rounded-lg text-sm transition-all duration-200",
            "bg-white dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:border-gold/50 focus:border-gold focus:ring-1 focus:ring-gold",
            "disabled:opacity-50 disabled:pointer-events-none",
            !value && "text-neutral-500 dark:text-neutral-400",
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400 group-hover:text-gold" />
            <span>{parsedDate ? format(parsedDate, "PPP") : placeholder}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-auto p-0 border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-2xl rounded-xl backdrop-blur-md overflow-hidden"
      >
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          initialFocus
          className="p-3 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
        />
      </PopoverContent>
    </Popover>
  );
}
