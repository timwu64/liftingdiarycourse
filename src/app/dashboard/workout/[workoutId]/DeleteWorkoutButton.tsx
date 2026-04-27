"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteWorkoutAction } from "./actions";

export default function DeleteWorkoutButton({
  workoutId,
}: {
  workoutId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) return;
    const confirmed = window.confirm(
      "Delete this workout? This will also remove its exercises and sets. This cannot be undone.",
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteWorkoutAction({ id: workoutId });
        router.push("/dashboard");
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Failed to delete workout");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
      >
        <Trash2 /> {isPending ? "Deleting..." : "Delete"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
