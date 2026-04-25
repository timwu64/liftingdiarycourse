"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { useRouter, usePathname } from "next/navigation";
import { format, parse } from "date-fns";
import { useState } from "react";

interface DatePickerProps {
  dateString: string;
}

export default function DatePicker({ dateString }: DatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const date = parse(dateString, "yyyy-MM-dd", new Date());

  function handleSelect(d: Date | undefined) {
    if (!d) return;
    setOpen(false);
    router.push(`${pathname}?date=${format(d, "yyyy-MM-dd")}`);
    router.refresh();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        {formatDate(date)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={date} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
