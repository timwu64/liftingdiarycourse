"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import DatePicker from "./DatePicker";

const mockWorkouts = [
  {
    id: 1,
    name: "Bench Press",
    muscleGroup: "Chest",
    sets: [
      { reps: 8, weight: 80 },
      { reps: 8, weight: 80 },
      { reps: 7, weight: 80 },
      { reps: 6, weight: 80 },
    ],
  },
  {
    id: 2,
    name: "Squat",
    muscleGroup: "Legs",
    sets: [
      { reps: 10, weight: 100 },
      { reps: 10, weight: 100 },
      { reps: 9, weight: 100 },
    ],
  },
  {
    id: 3,
    name: "Deadlift",
    muscleGroup: "Back",
    sets: [
      { reps: 5, weight: 140 },
      { reps: 5, weight: 140 },
      { reps: 4, weight: 140 },
    ],
  },
];

export default function DashboardPage() {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DatePicker date={date} onDateChange={setDate} />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Workouts for {formatDate(date)}
        </h2>

        {mockWorkouts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No workouts logged for this date.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {mockWorkouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>{workout.name}</CardTitle>
                    <Badge variant="secondary">{workout.muscleGroup}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {workout.sets.map((set, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        Set {i + 1} · {set.reps} reps · {set.weight} kg
                      </span>
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
