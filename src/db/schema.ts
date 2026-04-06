import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Exercise catalog
export const exercises = pgTable("exercises", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Workout sessions
export const workouts = pgTable("workouts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull(),
  name:        text("name").notNull(),
  startedAt:   timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Exercises within a workout (ordered)
export const workoutExercises = pgTable("workout_exercises", {
  id:         uuid("id").primaryKey().defaultRandom(),
  workoutId:  uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id),
  order:      integer("order").notNull(),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

// Sets for each workout_exercise
export const sets = pgTable("sets", {
  id:                uuid("id").primaryKey().defaultRandom(),
  workoutExerciseId: uuid("workout_exercise_id")
    .notNull()
    .references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber:         integer("set_number").notNull(),
  weight:            decimal("weight", { precision: 10, scale: 2 }),
  reps:              integer("reps"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const workoutsRelations = relations(workouts, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one, many }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(sets),
  })
);

export const setsRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [sets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));
