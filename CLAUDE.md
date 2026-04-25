# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Coding Standards — Read This First

> **MANDATORY:** Before writing or generating ANY code, you MUST read the relevant standards file(s) in the `/docs` directory. This is not optional — do not skip this step under any circumstances.

**Step 1 — Identify the relevant docs file(s) for the task.**
**Step 2 — Read and internalize the rules in that file.**
**Step 3 — Only then write code, strictly following those rules.**

| Topic | Standards file |
|---|---|
| UI components, date formatting, theming | `docs/ui.md` |
| Data fetching, database queries, user data isolation | `docs/data-fetching.md` |

These documents are the **single source of truth** for how code must be written in this project. Their rules override any default behavior, general best practice, or prior training knowledge. If a standards file covers the area you are working in, follow it exactly — no exceptions.

- /docs/ui.md
- /docs/data-fetching.md
## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint (ESLint 9, flat config via eslint.config.mjs)
```

No test runner is configured yet.

## Architecture

**Stack:** Next.js 16.2.2 · React 19 · TypeScript 5 · Tailwind CSS v4 · App Router

This is a **Next.js App Router** project. All routes live under `src/app/`. The entry layout (`src/app/layout.tsx`) wraps every page with Geist fonts and a flex column body.

**Tailwind v4** is used via the `@tailwindcss/postcss` plugin — there is no `tailwind.config.js`. Configuration (theme, custom utilities) goes in CSS files using `@theme` and `@layer` directives instead.

**ESLint 9** uses the new flat config format in `eslint.config.mjs` — not `.eslintrc.*`.

Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` — this version has breaking API changes from prior Next.js releases.
