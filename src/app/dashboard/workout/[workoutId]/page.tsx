import { notFound } from "next/navigation";
import { getWorkoutById } from "@/data/workouts";
import { listExercises } from "@/data/exercises";
import EditWorkoutForm from "./EditWorkoutForm";
import ExercisesEditor from "./ExercisesEditor";
import DeleteWorkoutButton from "./DeleteWorkoutButton";

interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  const [workout, exerciseCatalog] = await Promise.all([
    getWorkoutById(workoutId),
    listExercises(),
  ]);
  if (!workout) notFound();

  const initialItems = workout.workoutExercises.map((we) => ({
    exerciseName: we.exercise.name,
    sets: we.sets.map((s) => ({
      reps: s.reps,
      weight: s.weight === null ? null : Number(s.weight),
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Workout</h1>
        <DeleteWorkoutButton workoutId={workout.id} />
      </div>

      <div className="flex flex-col gap-10">
        <EditWorkoutForm
          workoutId={workout.id}
          initialName={workout.name}
          initialStartedAt={workout.startedAt}
        />

        <ExercisesEditor
          workoutId={workout.id}
          initialItems={initialItems}
          exerciseCatalog={exerciseCatalog.map((e) => e.name)}
        />
      </div>
    </div>
  );
}
