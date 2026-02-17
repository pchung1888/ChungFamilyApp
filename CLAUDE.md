# ChungFamilyApp - Project Conventions

## Overview
Family travel & expense tracker for the Chung family. Built with Next.js 16 (App Router), TypeScript, Prisma + PostgreSQL, Tailwind CSS v4, and shadcn/ui.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Package Manager:** npm

## Code Conventions

### TypeScript
- Always use explicit return types on functions
- Use `interface` for object shapes, `type` for unions/intersections
- No `any` — use `unknown` if the type is truly unknown

### API Routes (Next.js Route Handlers)
- All API routes return `{ data, error }` format:
  ```typescript
  // Success
  return NextResponse.json({ data: result, error: null });
  // Error
  return NextResponse.json({ data: null, error: "Description" }, { status: 400 });
  ```
- Place route handlers in `src/app/api/`

### Prisma
- Always import from `@/lib/prisma` (singleton pattern)
- Never create new `PrismaClient()` instances elsewhere
- Run `npx prisma migrate dev --name <description>` after schema changes

### Components
- Use shadcn/ui components from `src/components/ui/`
- If shadcn/ui causes issues, fall back to plain Tailwind classes
- Client components must have `"use client"` directive at top

### Build Validation
- Run `npm run typecheck` after completing each logical sub-step within a phase:
  - After writing API routes
  - After writing a page component
  - After writing form/UI components
- Fix TypeScript errors immediately — do not accumulate errors across multiple files
- Exception: schema migration (`npx prisma migrate dev`) — Prisma validates this step itself
- Note: Both `npm run dev` and `npm run build` use webpack (not Turbopack) to avoid a Windows junction point bug with Prisma — Turbopack panics trying to create symlinks for `@prisma/client`

### File Naming
- Files: kebab-case (`family-form.tsx`, `credit-card-list.tsx`)
- Components: PascalCase (`FamilyForm`, `CreditCardList`)
- API routes: `route.ts` inside descriptive folders

### Project Structure
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

## Database
- Local: `postgresql://postgres:Password0@localhost:5432/chungfamilyapp`
- Connection string in `.env` (git-ignored)

## Session Management
When the session context is getting long (approaching limits or >90% usage), **proactively stop and create a handoff summary** before running out. Include:
1. **What's done** — completed phases/steps with commit hashes
2. **What's in progress** — current step, any half-done work
3. **What's next** — remaining steps with a copy-paste prompt for the next session
4. **Key files** — files that were created/modified this session
5. Ask the user to start a new session with the provided prompt

Do NOT wait until the session fails. Stop at a clean checkpoint (after a commit or between steps) and hand off cleanly.

## Git Workflow
- Commit after each phase is complete
- Descriptive commit messages
- Never commit `.env` or `prisma/dev.db`
- **`.gitignore` maintenance:** When adding new tools, dependencies, or generated files to the project, update `.gitignore` accordingly. Key ignored patterns:
  - `node_modules/`, `.next/`, `build/`, `dist/` — build artifacts
  - `.env*` — all environment variable files (secrets, DB credentials)
  - `prisma/dev.db*` — local SQLite files (if ever used)
  - `coverage/` — test coverage reports
  - OS/IDE files: `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/*`
