"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/dates";

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export default function DatePicker({ date, onDateChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-52 justify-start gap-2" />
        }
      >
        <CalendarIcon />
        {formatDate(date)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onDateChange(d)}
        />
      </PopoverContent>
    </Popover>
  );
}
