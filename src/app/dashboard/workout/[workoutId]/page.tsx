import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkoutById } from "@/data/workouts";
import EditWorkoutForm from "./EditWorkoutForm";

interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  const workout = await getWorkoutById(workoutId);
  if (!workout) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit workout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Workout details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditWorkoutForm
            workoutId={workout.id}
            initialName={workout.name}
            initialStartedAt={workout.startedAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
