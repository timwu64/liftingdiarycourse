"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkoutAction } from "./actions";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreateWorkoutForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState<Date>(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createWorkoutAction({ name, startedAt });
        router.push(`/dashboard?date=${format(startedAt, "yyyy-MM-dd")}`);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Something went wrong");
      }
    });
  }

  function handleStartedAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = new Date(e.target.value);
    if (Number.isNaN(next.getTime())) return;
    setStartedAt(next);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Workout Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          placeholder="Enter workout name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="startedAt">Start Time</Label>
        <Input
          id="startedAt"
          type="datetime-local"
          value={toLocalInputValue(startedAt)}
          onChange={handleStartedAtChange}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || name.trim().length === 0}>
          {isPending ? "Creating..." : "Create Workout"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
