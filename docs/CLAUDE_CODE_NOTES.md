# Claude Code — Learning Notes
> ChungFamilyApp was used as a sandbox to explore Claude Code techniques.
> Audience: technical — assumes familiarity with Git and TypeScript projects.

---

## 1. Jira MCP Integration

**What:** Connect Claude to Jira so it can read/create/update tickets without leaving the chat.

**Setup — add to `.claude/settings.json`:**
```json
"mcpServers": {
  "atlassian": {
    "command": "npx",
    "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"]
  }
}
```

**What you can do:**
- "Create a Jira story for adding receipt upload"
- "Move CFA-8 from In Progress to Done"
- Commit messages auto-reference tickets: `feat(CFA-8,9,11): batch expense API`

**Tips:**
- MCP = plug-in socket for external tools — same pattern works for GitHub, Slack, databases
- Jira ticket refs in commits create a full audit trail from code → ticket

---

## 2. Git Worktrees + Topic Branch Model

**What:** Each Claude session works in an isolated copy of the repo (worktree). PRs never go directly to `main`.

**Branch hierarchy:**
```
main
└── topic/10-yolo-coding          ← you own this, PR target
    └── claude/10-yolo-coding-abc123   ← Claude's working branch
```

**Key commands to type:**
```
/new-topic topic/10-yolo-coding    ← start a new topic, creates worktree
/commit-push-pr                    ← stage → commit → push → PR to topic branch
```

**Tips:**
- Claude reads `.claude/current-topic` to know where to target the PR — never guesses
- Multiple worktrees = multiple parallel Claude sessions on different features
- Old `claude/*` branches are auto-cleaned when you run `/new-topic`

---

## 3. Skills / Commands (`/` prompts)

**What:** Markdown files in `.claude/commands/` become callable slash commands.

**Commands built:**

| Command | What it does |
|---------|-------------|
| `/new-topic topic/N-slug` | Creates worktree, sets PR target |
| `/new-entity FamilyMember` | Scaffolds full CRUD in 6 steps |
| `/commit-push-pr` | Commit + push + open PR |

**`/new-entity` does this automatically:**
```
1. Adds model to prisma/schema.prisma → runs migration
2. Creates GET/POST route.ts + PATCH/DELETE [id]/route.ts
3. Creates <entity>-form.tsx component
4. Creates app/<entity>/page.tsx
5. Adds curl examples to .claude/commands/<entity>.md
6. Commits everything
```

**Tips:**
- Use `@file` in prompts to anchor Claude to a specific file:
  ```
  /new-entity Trip @prisma/schema.prisma
  ```
- Commands are just markdown — version controlled, shareable with your team
- Build commands for any repetitive workflow (deploy, seed DB, etc.)

---

## 4. Progressive Disclosure in CLAUDE.md

**What:** `CLAUDE.md` is Claude's project constitution. Keep it short — link to detail docs.

**Structure used:**
```
CLAUDE.md          ← short overview, links to docs/
docs/
  BUILD.md         ← shell rules, Windows quirks
  GIT.md           ← branch model, worktree workflow
  TYPESCRIPT.md    ← code conventions, return types
  DATABASE.md      ← Prisma patterns, connection
  TESTING.md       ← Vitest, coverage, known quirks
  AGENTS.md        ← when to trigger specialized agents
```

**Tips:**
- Claude reads linked docs on demand — keeps main context lean
- Put rules that change often in their own file (e.g., coverage thresholds)
- Add a "Plan Mode" rule directly in CLAUDE.md:
  ```
  ## Plan Mode
  Make plans extremely concise. Sacrifice grammar for brevity.
  End each plan with unresolved questions.
  ```

---

## 5. Test Coverage Enforcement

**What:** Set coverage thresholds; CI fails the PR if they drop.

**`vitest.config.ts` thresholds:**
```typescript
coverage: {
  thresholds: {
    lines: 90,
    statements: 90,
    branches: 85,
    functions: 83,
  }
}
```

**Run commands:**
```bash
npm run test              # run tests once
npm run test:coverage     # run + enforce thresholds
```

**What Claude does when asked "expand test coverage":**
- Reads existing test files to learn the pattern
- Writes unit + snapshot + behavior tests
- Verifies `npm run test:coverage` passes before committing

**Tips:**
- Start coverage enforcement after you have a few reference tests — not on day 1
- Use `happy-dom` not `jsdom` (jsdom v27 has ESM-only deps that break CJS test runner)
- Freeze the clock for snapshot tests with date/time content:
  ```typescript
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15'));
  ```

---

## 6. Plan Mode

**What:** Before Claude writes any code, it reads the codebase and proposes a plan for your approval.

**How to trigger:**
```
Before starting, enter plan mode and propose an implementation plan.
```
Or use the Plan Mode toggle in the Claude Code UI.

**Good prompts for plan mode:**
```
Plan how to add receipt OCR using Gemini API.
List unresolved questions at the end.
```

**Tips:**
- Plan mode forces Claude to read before writing — prevents expensive rewrites
- Ask Claude to use `AskUserQuestion` during planning to surface assumptions:
  ```
  Use AskUserQuestion to clarify the DB schema before finalizing the plan.
  ```
- Save important design plans to `docs/plans/YYYY-MM-DD-feature-name.md`

---

## 7. AskUserQuestion for Design Conversations

**What:** Claude pauses and asks you targeted questions (with options) before making architectural decisions.

**Prompt to trigger it:**
```
Before implementing, use AskUserQuestion to understand my preferences
for the data model, API shape, and UI approach.
```

**What it looks like:**

> How should expense splits be stored?
> - [ ] Flat percentage per participant
> - [ ] Exact amounts per line item
> - [ ] Equal split only

**Tips:**
- Combine with plan mode: plan → ask questions → refine plan → implement
- Good for: DB schema choices, auth strategies, API response shape, UI patterns
- Each question narrows the solution space and reduces back-and-forth

---

## 8. Yolo Mode (Full Auto-Approve)

**What:** Claude runs all tool calls without asking for individual permission — fully autonomous.

**How to enable:** Toggle "Auto-approve" / Yolo mode in Claude Code settings, or set permissions in `.claude/settings.local.json`.

**Best used for:**
- Expanding test coverage across 10+ files
- Scaffolding multiple CRUD entities in sequence
- Running migrations + seeding + typecheck loops

**Safety pattern — always use with PROGRESS_TRACKER:**
```markdown
# Progress: Expand test coverage
## Target files
- [x] src/components/family/__tests__/family-form.test.tsx
- [ ] src/components/cards/__tests__/card-form.test.tsx
- [ ] src/app/api/family/route.test.ts
```

**Tips:**
- Yolo + `PROGRESS_TRACKER.md` = autonomous but auditable
- Review the git diff before merging — don't trust blindly
- Only use for tasks with clear, reversible steps

---

## 9. Context Window Monitoring

**What:** `/context` shows how much of Claude's context window is used. A full context = slower, less accurate responses.

**Command to type:**
```
/context
```

**CLAUDE.md rule added:**
```markdown
## Session Management
When context usage is >90%, proactively stop and create a handoff summary:
1. What's done (with commit hashes)
2. What's in progress
3. What's next (copy-paste prompt for next session)
4. Key files modified
```

**Idea — custom `/context-check` skill:**
Create `.claude/commands/context-check.md`:
```markdown
Run /context and report usage. If over 70%, suggest starting a new session
after the current task is committed.
```

**Tips:**
- Check context before starting large multi-file tasks
- Batch chat updates (every 3-5 files, not every file) to keep context lean
- When handing off sessions, always include a copy-paste prompt for the next session

---

## 10. Google Gemini API for Receipt OCR

**What:** Integrated Gemini Vision API to extract line items from receipt photos — real AI inside the app.

**Flow:**
```
User uploads receipt photo
       ↓
POST /api/trips/[id]/expenses/parse-receipt
       ↓
Gemini Vision API → extracts [{description, amount, category}]
       ↓
User reviews line items in editor
       ↓
POST /api/trips/[id]/expenses/batch → creates all expenses at once
```

**Prompt used to scaffold this:**
```
Integrate Gemini Vision API to parse receipt images.
@src/app/api/trips/[id]/expenses/route.ts
Return line items as [{description, amount, category}].
Add a batch create endpoint that accepts an array of expenses.
```

**Tips:**
- Claude can scaffold any LLM API integration (Gemini, OpenAI, Anthropic) — not just its own
- The Filesystem MCP gave Claude read access to uploaded receipt images during dev
- Design the data model first (plan mode) before implementing the API

---

## 11. Specialized Agents

**What:** Custom AI personas defined in `.claude/agents/` — each focused on one domain.

**Agents built:**

| Agent | Color | Purpose | Trigger when... |
|-------|-------|---------|-----------------|
| `test-architect` | 🔴 Red | Write full test suites | After writing new components/routes |
| `nextjs-frontend-dev` | 🔵 Blue | Build Next.js pages/components | Building UI features |
| `cross-platform-build-fixer` | 🟢 Green | Fix CI/Windows/Linux build errors | Build fails in CI |
| `feature-research-brainstorm` | 🟡 Yellow | Research + feature ideation | Planning new features |

**Agent definition structure (`.claude/agents/test-architect.md`):**
```markdown
---
name: test-architect
model: claude-sonnet-4-6
color: red
---
You are a test coverage specialist for ChungFamilyApp...
[rules, patterns, known quirks]
```

**Agent persistent memory** (survives sessions):
```
.claude/agent-memory/
  test-architect/MEMORY.md    ← quirks, patterns, past decisions
  nextjs-frontend-dev/MEMORY.md
```

**Tips:**
- Agents read their own memory file at start — knowledge accumulates over time
- Color-code agents visually so you can tell at a glance who's working
- Trigger agents proactively (don't wait for Claude to ask)

---

## Quick Reference

### MCP Servers used

| Server | Purpose | Package |
|--------|---------|---------|
| `atlassian` | Jira — create/update tickets | `mcp-remote` |
| `dbhub` | Direct PostgreSQL queries | `@bytebase/dbhub` |
| `filesystem` | Read uploaded receipt images | `@modelcontextprotocol/server-filesystem` |

### Prompt Patterns That Work Well

| Goal | Prompt pattern |
|------|---------------|
| Ground Claude to a file | `@src/prisma/schema.prisma — add Trip model` |
| Run a skill | `/new-entity Expense` |
| Plan before acting | `Enter plan mode. Propose an implementation plan. List unresolved questions.` |
| Design conversation | `Use AskUserQuestion to clarify the API response shape before writing any code.` |
| Autonomous multi-file task | `Work in yolo mode. Create PROGRESS_TRACKER.md and expand test coverage across all API routes.` |
| Session handoff | `Context is getting long. Summarize what's done, what's next, and give me a copy-paste prompt for the next session.` |

### Key Files in This Project

| What | Where |
|------|-------|
| Project conventions | `CLAUDE.md` + `docs/` |
| Slash commands | `.claude/commands/` |
| Agent definitions | `.claude/agents/` |
| Agent memory | `.claude/agent-memory/` |
| MCP config | `.claude/settings.json` |
| Coverage config | `vitest.config.ts` |
| Git workflow | `docs/GIT.md` |
