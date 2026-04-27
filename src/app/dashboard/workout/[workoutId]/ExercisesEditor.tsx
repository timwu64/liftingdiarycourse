"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWorkoutExercisesAction } from "./actions";

interface SetRow {
  localId: string;
  reps: string;
  weight: string;
}

interface ExerciseRow {
  localId: string;
  exerciseName: string;
  sets: SetRow[];
}

interface ExercisesEditorProps {
  workoutId: string;
  initialItems: Array<{
    exerciseName: string;
    sets: Array<{ reps: number | null; weight: number | null }>;
  }>;
  exerciseCatalog: string[];
}

function newLocalId(): string {
  return Math.random().toString(36).slice(2);
}

function toExerciseRow(item: ExercisesEditorProps["initialItems"][number]): ExerciseRow {
  return {
    localId: newLocalId(),
    exerciseName: item.exerciseName,
    sets: item.sets.map((s) => ({
      localId: newLocalId(),
      reps: s.reps === null ? "" : String(s.reps),
      weight: s.weight === null ? "" : String(s.weight),
    })),
  };
}

function parseNumberOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function ExercisesEditor({
  workoutId,
  initialItems,
  exerciseCatalog,
}: ExercisesEditorProps) {
  const router = useRouter();
  const datalistId = useId();
  const [items, setItems] = useState<ExerciseRow[]>(() =>
    initialItems.map(toExerciseRow),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalSets = items.reduce((sum, ex) => sum + ex.sets.length, 0);

  function addExercise() {
    setItems((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        exerciseName: "",
        sets: [{ localId: newLocalId(), reps: "", weight: "" }],
      },
    ]);
  }

  function removeExercise(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  function moveExercise(localId: string, direction: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.localId === localId);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function setExerciseName(localId: string, name: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === localId ? { ...it, exerciseName: name } : it,
      ),
    );
  }

  function addSet(exerciseLocalId: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === exerciseLocalId
          ? {
              ...it,
              sets: [
                ...it.sets,
                { localId: newLocalId(), reps: "", weight: "" },
              ],
            }
          : it,
      ),
    );
  }

  function removeSet(exerciseLocalId: string, setLocalId: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === exerciseLocalId
          ? { ...it, sets: it.sets.filter((s) => s.localId !== setLocalId) }
          : it,
      ),
    );
  }

  function updateSet(
    exerciseLocalId: string,
    setLocalId: string,
    patch: Partial<Pick<SetRow, "reps" | "weight">>,
  ) {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === exerciseLocalId
          ? {
              ...it,
              sets: it.sets.map((s) =>
                s.localId === setLocalId ? { ...s, ...patch } : s,
              ),
            }
          : it,
      ),
    );
  }

  function handleSave() {
    setError(null);

    const normalized = items
      .map((it) => ({
        exerciseName: it.exerciseName.trim(),
        sets: it.sets.map((s) => ({
          reps: parseNumberOrNull(s.reps),
          weight: parseNumberOrNull(s.weight),
        })),
      }))
      .filter((it) => it.exerciseName.length > 0);

    const blanks = items.some((it) => it.exerciseName.trim().length === 0);
    if (blanks) {
      setError("Every exercise needs a name.");
      return;
    }

    startTransition(async () => {
      try {
        await saveWorkoutExercisesAction({ workoutId, items: normalized });
        router.refresh();
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("Failed to save exercises");
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Exercises</h2>
        <p className="text-sm text-muted-foreground">
          {items.length} exercise{items.length === 1 ? "" : "s"} · {totalSets}{" "}
          set{totalSets === 1 ? "" : "s"}
        </p>
      </div>

      <datalist id={datalistId}>
        {exerciseCatalog.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          No exercises yet. Add one to start logging sets.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((ex, exIdx) => (
            <div
              key={ex.localId}
              className="rounded-lg border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`ex-${ex.localId}`}>Exercise</Label>
                  <Input
                    id={`ex-${ex.localId}`}
                    list={datalistId}
                    placeholder="e.g. Bench Press"
                    value={ex.exerciseName}
                    onChange={(e) =>
                      setExerciseName(ex.localId, e.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={exIdx === 0}
                  onClick={() => moveExercise(ex.localId, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={exIdx === items.length - 1}
                  onClick={() => moveExercise(ex.localId, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Remove exercise"
                  onClick={() => removeExercise(ex.localId)}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {ex.sets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sets yet.</p>
                ) : (
                  <div className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2 text-xs text-muted-foreground">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>Weight (kg)</span>
                    <span className="sr-only">Remove</span>
                  </div>
                )}

                {ex.sets.map((s, setIdx) => (
                  <div
                    key={s.localId}
                    className="grid grid-cols-[2.5rem_1fr_1fr_2rem] items-center gap-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {setIdx + 1}
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="—"
                      value={s.reps}
                      onChange={(e) =>
                        updateSet(ex.localId, s.localId, {
                          reps: e.target.value,
                        })
                      }
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      placeholder="—"
                      value={s.weight}
                      onChange={(e) =>
                        updateSet(ex.localId, s.localId, {
                          weight: e.target.value,
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove set"
                      onClick={() => removeSet(ex.localId, s.localId)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => addSet(ex.localId)}
                >
                  <Plus /> Add set
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addExercise}>
          <Plus /> Add exercise
        </Button>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
