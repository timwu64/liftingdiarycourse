"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/dates";
import { updateWorkoutAction } from "./actions";

interface EditWorkoutFormProps {
  workoutId: string;
  initialName: string;
  initialStartedAt: Date;
}

export default function EditWorkoutForm({
  workoutId,
  initialName,
  initialStartedAt,
}: EditWorkoutFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [startedAt, setStartedAt] = useState<Date>(
    () => new Date(initialStartedAt),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateWorkoutAction({ id: workoutId, name, startedAt });
        router.push(`/dashboard?date=${format(startedAt, "yyyy-MM-dd")}`);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Something went wrong");
      }
    });
  }

  function handleDateSelect(d: Date | undefined) {
    if (!d) return;
    const next = new Date(startedAt);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStartedAt(next);
    setCalendarOpen(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          placeholder="e.g. Push Day"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Started at</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger render={<Button type="button" variant="outline" />}>
            {formatDate(startedAt)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startedAt}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || name.trim().length === 0}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
