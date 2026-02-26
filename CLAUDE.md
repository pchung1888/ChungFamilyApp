# ChungFamilyApp - Project Conventions

## Overview
Family travel & expense tracker for the Chung family.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Prisma ORM
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Package Manager:** npm

## Development Environment
Windows 11 + Git Bash. Production target is Linux (Vercel/Railway).
For shell syntax, Windows workarounds, and build validation rules, see [docs/BUILD.md](docs/BUILD.md).

## Code Conventions
For TypeScript rules, API route format, component guidelines, file naming, and project structure, see [docs/TYPESCRIPT.md](docs/TYPESCRIPT.md).

## Database
PostgreSQL via Prisma. For Prisma conventions and connection details, see [docs/DATABASE.md](docs/DATABASE.md).

## Testing
Vitest + happy-dom + Testing Library. For setup, scripts, mocks, and known quirks, see [docs/TESTING.md](docs/TESTING.md).

## Session Management
When the session context is getting long (approaching limits or >90% usage), **proactively stop and create a handoff summary** before running out. Include:
1. **What's done** — completed phases/steps with commit hashes
2. **What's in progress** — current step, any half-done work
3. **What's next** — remaining steps with a copy-paste prompt for the next session
4. **Key files** — files that were created/modified this session
5. Ask the user to start a new session with the provided prompt

Do NOT wait until the session fails. Stop at a clean checkpoint (after a commit or between steps) and hand off cleanly.

## Git Workflow
For commit conventions and `.gitignore` patterns, see [docs/GIT.md](docs/GIT.md).

## Plan Mode
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Agents
For the test-and-review agent — when to trigger it and what it does — see [docs/AGENTS.md](docs/AGENTS.md).
