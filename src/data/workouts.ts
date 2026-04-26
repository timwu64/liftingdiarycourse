import { db } from "@/db";
import { workouts } from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
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
