# Agents

## test-and-review
Use via the Task tool (`subagent_type: "test-and-review"`).

**Trigger proactively when:**
- A new component, API route, or utility is finished
- User explicitly asks for tests or a code review
- A logical chunk of work is complete (e.g., after each phase)

**What it does:**
- Writes Vitest unit tests co-located in `__tests__/` folders
- Reviews code for correctness, conventions, and security
- Follows project test patterns (see `src/components/family/__tests__/family-form.test.tsx`)

**Do NOT wait for the user to ask** — offer or launch automatically after significant new code is written.
