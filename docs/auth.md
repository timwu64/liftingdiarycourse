# Authentication Standards

This document is the **single source of truth** for how authentication is handled in this application. The rules below are mandatory and override any default behavior, general best practice, or prior training knowledge.

This app uses **[Clerk](https://clerk.com/)** as its sole authentication provider (`@clerk/nextjs`). All sign-in, sign-up, session, and user-identity concerns go through Clerk.

---

## Rule 1: Clerk Is the Only Auth Provider

**All authentication in this app MUST go through Clerk.** Rolling a custom auth system, integrating a second provider, or building bespoke session/cookie logic is **strictly prohibited**.

### Forbidden

- Hand-rolled JWT issuing or verification.
- Custom session cookies, password hashing, or login forms backed by your own database.
- Any other auth library (NextAuth/Auth.js, Lucia, Supabase Auth, Firebase Auth, Auth0 SDKs, etc.).
- Storing user credentials (passwords, API keys, OAuth tokens) in our database.

### Required

- Use `@clerk/nextjs` server helpers, client components, and hooks exclusively.
- The user table in our database stores **only** the Clerk `userId` as a foreign key — never email, password, or other identity fields that Clerk already manages.

### Why

- One auth surface to audit. Multiple providers multiply the attack surface and make session semantics ambiguous.
- Clerk handles password hashing, MFA, account recovery, bot protection, and session rotation. Reimplementing any of these is unnecessary risk.
- Schema and middleware stay simple when there is exactly one source of identity.

---

## Rule 2: Resolve User Identity Server-Side via `auth()`

**The current user's identity MUST be resolved server-side using Clerk's `auth()` helper.** Never trust a `userId` supplied by the client in any form — query string, request body, header, cookie, or component prop.

### Required pattern

Wrap Clerk's `auth()` in a single helper at [src/lib/auth.ts](src/lib/auth.ts) and import that everywhere:

```ts
// src/lib/auth.ts
import { auth } from "@clerk/nextjs/server";

export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
```

Use it inside Server Components and `/data` helpers:

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
// FORBIDDEN — userId passed in from a page or client
export async function getWorkouts(userId: string) {
  return db.select().from(workouts).where(eq(workouts.userId, userId));
}

// FORBIDDEN — reading userId from a header, cookie, or request body manually
const userId = request.headers.get("x-user-id");

// FORBIDDEN — calling Clerk's `auth()` from a client component
"use client";
import { auth } from "@clerk/nextjs/server"; // server-only import in a client file
```

### Why

- A client-supplied `userId` can be tampered with. The session is the only trustworthy identity source.
- A single helper means there is one place to add logging, error handling, or stricter checks later.
- This rule is the foundation of [Rule 4 in `data-fetching.md`](data-fetching.md) — every per-user query depends on it.

---

## Rule 3: Use `currentUser()` Only When You Need User Profile Fields

`auth()` returns the session (`userId`, `sessionId`, `orgId`). `currentUser()` makes an extra call to fetch the full Clerk user object (email, name, image, metadata).

### Required

- Use `auth()` whenever you only need the `userId` — i.e. for database queries. This is the common case.
- Use `currentUser()` only when you need to render or read profile fields that are not in your own database.

```ts
// Profile page that displays the user's name and email
import { currentUser } from "@clerk/nextjs/server";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return <p>{user.firstName} ({user.emailAddresses[0]?.emailAddress})</p>;
}
```

### Forbidden

```ts
// FORBIDDEN — calling currentUser() just to get the userId
const user = await currentUser();
const rows = await db.select().from(workouts).where(eq(workouts.userId, user.id));
```

### Why

- `currentUser()` triggers an extra fetch to Clerk's API on every call. `auth()` reads the verified session token and is effectively free.
- Mixing the two leads to unnecessary latency on hot paths.

---

## Rule 4: Route Protection Lives in `src/proxy.ts`

This project uses the Next.js 16 `proxy.ts` file (the renamed `middleware.ts`) with Clerk's `clerkMiddleware`. It is the single place where route-level auth gates are configured.

### Required

- Public routes (sign-in, sign-up, marketing pages) must be declared via Clerk's `createRouteMatcher` and the `auth.protect()` pattern inside `clerkMiddleware`.
- All other routes are protected by default — do not duplicate auth checks at the page level just to "be safe".
- Update [src/proxy.ts](src/proxy.ts) when adding new public routes; never check auth in `layout.tsx` files as a substitute.

```ts
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Forbidden

- Adding a `middleware.ts` file. This Next.js version uses `proxy.ts`.
- Re-implementing auth checks per page (`if (!userId) redirect("/sign-in")`) when middleware would handle it.
- Disabling the `proxy.ts` matcher to "simplify" routing.

### Why

- Centralised gating means a new page is protected by default — you cannot forget to add an auth check.
- Page-level redirects scattered across the app drift out of sync over time.
- A single matcher is also the single place to audit which routes are public.

---

## Rule 5: Wrap the App in `<ClerkProvider>`

The root [src/app/layout.tsx](src/app/layout.tsx) must wrap `{children}` in `<ClerkProvider>` so that Clerk's client hooks (`useUser`, `useAuth`, `<UserButton />`, etc.) work in client components.

```tsx
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

Do not introduce additional providers wrapping `<ClerkProvider>` that intercept or replace its context.

---

## Rule 6: Use Clerk's Built-in UI Components

Sign-in, sign-up, and user-menu UI must use Clerk's pre-built components. Building custom forms that POST to Clerk's API is **strictly prohibited**.

### Required

```tsx
import { SignIn, SignUp, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

// app/sign-in/[[...sign-in]]/page.tsx
export default function SignInPage() {
  return <SignIn />;
}

// In a header
<SignedIn>
  <UserButton />
</SignedIn>
<SignedOut>
  <a href="/sign-in">Sign in</a>
</SignedOut>
```

### Forbidden

- Hand-rolled `<form>` elements that submit credentials to Clerk's REST API.
- Custom "sign out" buttons that clear cookies manually instead of calling Clerk's `<SignOutButton />` or `signOut()` from `useClerk()`.

### Why

- Clerk's components handle MFA, social login, error states, captcha, password recovery, and accessibility out of the box. Reimplementing any of this is unnecessary risk.
- This is consistent with [`docs/ui.md`](ui.md): UI elements come from a single, audited component set (shadcn for general UI, Clerk for auth UI).

### Note on shadcn

`docs/ui.md` requires shadcn for general UI. **Auth UI is the documented exception** — Clerk's components own the auth surface. Do not try to rebuild Clerk's flows on top of shadcn primitives.

---

## Rule 7: Server Actions and Mutations Must Re-check Identity

Server actions run on the server but are still invoked by the client. They must resolve `userId` themselves and apply it to every mutation — never trust an ID embedded in form data.

### Required

```ts
"use server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function deleteWorkout(workoutId: string) {
  const userId = await getCurrentUserId();
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}
```

### Forbidden

```ts
// FORBIDDEN — userId comes from the form / client
export async function deleteWorkout(workoutId: string, userId: string) {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

### Why

- A server action is a public RPC endpoint. The argument list is attacker-controlled.
- Combining the row identifier with the session `userId` in a single `WHERE` clause is the same defense pattern enforced for reads in `data-fetching.md` Rule 4.

---

## Rule 8: Environment Variables and Secrets

Clerk requires two keys, set via environment variables:

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public — shipped to the browser | Used by client components and Clerk's UI widgets |
| `CLERK_SECRET_KEY` | **Secret — server only** | Used by `auth()`, `currentUser()`, and middleware |

### Required

- Store both keys in `.env.local` for development and in the host's secret manager for production.
- `.env.local` is git-ignored — verify before committing.

### Forbidden

- Logging, exposing, or hardcoding `CLERK_SECRET_KEY` in any file under `src/`.
- Reading `CLERK_SECRET_KEY` from a client component (`"use client"`).
- Renaming the publishable key without the `NEXT_PUBLIC_` prefix — Next.js will not expose it to the browser without it.

---

## Summary

| Allowed | Forbidden |
|---|---|
| `@clerk/nextjs` for all auth concerns | NextAuth, Lucia, custom JWTs, hand-rolled sessions |
| `auth()` server-side to resolve `userId` | Reading `userId` from headers, cookies, body, or props |
| `currentUser()` only when profile fields are needed | `currentUser()` as a heavier substitute for `auth()` |
| Route gating in `src/proxy.ts` via `clerkMiddleware` | Per-page auth checks; adding a `middleware.ts` file |
| `<ClerkProvider>` at the root layout | Wrapping providers that intercept Clerk's context |
| Clerk's `<SignIn>`, `<SignUp>`, `<UserButton>` | Custom auth forms that POST to Clerk's API |
| Server actions that call `getCurrentUserId()` | Server actions that accept `userId` as an argument |
| `CLERK_SECRET_KEY` in `.env.local` / secret store | Hardcoded keys, secret keys read in client components |
