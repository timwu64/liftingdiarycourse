import { db } from "@/db";
import { exercises } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function listExercises() {
  return db.select().from(exercises).orderBy(asc(exercises.name));
}
