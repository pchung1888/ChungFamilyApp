Add a new entity to ChungFamilyApp following the project's standard CRUD pattern.

Entity to add: $ARGUMENTS

Follow this exact sequence. Do NOT skip steps or batch them — each sub-step has a typecheck.

---

## Step 1 — Schema
- Read `prisma/schema.prisma` to understand existing model naming conventions
- Add the new model with: `id String @id @default(cuid())`, required fields, optional fields with `?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Add foreign key relations to existing models where appropriate (e.g. `familyMemberId`, `creditCardId`)
- Run: `npx prisma migrate dev --name add-<entity-name-kebab-case>`
- (No typecheck needed — Prisma validates the schema itself)

## Step 2 — API Routes
- Create `src/app/api/<entity>/route.ts` with GET (list, ordered by createdAt asc) and POST (create with validation)
- Create `src/app/api/<entity>/[id]/route.ts` with PATCH (partial update) and DELETE
- All routes must return `{ data, error }` format per CLAUDE.md
- **Run: `npm run typecheck` — fix all errors before continuing**

## Step 3 — Form Component
- Create `src/components/<entity>/<entity>-form.tsx`
- Must be a `"use client"` component
- Use shadcn/ui: Input, Label, Select (for enum fields), Button
- Handle both create (no `member` prop) and edit (with `member` prop) in the same component
- Props: `{ item?, onSuccess, onCancel }`
- **Run: `npm run typecheck` — fix all errors before continuing**

## Step 4 — Page
- Create `src/app/<entity>/page.tsx`
- Must be a `"use client"` component
- Use shadcn/ui Card grid for the list, Dialog for Add/Edit modals
- Include: loading state, empty state, member count, Add button, Edit button per card, Remove button with `confirm()`
- Fetch data from the API routes (not Prisma directly — pages use the API)
- **Run: `npm run typecheck` — fix all errors before continuing**

## Step 5 — Commands doc
- Update or create `commands/<entity>.md` with curl examples: list, create (with realistic Chung family example data), update, delete
- Follow the format in `commands/family.md`

## Step 6 — Commit
- Stage all new/modified files (exclude `.env`)
- Commit message: `"Phase X: <Entity> CRUD"` with bullet points summarizing what was built
