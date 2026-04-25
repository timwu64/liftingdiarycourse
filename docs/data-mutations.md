# Data Mutation Standards

This document is the **single source of truth** for how data is mutated (inserted, updated, deleted) in this application. The rules below are mandatory and override any default behavior, general best practice, or prior training knowledge.

These rules complement [`docs/data-fetching.md`](data-fetching.md) (reads) and [`docs/auth.md`](auth.md) (identity). Read all three before writing mutation code.

---

## Rule 1: All Mutations Run Through `/data` Helper Functions

**Every database mutation MUST go through a helper function in [src/data/](src/data/).** Server actions never call `db.insert(...)`, `db.update(...)`, or `db.delete(...)` directly.

### Required pattern

```ts
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

export async function createWorkout(input: { name: string; startedAt: Date }) {
  const userId = await getCurrentUserId();
  const [row] = await db
    .insert(workouts)
    .values({ userId, name: input.name, startedAt: input.startedAt })
    .returning();
  return row;
}

export async function deleteWorkout(workoutId: string) {
  const userId = await getCurrentUserId();
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}
```

### Forbidden

```ts
// FORBIDDEN — db call inlined in a server action
"use server";
export async function createWorkout(input: { name: string; startedAt: Date }) {
  await db.insert(workouts).values({ ... });
}

// FORBIDDEN — db call inlined in a route handler or page
export default async function Page() {
  await db.delete(workouts).where(...);
  ...
}
```

### Why

- Same reasoning as [`data-fetching.md` Rule 2](data-fetching.md): one audited surface for every query, schema refactors touch one file, reviewers can confirm authorization logic by reading `/data` alone.
- Reads and writes for the same entity live next to each other, so it is easy to spot a mutation that lacks the user filter that the read already enforces.

---

## Rule 2: All `/data` Mutations Use Drizzle ORM

**Mutations must use [Drizzle ORM](https://orm.drizzle.team/).** Raw SQL strings or the `sql\`...\`` template tag for full mutation queries are **strictly prohibited** — same rule as [`data-fetching.md` Rule 3](data-fetching.md).

### Required

```ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

await db
  .update(workouts)
  .set({ name: input.name })
  .where(and(eq(workouts.id, input.id), eq(workouts.userId, userId)));
```

### Forbidden

```ts
// FORBIDDEN — raw SQL string (also a SQL injection waiting to happen)
await db.execute(`UPDATE workouts SET name = '${input.name}' WHERE id = '${input.id}'`);

// FORBIDDEN — sql template tag for a full mutation
import { sql } from "drizzle-orm";
await db.execute(sql`UPDATE workouts SET name = ${input.name} WHERE id = ${input.id}`);
```

---

## Rule 3: All Mutations Are Invoked Via Server Actions in `actions.ts`

**Mutations are triggered exclusively by Next.js Server Actions.** Server actions live in files named `actions.ts`, **colocated** with the route or feature that uses them.

### Required structure

```
src/app/dashboard/
├── page.tsx
├── DatePicker.tsx
└── actions.ts        # server actions for the dashboard route

src/app/workouts/[id]/
├── page.tsx
├── EditForm.tsx
└── actions.ts        # server actions for the workout detail route
```

### Required pattern

```ts
// src/app/dashboard/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createWorkout, deleteWorkout } from "@/data/workouts";

const createWorkoutInput = z.object({
  name: z.string().min(1).max(120),
  startedAt: z.coerce.date(),
});

export async function createWorkoutAction(input: z.infer<typeof createWorkoutInput>) {
  const parsed = createWorkoutInput.parse(input);
  const workout = await createWorkout(parsed);
  revalidatePath("/dashboard");
  return workout;
}

const deleteWorkoutInput = z.object({ id: z.string().uuid() });

export async function deleteWorkoutAction(input: z.infer<typeof deleteWorkoutInput>) {
  const { id } = deleteWorkoutInput.parse(input);
  await deleteWorkout(id);
  revalidatePath("/dashboard");
}
```

### Forbidden

- Mutations triggered from a route handler (`app/**/route.ts`).
- Mutations triggered from a client component via direct `fetch()` to your own API.
- Server actions defined inline at the top of a `page.tsx` or component file.
- A single shared `src/actions/` folder. Actions live next to the route that owns them.
- Any filename other than `actions.ts` (e.g. `server-actions.ts`, `mutations.ts`).

### Why

- Colocation makes the mutations available to a route obvious from the directory listing.
- A consistent filename means reviewers can find every mutation entry point in the app with `find . -name actions.ts`.
- Server actions get free CSRF protection, automatic serialization, and integration with `revalidatePath` / `revalidateTag` — using `route.ts` for mutations forfeits all of this.

---

## Rule 4: Server Action Parameters Must Be Typed Objects — Never `FormData`

**Every server action MUST accept a typed object as its parameter.** The `FormData` type is **strictly prohibited** as a parameter type.

### Required

```ts
// Single typed object parameter — preferred
export async function updateWorkoutAction(input: { id: string; name: string }) {
  ...
}

// Multiple typed primitive parameters are also fine for simple actions
export async function deleteWorkoutAction(id: string) {
  ...
}
```

### Forbidden

```ts
// FORBIDDEN — FormData parameter
export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name") as string;
  ...
}

// FORBIDDEN — `any`, `unknown`, or untyped parameters
export async function createWorkoutAction(input: any) { ... }
export async function createWorkoutAction(input) { ... }
```

### Calling from a client component

Pass a plain object. Convert form values into a typed object on the client before calling:

```tsx
"use client";
import { createWorkoutAction } from "./actions";

function CreateWorkoutForm() {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createWorkoutAction({
      name: String(form.get("name") ?? ""),
      startedAt: new Date(String(form.get("startedAt") ?? "")),
    });
  }
  return <form onSubmit={onSubmit}>...</form>;
}
```

### Why

- A typed object is checked at compile time: if the shape changes, every call site is a TypeScript error.
- `FormData` parameters force every action to manually `.get("field") as string` and lose all type information at the boundary — exactly the bugs we want compile-time errors for.
- Plain-object payloads are also far easier to test and to call from non-form contexts (a button handler, an effect, another action).

---

## Rule 5: Every Server Action Validates Its Input With Zod

**Every server action MUST validate its input using a [zod](https://zod.dev/) schema before doing any work.** Validation runs first, before authorization, mutation, or revalidation.

Even though parameters are typed (Rule 4), TypeScript types are erased at runtime. A server action is a public RPC endpoint — its argument list is attacker-controlled and must be validated as untrusted input.

### Install

```bash
npm install zod
```

### Required pattern

Define a schema, derive the parameter type from it with `z.infer`, and call `.parse()` (or `.safeParse()`) at the top of the action.

```ts
// src/app/dashboard/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(120),
  startedAt: z.coerce.date(),
});

export async function createWorkoutAction(input: z.infer<typeof createWorkoutSchema>) {
  const data = createWorkoutSchema.parse(input);
  const workout = await createWorkout(data);
  revalidatePath("/dashboard");
  return workout;
}
```

### Forbidden

```ts
// FORBIDDEN — no validation, trusts the typed signature at runtime
export async function createWorkoutAction(input: { name: string; startedAt: Date }) {
  return createWorkout(input);
}

// FORBIDDEN — manual ad-hoc validation
export async function createWorkoutAction(input: { name: string }) {
  if (!input.name || input.name.length > 120) throw new Error("bad name");
  return createWorkout(input);
}

// FORBIDDEN — validating only some fields
export async function updateWorkoutAction(input: { id: string; name: string }) {
  z.string().uuid().parse(input.id); // misses input.name
  return updateWorkout(input);
}
```

### Recommended: keep schemas next to the action

Place each schema in the same `actions.ts` file as the action that uses it, unless it is shared by multiple actions in the same feature, in which case put it in a sibling `schemas.ts`. Do not add a global `src/schemas/` folder.

### Why

- TypeScript types vanish at runtime. Without validation, malformed clients (or malicious ones) can pass payloads that violate the schema's invariants and crash the database call or corrupt data.
- One validator per action, defined right next to it, means the contract is documented in code and a reader can audit the boundary in one place.
- `z.infer` keeps the parameter type and the runtime check in sync — if you change the schema, the type changes too.

---

## Mutation Authorization Reminder

Server actions are public RPC endpoints. Every mutation MUST:

1. **Validate** with zod (this document, Rule 5).
2. **Resolve `userId` from the session** via `getCurrentUserId()` — see [`docs/auth.md`](auth.md) Rule 2. Never accept `userId` as an argument.
3. **Scope the mutation to the current user** by combining the row identifier and `userId` in the `WHERE` clause — see [`docs/data-fetching.md`](data-fetching.md) Rule 4.

```ts
// src/data/workouts.ts
export async function updateWorkout(input: { id: string; name: string }) {
  const userId = await getCurrentUserId();
  const [row] = await db
    .update(workouts)
    .set({ name: input.name })
    .where(and(eq(workouts.id, input.id), eq(workouts.userId, userId)))
    .returning();
  return row ?? null;
}
```

---

## Summary

| Allowed | Forbidden |
|---|---|
| Mutations through helpers in `src/data/` | `db.insert`/`db.update`/`db.delete` inlined in actions, pages, or routes |
| Drizzle ORM query builder for inserts/updates/deletes | Raw SQL strings or `sql\`...\`` for full mutations |
| Server actions in colocated `actions.ts` files | Mutations from `route.ts`, client `fetch`, or inline action definitions |
| Filename `actions.ts` next to the route that uses it | A global `src/actions/` folder, or other filenames |
| Typed object parameters (`{ id: string; name: string }`) | `FormData` parameters, `any`, `unknown`, or untyped params |
| Zod schema + `.parse()` at the top of every action | No validation, manual ad-hoc checks, partial-field validation |
| `getCurrentUserId()` resolved server-side, scoped `WHERE` | Trusting client-supplied `userId` or row identifier without user scope |
