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

## Long-Running Tasks
For any task spanning 3+ files or phases (e.g., expanding test coverage, refactoring routes):
1. **Before starting** — create `PROGRESS_TRACKER.md` in the repo root:
   ```markdown
   # Progress: <task name>
   ## Target files
   - [ ] path/to/file1
   - [ ] path/to/file2
   ...
   ```
2. **Work autonomously (yolo mode)** — proceed through all files without pausing between them.
3. **Track progress in real-time:**
   - Check off each file in `PROGRESS_TRACKER.md` (`[x]`) as completed
   - **Batch updates to chat** — post a 2–3 line summary every 3–5 files, not after each one
   - Example: `✓ Done: family routes, cards routes, benefits routes — wrote tests and verified pass`
4. **Token discipline** — never repeat file contents in chat; reference paths only. Batch updates keep context lean.
5. **Final summary** — after all files are done, post one summary line and final commit message.
6. **Clean up** — delete `PROGRESS_TRACKER.md` after the final commit.

## Git Workflow
For commit conventions, `.gitignore` patterns, and the **topic-branch worktree model**, see [docs/GIT.md](docs/GIT.md).

Key rules:
- Claude branches: `claude/<N>-<slug>-<suffix>` (always scoped to a topic)
- Claude PRs always target the topic branch, never `main`
- Start a new topic with `/new-topic topic/<N>-<slug>` — cleans old Claude branches and creates a fresh worktree
- Current topic is tracked in `.claude/current-topic` (session-local, gitignored)

## Plan Mode
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Agents
For the test-and-review agent — when to trigger it and what it does — see [docs/AGENTS.md](docs/AGENTS.md).
