# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Coding Standards — Read This First

**Before generating any code, always check the `/docs` directory for a relevant standards file and follow it exactly.**

| Topic | Standards file |
|---|---|
| UI components, date formatting, theming | `docs/ui.md` |

These documents are the source of truth for how code must be written in this project. If a standards file covers the area you are working in, its rules override any default behavior or general best practice.

- /docs/ui.md 
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
