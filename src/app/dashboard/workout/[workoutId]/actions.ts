"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  deleteWorkout,
  replaceWorkoutExercises,
  updateWorkout,
} from "@/data/workouts";

const updateWorkoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  startedAt: z.coerce.date(),
});

export async function updateWorkoutAction(
  input: z.infer<typeof updateWorkoutSchema>,
) {
  const data = updateWorkoutSchema.parse(input);
  const workout = await updateWorkout(data);
  revalidatePath("/dashboard");
  return workout;
}

const saveWorkoutExercisesSchema = z.object({
  workoutId: z.string().uuid(),
  items: z
    .array(
      z.object({
        exerciseName: z.string().trim().min(1).max(120),
        sets: z
          .array(
            z.object({
              reps: z.number().int().min(0).max(1000).nullable(),
              weight: z.number().min(0).max(10000).nullable(),
            }),
          )
          .max(50),
      }),
    )
    .max(30),
});

export async function saveWorkoutExercisesAction(
  input: z.infer<typeof saveWorkoutExercisesSchema>,
) {
  const data = saveWorkoutExercisesSchema.parse(input);
  await replaceWorkoutExercises(data);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workout/${data.workoutId}`);
}

const deleteWorkoutSchema = z.object({ id: z.string().uuid() });

export async function deleteWorkoutAction(
  input: z.infer<typeof deleteWorkoutSchema>,
) {
  const { id } = deleteWorkoutSchema.parse(input);
  await deleteWorkout(id);
  revalidatePath("/dashboard");
}
