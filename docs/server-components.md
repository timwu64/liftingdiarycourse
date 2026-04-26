# Server Component Standards

This document is the **single source of truth** for how Server Components are written in this application. The rules below are mandatory and override any default behavior, general best practice, or prior training knowledge.

This project uses **Next.js 16** with the App Router. In this version, dynamic route segments and search parameters are **asynchronous** — they are delivered as Promises and **must be awaited**.

These rules complement [`docs/data-fetching.md`](data-fetching.md), [`docs/auth.md`](auth.md), and [`docs/data-mutations.md`](data-mutations.md). Read all four before writing server-rendered route code.

---

## Rule 1: `params` Is a Promise — Always `await` It

**`params` passed to a `page.tsx`, `layout.tsx`, `route.ts`, or `generateMetadata` MUST be typed as `Promise<...>` and awaited before use.** Synchronous access to `params` is **strictly prohibited**.

In Next.js 16, dynamic route segments are exposed asynchronously so the framework can render the static shell of a page before the segment values are resolved. Treating `params` as a synchronous object is a breaking-change error from earlier Next.js versions and will fail at runtime.

### Required pattern

```tsx
// src/app/dashboard/workout/[workoutId]/page.tsx
interface PageProps {
  params: Promise<{ workoutId: string }>;
}

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  // ...use workoutId
}
```

For multi-segment routes, every dynamic segment lives on the same awaited object:

```tsx
// src/app/[org]/projects/[projectId]/page.tsx
interface PageProps {
  params: Promise<{ org: string; projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { org, projectId } = await params;
  // ...
}
```

### Forbidden

```tsx
// FORBIDDEN — params typed as a plain object (pre-Next.js 15 pattern)
interface PageProps {
  params: { workoutId: string };
}
export default async function Page({ params }: PageProps) {
  const id = params.workoutId; // ❌ runtime error in Next.js 15+
}

// FORBIDDEN — destructuring params directly in the function signature
export default async function Page({
  params: { workoutId },
}: {
  params: { workoutId: string };
}) {
  // ❌ skips the await
}

// FORBIDDEN — using `.then` to "avoid" awaiting
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => <Content id={id} />); // ❌
}
```

### Why

- Next.js 16 renders a static shell before runtime params are resolved. A synchronous `params.workoutId` access bypasses that boundary and either crashes or silently returns `undefined`.
- A single, predictable shape (`Promise<{ ... }>`) means every page reads the same way — no mix of sync and async access scattered across the codebase.
- TypeScript catches misuse at compile time when the prop is typed as a Promise: `params.workoutId` becomes a type error instead of a hidden runtime bug.

---

## Rule 2: `searchParams` Is Also a Promise — Always `await` It

The same rule applies to `searchParams` on `page.tsx`. Type it as `Promise<...>` and await it.

### Required pattern

```tsx
// src/app/dashboard/page.tsx
interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { date } = await searchParams;
  // ...
}
```

### Forbidden

```tsx
// FORBIDDEN — searchParams typed as a plain object
export default async function Page({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date; // ❌
}
```

### Why

- Same reason as Rule 1: search params are runtime data and the framework defers them so the static shell can render first.
- Keeping `params` and `searchParams` consistently async means there is one mental model for "route inputs" instead of two.

---

## Rule 3: Server Components Are the Default — Add `"use client"` Only When Needed

Every file under `src/app/` is a **Server Component by default**. Do not add `"use client"` unless the component genuinely needs client-side capabilities.

### A component needs `"use client"` only if it uses

- React state (`useState`, `useReducer`)
- Effects (`useEffect`, `useLayoutEffect`)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers attached to DOM elements (`onClick`, `onChange`, `onSubmit`)
- Client-side hooks (`useRouter`, `useSearchParams`, `usePathname`, `useTransition`)

If none of the above apply, the component **must** remain a Server Component.

### Required pattern

```tsx
// src/app/dashboard/workout/[workoutId]/page.tsx — Server Component (no directive)
import EditWorkoutForm from "./EditWorkoutForm";

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  const workout = await getWorkoutById(workoutId);
  return <EditWorkoutForm workout={workout} />;
}
```

```tsx
// src/app/dashboard/workout/[workoutId]/EditWorkoutForm.tsx — Client Component
"use client";

import { useState, useTransition } from "react";
// ...
```

### Forbidden

```tsx
// FORBIDDEN — "use client" added to a page that does no client work
"use client";
export default function Page() {
  return <h1>Static heading</h1>; // ❌ no client features used
}

// FORBIDDEN — "use client" at the top of a layout or page that fetches data
"use client";
export default async function DashboardPage() {
  const data = await getWorkouts(); // ❌ violates data-fetching.md Rule 1
}
```

### Why

- Server Components keep secrets, queries, and large dependencies on the server — they never ship to the browser.
- Sprinkling `"use client"` at the top of a route file pulls the entire subtree into the client bundle and disables server-only patterns (direct DB access, server actions called as functions, etc.).
- The right boundary is: Server Component fetches data → passes plain props down → Client Component owns interactivity.

---

## Rule 4: Pass Plain, Serializable Props Across the Server/Client Boundary

When a Server Component renders a Client Component, the props are serialized over the boundary. **Only serializable values may cross it.**

### Allowed prop types

- Primitives: `string`, `number`, `boolean`, `null`, `undefined`
- Plain objects and arrays of the above
- `Date` objects (Next.js serializes these)
- Server Actions (functions marked `"use server"`)

### Forbidden prop types

- Class instances (other than `Date`)
- Functions that are not Server Actions
- React elements that close over server-only state in a way that cannot be serialized
- Database connection objects, Drizzle query builders, Clerk client instances

### Why

- The serialization boundary is a hard runtime check. Passing a non-serializable value crashes the render with an unhelpful stack.
- Keeping the boundary clean also keeps the data shape obvious — a reviewer can tell what a Client Component actually depends on by reading its prop types.

---

## Rule 5: Handle Missing Rows With `notFound()`

When a Server Component looks up a row by ID (e.g. inside a `[workoutId]` route) and the helper returns `null`, call `notFound()` from `next/navigation`. Do not render an empty UI or throw a generic error.

### Required pattern

```tsx
import { notFound } from "next/navigation";
import { getWorkoutById } from "@/data/workouts";

export default async function EditWorkoutPage({ params }: PageProps) {
  const { workoutId } = await params;
  const workout = await getWorkoutById(workoutId);
  if (!workout) notFound();

  return <EditWorkoutForm workout={workout} />;
}
```

### Forbidden

```tsx
// FORBIDDEN — silent empty state for a missing row
if (!workout) return <p>Workout not found</p>; // ❌

// FORBIDDEN — throwing a generic error
if (!workout) throw new Error("not found"); // ❌
```

### Why

- `notFound()` triggers the framework's 404 boundary, which renders the nearest `not-found.tsx` and returns the correct HTTP status. Silent empty states return 200 to crawlers and break SEO/analytics.
- Combined with the user-scoped lookups in [`docs/data-fetching.md`](data-fetching.md) Rule 4, a missing-or-not-yours row is indistinguishable from a non-existent one — both correctly produce a 404.

---

## Summary

| Allowed | Forbidden |
|---|---|
| `params: Promise<{ ... }>` typed and awaited | `params: { ... }` typed as a plain object, accessed synchronously |
| `searchParams: Promise<{ ... }>` typed and awaited | `searchParams: { ... }` typed as a plain object |
| Server Components by default; `"use client"` only when needed | `"use client"` on pages or components that do no client work |
| Plain serializable props across the server/client boundary | Class instances, query builders, or non-action functions as props |
| `notFound()` for missing rows in dynamic routes | Silent empty UI or generic `throw new Error(...)` for missing rows |
