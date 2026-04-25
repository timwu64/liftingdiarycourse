# Data Fetching Standards

This document is the **single source of truth** for how data is fetched and queried in this application. The rules below are mandatory and override any default behavior, general best practice, or prior training knowledge.

---

## Rule 1: All Data Fetching Happens in Server Components

**All data fetching in this app MUST be performed inside React Server Components.** No exceptions.

### Forbidden

Data fetching is **strictly prohibited** in any of the following:

- **Route handlers** (`app/**/route.ts`) — do not create `GET`/`POST` endpoints to read data for your own UI.
- **Client components** (`"use client"` files) — no `fetch()`, no `useEffect` data loading, no SWR, no React Query, no `axios`.
- **Server actions used as a fetch mechanism** — server actions are for mutations, not reads.
- **Middleware** — middleware is not a data layer.
- **Any other indirect approach** — e.g. tRPC, GraphQL clients on the client, third-party data hooks.

### Required pattern

```tsx
// app/dashboard/page.tsx — a Server Component
import { getWorkoutsForUser } from "@/data/workouts";

export default async function DashboardPage() {
  const workouts = await getWorkoutsForUser();
  return <WorkoutList workouts={workouts} />;
}
```

If a client component needs data, the **server component** fetches it and passes it down as props. Client components receive data, they never request it.

### Why

- One data flow path = one place to enforce auth, caching, and error handling.
- Server components run on the server with direct DB access — no extra HTTP hop, no over-the-wire payload to inspect/tamper with.
- Eliminates the entire class of bugs where the same data is fetched two different ways with two different auth checks.

---

## Rule 2: Database Queries Live in `/data` Helper Functions

All database access **must** go through helper functions in [src/data/](src/data/). Server components import these helpers; they never query the database directly.

### Required structure

```
src/data/
├── workouts.ts      # all workout-related queries
├── exercises.ts     # all exercise-related queries
└── users.ts         # all user-related queries
```

### Required pattern

```ts
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

export async function getWorkoutsForUser(date: Date) {
  const userId = await getCurrentUserId();
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)));
}
```

### Forbidden

```ts
// FORBIDDEN — query inlined in a page/component
export default async function DashboardPage() {
  const rows = await db.select().from(workouts); // ❌
  return <WorkoutList workouts={rows} />;
}
```

### Why

- A single audited surface for every query. Auth checks, filters, and joins live in one place.
- Refactors to the schema touch one file, not every page.
- Reviewers can confirm authorization logic by reading `/data` alone.

---

## Rule 3: Use Drizzle ORM — Never Raw SQL

**All database queries must use [Drizzle ORM](https://orm.drizzle.team/).** Writing raw SQL strings is **strictly prohibited**.

### Required

```ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const rows = await db
  .select()
  .from(workouts)
  .where(and(eq(workouts.userId, userId), eq(workouts.archived, false)))
  .orderBy(desc(workouts.date));
```

### Forbidden

```ts
// FORBIDDEN — raw SQL string
const rows = await db.execute(
  `SELECT * FROM workouts WHERE user_id = '${userId}'`
); // ❌ also a SQL injection waiting to happen

// FORBIDDEN — sql template tag for full queries
import { sql } from "drizzle-orm";
const rows = await db.execute(sql`SELECT * FROM workouts WHERE user_id = ${userId}`); // ❌
```

### Why

- Type safety: Drizzle gives you compile-time guarantees that the query matches the schema.
- Schema changes surface as TypeScript errors, not silent runtime breaks.
- No string-concatenation SQL injection risk.
- Consistent query syntax across the codebase.

---

## Rule 4: Users Can ONLY Access Their Own Data

**This is the most important rule in this document.** A logged-in user must NEVER be able to read, write, or even discover data belonging to another user.

### The pattern: every query is scoped to the current user

Every helper function in `/data` MUST:

1. Resolve the current user's ID from the session (server-side only).
2. Include that user ID as a `WHERE` filter on every query that touches user-owned data.

```ts
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

export async function getWorkoutById(workoutId: string) {
  const userId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
  return row ?? null;
}
```

Note: the user ID filter is **always applied alongside** the row identifier. Do not trust an ID supplied from the client to identify a row uniquely — always combine it with the session user ID.

### Forbidden

```ts
// FORBIDDEN — accepts userId as a parameter from the caller
export async function getWorkouts(userId: string) {
  return db.select().from(workouts).where(eq(workouts.userId, userId)); // ❌
}
// A client/page could pass any userId here and read another user's data.

// FORBIDDEN — looks up a row by ID without checking ownership
export async function getWorkoutById(workoutId: string) {
  const [row] = await db.select().from(workouts).where(eq(workouts.id, workoutId));
  return row; // ❌ returns rows belonging to other users
}

// FORBIDDEN — admin/escape hatch helpers that bypass the user filter
export async function getAllWorkouts() {
  return db.select().from(workouts); // ❌
}
```

### Rules of thumb

- The current user's ID **must come from the session**, resolved server-side. Never accept it as a function argument from page/component code.
- Every read AND every mutation (insert, update, delete) on a user-owned table must include the `userId` filter in its `WHERE` clause.
- If a row does not belong to the current user, the helper must return `null` / empty / throw — never the row.
- There are NO "admin" or "internal" exceptions in application code. If you find yourself wanting one, stop and raise it for discussion.

### Why

- Data isolation is a hard security boundary. A single missed `WHERE userId = ?` is a data breach.
- Centralising the check inside `/data` helpers means it cannot be forgotten at a call site.
- Defense in depth: even if a route is misconfigured or a page is accidentally exposed, the data layer still refuses to leak data.

---

## Summary

| Allowed | Forbidden |
|---|---|
| Fetching data in Server Components | Fetching data in client components, route handlers, or server actions |
| Calling helpers from `src/data/` | Inlining `db.select(...)` queries in pages or components |
| Drizzle query builder (`db.select().from(...).where(...)`) | Raw SQL strings or `sql\`...\`` template-tag full queries |
| Resolving `userId` from the session inside the helper | Accepting `userId` as a parameter from the caller |
| `WHERE userId = <session user>` on every user-owned query | Any query on user-owned data without that filter |
