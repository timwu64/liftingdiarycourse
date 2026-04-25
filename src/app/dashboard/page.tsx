import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { getWorkoutsForUser } from "@/data/workouts";
import { format, parse } from "date-fns";
import DatePicker from "./DatePicker";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { date: dateParam } = await searchParams;
  const dateString = dateParam ?? format(new Date(), "yyyy-MM-dd");
  const date = parse(dateString, "yyyy-MM-dd", new Date());

  const workouts = await getWorkoutsForUser(date);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DatePicker dateString={dateString} />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Workouts for {formatDate(date)}
        </h2>

        {workouts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No workouts logged for this date.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{workout.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {workout.workoutExercises.map((we) => (
                      <div key={we.id}>
                        <p className="mb-1.5 text-sm font-medium">
                          {we.exercise.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {we.sets.map((set) => (
                            <span
                              key={set.id}
                              className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              Set {set.setNumber} · {set.reps ?? "—"} reps · {set.weight ?? "—"} kg
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
