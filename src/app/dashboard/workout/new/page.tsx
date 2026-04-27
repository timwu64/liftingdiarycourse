import CreateWorkoutForm from "./CreateWorkoutForm";

export default function NewWorkoutPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        Create New Workout
      </h1>
      <CreateWorkoutForm />
    </div>
  );
}
