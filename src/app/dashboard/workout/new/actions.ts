"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  startedAt: z.coerce.date(),
});

export async function createWorkoutAction(
  input: z.infer<typeof createWorkoutSchema>,
) {
  const data = createWorkoutSchema.parse(input);
  const workout = await createWorkout(data);
  revalidatePath("/dashboard");
  return workout;
}
