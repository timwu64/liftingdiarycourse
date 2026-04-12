# UI Coding Standards

## Rule: Use shadcn/ui Components Only

All UI elements in this project **must** use [shadcn/ui](https://ui.shadcn.com/) components. Creating custom UI components is **strictly prohibited**.

---

## Why

- Consistency — every piece of UI draws from a single design system.
- Maintainability — shadcn components are well-documented and follow established patterns.
- Speed — no time spent designing or debugging bespoke components.

---

## What This Means in Practice

### Do this

Install the shadcn component you need, then import and use it:

```bash
npx shadcn@latest add <component-name>
```

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";

export function MyForm() {
  return (
    <form>
      <Input type="text" placeholder="Enter value" />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Do NOT do this

```tsx
// FORBIDDEN — custom component
export function MyButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-md bg-primary px-4 py-2 text-white">
      {children}
    </button>
  );
}

// FORBIDDEN — raw HTML element styled with Tailwind as a substitute for a shadcn component
<input
  type="date"
  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
/>
```

---

## Component Location

shadcn components are installed into `src/components/ui/`. Do not add files to this directory manually — only the shadcn CLI should write here.

---

## Adding a New Component

1. Check the [shadcn/ui component list](https://ui.shadcn.com/docs/components) to confirm the component exists.
2. Run the install command:
   ```bash
   npx shadcn@latest add <component-name>
   ```
3. Import from `@/components/ui/<component-name>`.

If shadcn does not have a component for your use case, raise it for discussion **before** writing any custom UI code.

---

## Composition Is Allowed

You may compose multiple shadcn components together inside a page or feature file. What is not allowed is wrapping them in a new, reusable component that reimplements UI logic outside of shadcn.

```tsx
// OK — composing shadcn components inline in a page
<Card>
  <CardHeader>
    <CardTitle>Workout Log</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Exercise name" />
    <Button>Add Set</Button>
  </CardContent>
</Card>
```

---

## Date Formatting

All dates must be formatted using [date-fns](https://date-fns.org/). Do not use `Date.prototype.toLocaleDateString()`, `Intl.DateTimeFormat`, manual string manipulation, or any other date formatting approach.

### Install

```bash
npm install date-fns
```

### Required Format

Dates displayed in the UI must follow this format:

```
1st Sep 2025
2nd Aug 2025
3rd Jan 2026
4th Jun 2024
```

This is: **ordinal day · abbreviated month · 4-digit year** — no commas, no leading zeros on the day.

### How to Produce This Format

date-fns does not have a built-in ordinal day token, so use `format` together with `getDate` and a small helper:

```ts
import { format, getDate } from "date-fns";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function formatDate(date: Date): string {
  return `${ordinal(getDate(date))} ${format(date, "MMM yyyy")}`;
}
```

Usage:

```tsx
import { formatDate } from "@/lib/dates";

<p>{formatDate(new Date(workout.date))}</p>
```

Place the `ordinal` helper and `formatDate` function in `src/lib/dates.ts` so they are shared across the project.

### Do NOT do this

```tsx
// FORBIDDEN — native JS formatting
date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// FORBIDDEN — manual string building without date-fns
`${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;

// FORBIDDEN — wrong format (ISO, US, or other)
format(date, "MM/dd/yyyy");
format(date, "yyyy-MM-dd");
format(date, "MMMM d, yyyy");
```

---

## Theming and Styling

- All design tokens (colors, radius, spacing) are defined via CSS variables in `src/app/globals.css` using Tailwind v4's `@theme` directive.
- Do not add one-off color values or hardcoded hex codes in component markup.
- Use the semantic token classes (`bg-primary`, `text-muted-foreground`, `border-border`, etc.) that shadcn and the theme expose.
- Dark mode is supported via the `.dark` class variant — do not use `prefers-color-scheme` media queries directly.

---

## Summary

| Allowed | Forbidden |
|---|---|
| shadcn/ui components from `src/components/ui/` | Custom React components that render UI |
| Composing shadcn components inside pages/features | Raw HTML elements styled with Tailwind as component replacements |
| Tailwind semantic token classes for styling | Hardcoded color values or arbitrary Tailwind values for UI |
| shadcn CLI to install new components | Manually writing files in `src/components/ui/` |
| `date-fns` for all date formatting | `toLocaleDateString`, `Intl.DateTimeFormat`, manual string building |
| Ordinal day + abbreviated month + 4-digit year | ISO dates, US format, or any other date display format |
