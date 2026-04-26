# Routing Standards

This document is the **single source of truth** for how routes are organised and protected in this application. The rules below are mandatory and override any default behavior, general best practice, or prior training knowledge.

This project uses **Next.js 16** with the App Router. All route segments live under [src/app/](src/app/). Route protection is enforced in the Next.js middleware file [src/proxy.ts](src/proxy.ts) (the renamed `middleware.ts` — see [`docs/auth.md`](auth.md) Rule 4).

These rules complement [`docs/auth.md`](auth.md) (identity and Clerk usage) and [`docs/server-components.md`](server-components.md) (how route files are written). Read all three before adding a new page.

---

## Rule 1: All Authenticated App Routes Live Under `/dashboard`

**Every authenticated, signed-in-user-facing page in this application MUST live under the `/dashboard` URL prefix.** No exceptions: feature pages, detail pages, settings, account management, and per-resource sub-pages all belong under [src/app/dashboard/](src/app/dashboard/).

The only routes that may live outside `/dashboard` are:

- The Clerk auth flow routes — `/sign-in/*`, `/sign-up/*`.
- The root `/` route, which exists only to redirect users into the auth flow or into `/dashboard` based on their session state.
- Static framework files (`favicon.ico`, `robots.txt`, `sitemap.xml`, etc.).

### Required structure

```
src/app/
├── layout.tsx              # root layout, wraps everything in <ClerkProvider>
├── page.tsx                # / — landing/redirect only, never a feature page
├── sign-in/[[...sign-in]]/page.tsx
├── sign-up/[[...sign-up]]/page.tsx
└── dashboard/              # ALL authenticated app routes live here
    ├── layout.tsx          # shared chrome (nav, header) for the signed-in app
    ├── page.tsx            # /dashboard — landing page after sign-in
    ├── workout/
    │   ├── new/page.tsx              # /dashboard/workout/new
    │   └── [workoutId]/page.tsx      # /dashboard/workout/:workoutId
    └── settings/page.tsx   # /dashboard/settings
```

### Forbidden

```
src/app/
├── workouts/page.tsx       # ❌ authenticated feature outside /dashboard
├── profile/page.tsx        # ❌ should be /dashboard/profile
└── account/settings/page.tsx  # ❌ should be /dashboard/settings
```

- Adding a top-level segment such as `src/app/workouts/`, `src/app/account/`, or `src/app/profile/` for signed-in features.
- Linking to a signed-in feature with a URL that does not start with `/dashboard/...`.
- Creating a parallel "app" or "console" prefix (e.g. `/app/...`, `/console/...`) — there is exactly one authenticated namespace and it is `/dashboard`.

### Why

- One predictable URL prefix means a reader, an analytics tool, a CDN rule, and the middleware matcher can all answer "is this an authenticated page?" with a simple `pathname.startsWith("/dashboard")` check.
- It keeps the public surface (`/`, `/sign-in`, `/sign-up`) small and easy to audit.
- It collapses the protected-route configuration in [src/proxy.ts](src/proxy.ts) into a single matcher rather than a growing list of feature prefixes that drift out of sync as the app expands.

---

## Rule 2: Route Protection Is Enforced in `src/proxy.ts` — Not in Pages or Layouts

**`/dashboard` and every route nested under it MUST be protected by the Next.js middleware in [src/proxy.ts](src/proxy.ts).** Page-level or layout-level auth checks (`if (!userId) redirect("/sign-in")`) as a substitute for the middleware are **strictly prohibited**.

This rule is the routing-side counterpart of [`docs/auth.md`](auth.md) Rule 4. That rule mandates Clerk's `clerkMiddleware` and `createRouteMatcher`; this rule mandates that the matcher is configured around the `/dashboard` prefix.

### Required pattern

```ts
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

When an unauthenticated request reaches any path matched by `"/dashboard(.*)"`, `auth.protect()` redirects to the configured Clerk sign-in URL. Pages under `/dashboard` can therefore assume a signed-in session and call `getCurrentUserId()` without re-checking.

### Forbidden

```ts
// FORBIDDEN — re-implementing the gate in a layout
// src/app/dashboard/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in"); // ❌ middleware already does this
  return <>{children}</>;
}

// FORBIDDEN — per-page redirect as a "belt and braces" check
// src/app/dashboard/workout/[workoutId]/page.tsx
const { userId } = await auth();
if (!userId) redirect("/sign-in"); // ❌ duplicates the middleware
```

- Adding a `middleware.ts` file. This Next.js version uses `proxy.ts` (see [`docs/auth.md`](auth.md) Rule 4).
- Adding `if (!userId) redirect(...)` to a `layout.tsx` or `page.tsx` under `/dashboard`.
- Removing or narrowing the `"/dashboard(.*)"` matcher to "skip" a sub-route — every `/dashboard/*` path is protected, full stop.
- Calling `auth.protect()` from inside a Server Component or Server Action as a substitute for the middleware gate.

### Why

- The middleware runs **before** any route file is invoked, so an unauthenticated user never reaches a Server Component, never triggers a database query, and never receives a partial render. Page-level redirects have already done work that the user is not entitled to do.
- Centralised protection means a new page added under `/dashboard/...` is automatically gated. A reviewer cannot "forget to add an auth check" — there is no auth check to add.
- A single matcher in one file is also the single place to audit which routes are public; that audit becomes ambiguous when each layout makes its own decision.

---

## Rule 3: Sign-In Is the Only Authentication Entry Point — Use the Configured Clerk Redirect

**The middleware MUST send unauthenticated requests for `/dashboard/*` to the Clerk-managed sign-in flow at `/sign-in`.** Do not hand-roll redirect URLs, and do not redirect to `/` or to a custom landing page as a substitute.

`auth.protect()` already performs this redirect when configured against Clerk's `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (or the default `/sign-in`). Once the user signs in, Clerk returns them to the originally requested `/dashboard/...` URL automatically.

### Required

- Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` in `.env.local` so Clerk's redirects line up with the actual route files.
- Use `<SignedIn>` / `<SignedOut>` (from [`docs/auth.md`](auth.md) Rule 6) in marketing or layout chrome to switch between "Go to dashboard" and "Sign in" links — never read the session manually to decide.

### Forbidden

```ts
// FORBIDDEN — redirecting to a custom URL after middleware blocks the request
if (isProtectedRoute(req) && !userId) {
  return NextResponse.redirect(new URL("/welcome", req.url)); // ❌
}

// FORBIDDEN — sending unauthenticated traffic to "/" instead of the sign-in flow
if (isProtectedRoute(req) && !userId) {
  return NextResponse.redirect(new URL("/", req.url)); // ❌
}
```

### Why

- The Clerk sign-in URL preserves the originally requested `/dashboard/...` path as a return target. Bouncing the user to `/` or `/welcome` discards that intent and makes deep links unusable from email, bookmarks, and shared URLs.
- Keeping the redirect target in Clerk's environment variables (rather than hard-coded inside `proxy.ts`) means the auth flow can be moved (e.g. to a hosted Clerk page) without changing the middleware.

---

## Rule 4: Route Files Under `/dashboard` Trust the Middleware Gate

Because Rule 2 guarantees that no unauthenticated request ever reaches a `/dashboard/*` route file, every Server Component under `src/app/dashboard/` is free to call `getCurrentUserId()` directly and use the returned `userId` without a null/undefined branch.

### Required pattern

```tsx
// src/app/dashboard/page.tsx
import { getCurrentUserId } from "@/lib/auth";
import { getWorkoutsForUser } from "@/data/workouts";

export default async function DashboardPage() {
  const userId = await getCurrentUserId(); // throws if somehow unauthenticated
  const workouts = await getWorkoutsForUser(userId);
  return <WorkoutList workouts={workouts} />;
}
```

`getCurrentUserId()` already throws on missing identity (see [`docs/auth.md`](auth.md) Rule 2). The middleware ensures that throw path is unreachable in normal traffic, and the framework's error boundary handles the impossible case cleanly.

### Forbidden

```tsx
// FORBIDDEN — defensive null check that the middleware has already eliminated
const userId = await getCurrentUserId().catch(() => null);
if (!userId) return <p>Please sign in</p>; // ❌ unreachable; middleware redirected
```

### Why

- The middleware is the contract. Re-checking it in every page is dead code that adds noise and gives readers the false impression that pages can be reached without a session.
- Per [`CLAUDE.md`](../CLAUDE.md) and the project standards generally: do not add error handling for scenarios that cannot happen.

---

## Summary

| Allowed | Forbidden |
|---|---|
| Authenticated routes under `/dashboard/...` only | Top-level segments like `/workouts`, `/profile`, `/app`, `/console` |
| One auth-namespace prefix (`/dashboard`) | Multiple parallel auth namespaces |
| Route protection in [src/proxy.ts](src/proxy.ts) via `clerkMiddleware` + `createRouteMatcher(["/dashboard(.*)"])` | `if (!userId) redirect(...)` in pages or layouts; a `middleware.ts` file |
| `auth.protect()` redirecting to Clerk's `/sign-in` | Hand-rolled redirects to `/`, `/welcome`, or other custom pages |
| Pages under `/dashboard` calling `getCurrentUserId()` directly | Defensive null checks for an unauthenticated session under `/dashboard` |
