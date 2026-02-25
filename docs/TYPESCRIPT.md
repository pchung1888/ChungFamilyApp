# TypeScript & Code Conventions

## TypeScript
- Always use explicit return types on functions
- Use `interface` for object shapes, `type` for unions/intersections
- No `any` — use `unknown` if the type is truly unknown

## API Routes (Next.js Route Handlers)
- All API routes return `{ data, error }` format:
  ```typescript
  // Success
  return NextResponse.json({ data: result, error: null });
  // Error
  return NextResponse.json({ data: null, error: "Description" }, { status: 400 });
  ```
- Place route handlers in `src/app/api/`

## Components
- Use shadcn/ui components from `src/components/ui/`
- If shadcn/ui causes issues, fall back to plain Tailwind classes
- Client components must have `"use client"` directive at top

## File Naming
- Files: kebab-case (`family-form.tsx`, `credit-card-list.tsx`)
- Components: PascalCase (`FamilyForm`, `CreditCardList`)
- API routes: `route.ts` inside descriptive folders

## Project Structure
```
src/
  app/           # Pages and API routes (Next.js App Router)
    api/         # API route handlers
  components/    # React components
    ui/          # shadcn/ui base components
  lib/           # Utilities and shared logic
prisma/
  schema.prisma  # Database schema (single source of truth)
```
