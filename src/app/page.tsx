import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroButtons } from "./HeroButtons";

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge className="mb-6">Track your progress</Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Your personal lifting diary
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Log workouts, track exercises, and monitor your progress over time.
          Simple, focused, and built for lifters.
        </p>
        <HeroButtons />
      </div>

      <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-semibold">Log Workouts</h3>
            <p className="text-sm text-muted-foreground">
              Record your sessions with exercises, sets, reps, and weights in
              seconds.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-semibold">Track by Date</h3>
            <p className="text-sm text-muted-foreground">
              Browse your workout history day by day with an easy-to-use date
              picker.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-semibold">Stay Consistent</h3>
            <p className="text-sm text-muted-foreground">
              Build a habit by having all your lifts in one place, accessible
              anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
