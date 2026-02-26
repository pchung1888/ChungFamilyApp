# Build, Shell & Windows Environment

## Development Environment
- **OS:** Windows 11 — NOT macOS, NOT Linux desktop
- **Terminal:** Git Bash (inside VS Code and standalone)
- **Production target:** Linux (Vercel/Railway — not yet configured)
- **CI/CD:** None yet — no GitHub Actions workflows exist

## Shell Rules for AI Sessions

Always generate **Git Bash / Unix syntax**:

| Task | Use | NOT |
|------|-----|-----|
| Delete a folder | `rm -rf ./some-dir` | `rmdir /s /q` or PowerShell |
| Set env variable | `export FOO=bar` | `$env:FOO = 'bar'` |
| Path separator | `/` forward slashes | `\` backslashes |
| Windows tool path | `/c/Program Files/...` | `C:\Program Files\...` |

**Fallback for stubborn Windows deletes** (locked files, long paths):
```bash
cmd //c "rmdir /s /q node_modules"
```

## Windows-Specific Workarounds — Do NOT Change

- `npm run dev` and `npm run build` both pass `--webpack`.
  **Why:** Turbopack crashes on Windows when Prisma creates symlinks for `@prisma/client`.
- PostgreSQL binary: `/c/Program Files/PostgreSQL/18/bin/psql.exe`
  (Git Bash translates `/c/...` → `C:\...` automatically)
- `cmd //c "..."` is used in `.claude/settings.json` for Windows-native commands.

## What Stays Cross-Platform (production runs on Linux)

- All `npm run` scripts — Next.js and Vitest handle OS differences internally
- All TypeScript/JavaScript source files in `src/`
- `prisma/schema.prisma` and migrations

## Build Validation

Run `npm run typecheck` after completing each logical sub-step within a phase:
- After writing API routes
- After writing a page component
- After writing form/UI components

Fix TypeScript errors immediately — do not accumulate errors across multiple files.

**Exception:** schema migration (`npx prisma migrate dev`) — Prisma validates this step itself.
