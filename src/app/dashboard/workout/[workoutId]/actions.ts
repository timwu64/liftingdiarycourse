"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateWorkout } from "@/data/workouts";

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
