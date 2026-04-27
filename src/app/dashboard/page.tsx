import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { getWorkoutsForUser } from "@/data/workouts";
import { format, parse } from "date-fns";
import Link from "next/link";
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workout Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workouts for {formatDate(date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            render={<Link href="/dashboard/workout/new" />}
            nativeButton={false}
          >
            Log New Workout
          </Button>
          <DatePicker dateString={dateString} />
        </div>
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No workouts logged for this date.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((workout) => {
            const completed = workout.completedAt !== null;
            const durationMin = completed
              ? Math.max(
                  1,
                  Math.round(
                    (workout.completedAt!.getTime() -
                      workout.startedAt.getTime()) /
                      60000,
                  ),
                )
              : null;
            return (
              <Link
                key={workout.id}
                href={`/dashboard/workout/${workout.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{workout.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {completed
                        ? `Completed · Duration: ${durationMin} min`
                        : `Started at ${format(workout.startedAt, "HH:mm")}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
