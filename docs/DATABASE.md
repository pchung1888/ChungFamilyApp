# Database & Prisma

## Prisma Conventions
- Always import from `@/lib/prisma` (singleton pattern)
- Never create new `PrismaClient()` instances elsewhere
- Run `npx prisma migrate dev --name <description>` after schema changes

## Connection
- Local: `postgresql://postgres:Password0@localhost:5432/chungfamilyapp`
- Connection string in `.env` (git-ignored)

## Notes
- Prisma 6.x generates client to `src/generated/prisma/client`
  Import from `@/generated/prisma/client`, not `@/generated/prisma`
- `prisma/schema.prisma` is the single source of truth for the schema
