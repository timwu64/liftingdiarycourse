/**
 * Seed script — populates the database with realistic PPL workout data
 * for the currently authenticated Clerk user.
 *
 * Usage:
 *   npm run seed
 *   npm run seed -- <clerk-user-id>   (skip Clerk API lookup)
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import {
  exercises as exercisesTable,
  workouts as workoutsTable,
  workoutExercises as workoutExercisesTable,
  sets as setsTable,
} from "../src/db/schema";

const db = drizzle(process.env.DATABASE_URL!, { schema });

// ---------------------------------------------------------------------------
// Exercise catalog
// ---------------------------------------------------------------------------

const EXERCISE_NAMES = [
  "Bench Press",
  "Overhead Press",
  "Incline Bench Press",
  "Barbell Row",
  "Pull-up",
  "Deadlift",
  "Bicep Curl",
  "Squat",
  "Romanian Deadlift",
  "Leg Press",
] as const;

// ---------------------------------------------------------------------------
// Workout plan
// ---------------------------------------------------------------------------

type WorkoutType = "push" | "pull" | "legs";

const SCHEDULE: { date: string; type: WorkoutType; name: string }[] = [
  { date: "2026-03-20", type: "push", name: "Push Day" },
  { date: "2026-03-22", type: "pull", name: "Pull Day" },
  { date: "2026-03-24", type: "legs", name: "Legs Day" },
  { date: "2026-03-26", type: "push", name: "Push Day" },
  { date: "2026-03-28", type: "pull", name: "Pull Day" },
  { date: "2026-03-30", type: "legs", name: "Legs Day" },
  { date: "2026-04-01", type: "push", name: "Push Day" },
  { date: "2026-04-03", type: "pull", name: "Pull Day" },
  { date: "2026-04-05", type: "legs", name: "Legs Day" },
  { date: "2026-04-07", type: "push", name: "Push Day" },
  { date: "2026-04-09", type: "pull", name: "Pull Day" },
  { date: "2026-04-11", type: "legs", name: "Legs Day" },
  { date: "2026-04-13", type: "push", name: "Push Day" },
  { date: "2026-04-15", type: "pull", name: "Pull Day" },
  { date: "2026-04-17", type: "legs", name: "Legs Day" },
  { date: "2026-04-19", type: "push", name: "Push Day" },
  { date: "2026-04-21", type: "pull", name: "Pull Day" },
  { date: "2026-04-23", type: "legs", name: "Legs Day" },
  { date: "2026-04-25", type: "push", name: "Push Day" },
  { date: "2026-04-27", type: "pull", name: "Pull Day" },
  { date: "2026-04-29", type: "legs", name: "Legs Day" },
  { date: "2026-05-01", type: "push", name: "Push Day" },
];

interface ExercisePlan {
  name: (typeof EXERCISE_NAMES)[number];
  sets: number;
  baseReps: number;
  baseWeight: number;
  weeklyIncrease: number; // kg added per week of progressive overload
}

const PUSH_PLAN: ExercisePlan[] = [
  { name: "Bench Press",         sets: 4, baseReps: 8,  baseWeight: 80,  weeklyIncrease: 2.5 },
  { name: "Overhead Press",      sets: 3, baseReps: 8,  baseWeight: 50,  weeklyIncrease: 2.5 },
  { name: "Incline Bench Press", sets: 3, baseReps: 8,  baseWeight: 65,  weeklyIncrease: 2.5 },
];

const PULL_PLAN: ExercisePlan[] = [
  { name: "Barbell Row",  sets: 4, baseReps: 8,  baseWeight: 70,  weeklyIncrease: 2.5 },
  { name: "Deadlift",     sets: 3, baseReps: 5,  baseWeight: 100, weeklyIncrease: 5   },
  { name: "Bicep Curl",   sets: 3, baseReps: 12, baseWeight: 15,  weeklyIncrease: 2.5 },
];

const LEGS_PLAN: ExercisePlan[] = [
  { name: "Squat",             sets: 4, baseReps: 8,  baseWeight: 90,  weeklyIncrease: 5   },
  { name: "Romanian Deadlift", sets: 3, baseReps: 10, baseWeight: 80,  weeklyIncrease: 2.5 },
  { name: "Leg Press",         sets: 3, baseReps: 12, baseWeight: 120, weeklyIncrease: 5   },
];

const PLAN_BY_TYPE: Record<WorkoutType, ExercisePlan[]> = {
  push: PUSH_PLAN,
  pull: PULL_PLAN,
  legs: LEGS_PLAN,
};

const START_DATE = new Date("2026-03-20T00:00:00");

function weekOffset(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.floor(
    (d.getTime() - START_DATE.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
}

/** Simulate slight fatigue drop-off across sets (–1 rep every other set). */
function repsForSet(base: number, setIndex: number): number {
  return Math.max(base - Math.floor(setIndex / 2), base - 2);
}

// ---------------------------------------------------------------------------
// Clerk — get first user's ID
// ---------------------------------------------------------------------------

async function fetchUserId(): Promise<string> {
  const res = await fetch("https://api.clerk.com/v1/users?limit=1", {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk API error: ${res.status} ${res.statusText}`);

  const users = (await res.json()) as { id: string }[];
  const id = users[0]?.id;
  if (!id) throw new Error("No users found in Clerk. Sign up first.");
  return id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const userId: string = process.argv[2] ?? (await fetchUserId());
  console.log(`Seeding for userId: ${userId}`);

  // ── 1. Wipe existing workouts for this user (cascades to exercises/sets) ──
  const deleted = await db
    .delete(workoutsTable)
    .where(eq(workoutsTable.userId, userId))
    .returning({ id: workoutsTable.id });
  console.log(`Deleted ${deleted.length} existing workout(s).`);

  // ── 2. Ensure exercises exist (insert only names not already present) ──
  const existing = await db
    .select({ name: exercisesTable.name })
    .from(exercisesTable);
  const existingNames = new Set(existing.map((e) => e.name));

  const toInsert = EXERCISE_NAMES.filter((n) => !existingNames.has(n));
  if (toInsert.length > 0) {
    await db
      .insert(exercisesTable)
      .values(toInsert.map((name) => ({ name })));
    console.log(`Inserted ${toInsert.length} exercise(s).`);
  } else {
    console.log("All exercises already present.");
  }

  const allExercises = await db
    .select({ id: exercisesTable.id, name: exercisesTable.name })
    .from(exercisesTable);
  const exerciseIdByName = Object.fromEntries(
    allExercises.map((e) => [e.name, e.id])
  );

  // ── 3. Insert workouts, workout_exercises, and sets ──
  let totalWorkouts = 0;
  let totalSets = 0;

  for (const session of SCHEDULE) {
    const week = weekOffset(session.date);
    const startedAt = new Date(session.date + "T09:00:00");

    // Insert workout session
    const [workout] = await db
      .insert(workoutsTable)
      .values({
        userId,
        name: session.name,
        startedAt,
        completedAt: new Date(startedAt.getTime() + 60 * 60 * 1000), // +1 hour
      })
      .returning({ id: workoutsTable.id });

    const plan = PLAN_BY_TYPE[session.type];

    for (let order = 0; order < plan.length; order++) {
      const ep = plan[order];
      const exerciseId = exerciseIdByName[ep.name];
      if (!exerciseId) {
        console.warn(`Exercise not found: ${ep.name}`);
        continue;
      }

      const weight = ep.baseWeight + week * ep.weeklyIncrease;

      // Insert workout_exercise
      const [we] = await db
        .insert(workoutExercisesTable)
        .values({ workoutId: workout.id, exerciseId, order: order + 1 })
        .returning({ id: workoutExercisesTable.id });

      // Insert sets
      const setRows = Array.from({ length: ep.sets }, (_, i) => ({
        workoutExerciseId: we.id,
        setNumber: i + 1,
        weight: String(weight),
        reps: repsForSet(ep.baseReps, i),
      }));

      await db.insert(setsTable).values(setRows);
      totalSets += setRows.length;
    }

    totalWorkouts++;
    process.stdout.write(
      `  ✓ ${session.date} ${session.type.padEnd(5)} week=${week} weight+=${week * Math.min(...plan.map((p) => p.weeklyIncrease))}kg\n`
    );
  }

  console.log(
    `\nDone! Inserted ${totalWorkouts} workouts and ${totalSets} sets.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
