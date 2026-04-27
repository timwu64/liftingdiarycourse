import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

export async function getWorkoutsForUser(date: Date) {
  const userId = await getCurrentUserId();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      gte(workouts.startedAt, start),
      lt(workouts.startedAt, end),
    ),
    with: {
      workoutExercises: {
        orderBy: (we, { asc }) => [asc(we.order)],
        with: {
          exercise: true,
          sets: {
            orderBy: (s, { asc }) => [asc(s.setNumber)],
          },
        },
      },
    },
  });
}

export async function createWorkout(input: { name: string; startedAt: Date }) {
  const userId = await getCurrentUserId();
  const [row] = await db
    .insert(workouts)
    .values({
      userId,
      name: input.name,
      startedAt: input.startedAt,
    })
    .returning();
  return row;
}

export async function getWorkoutById(workoutId: string) {
  const userId = await getCurrentUserId();
  return db.query.workouts.findFirst({
    where: and(eq(workouts.id, workoutId), eq(workouts.userId, userId)),
    with: {
      workoutExercises: {
        orderBy: (we, { asc }) => [asc(we.order)],
        with: {
          exercise: true,
          sets: {
            orderBy: (s, { asc }) => [asc(s.setNumber)],
          },
        },
      },
    },
  });
}

export async function updateWorkout(input: {
  id: string;
  name: string;
  startedAt: Date;
}) {
  const userId = await getCurrentUserId();
  const [row] = await db
    .update(workouts)
    .set({ name: input.name, startedAt: input.startedAt })
    .where(and(eq(workouts.id, input.id), eq(workouts.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteWorkout(workoutId: string) {
  const userId = await getCurrentUserId();
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}

interface ReplaceWorkoutExercisesInput {
  workoutId: string;
  items: Array<{
    exerciseName: string;
    sets: Array<{ reps: number | null; weight: number | null }>;
  }>;
}

export async function replaceWorkoutExercises(
  input: ReplaceWorkoutExercisesInput,
) {
  const userId = await getCurrentUserId();

  const owned = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, input.workoutId), eq(workouts.userId, userId)));
  if (owned.length === 0) throw new Error("Workout not found");

  const trimmed = input.items
    .map((it) => ({ ...it, exerciseName: it.exerciseName.trim() }))
    .filter((it) => it.exerciseName.length > 0);

  const uniqueNames = [...new Set(trimmed.map((it) => it.exerciseName))];
  const nameToId = new Map<string, string>();

  if (uniqueNames.length > 0) {
    const existing = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.name, uniqueNames));
    for (const ex of existing) nameToId.set(ex.name, ex.id);

    const missing = uniqueNames.filter((n) => !nameToId.has(n));
    if (missing.length > 0) {
      const inserted = await db
        .insert(exercises)
        .values(missing.map((name) => ({ name })))
        .returning();
      for (const ex of inserted) nameToId.set(ex.name, ex.id);
    }
  }

  const weRows = trimmed.map((it, i) => ({
    id: randomUUID(),
    workoutId: input.workoutId,
    exerciseId: nameToId.get(it.exerciseName)!,
    order: i,
  }));

  const setRows = trimmed.flatMap((it, i) =>
    it.sets.map((s, j) => ({
      id: randomUUID(),
      workoutExerciseId: weRows[i].id,
      setNumber: j + 1,
      reps: s.reps,
      weight: s.weight === null ? null : String(s.weight),
    })),
  );

  await db
    .delete(workoutExercises)
    .where(eq(workoutExercises.workoutId, input.workoutId));

  if (weRows.length > 0) {
    await db.insert(workoutExercises).values(weRows);
  }
  if (setRows.length > 0) {
    await db.insert(sets).values(setRows);
  }
}
