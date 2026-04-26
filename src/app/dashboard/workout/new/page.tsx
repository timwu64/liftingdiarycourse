import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CreateWorkoutForm from "./CreateWorkoutForm";

export default function NewWorkoutPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New workout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Workout details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateWorkoutForm />
        </CardContent>
      </Card>
    </div>
  );
}
