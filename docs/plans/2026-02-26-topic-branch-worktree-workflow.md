# Topic-Branch Worktree Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce a clean lifecycle where every Claude worktree branch is scoped to a `topic/N-slug` branch, old worktrees are cleaned up when switching topics, and all Claude PRs always target the current topic branch (not `main`).

**Architecture:** Four file changes: (1) `docs/GIT.md` documents the convention, (2) a project-local `.claude/commands/commit-push-pr.md` overrides the global plugin to auto-detect the topic base branch, (3) a new `.claude/commands/new-topic.md` command cleans old `claude/*` branches and initialises a fresh worktree, (4) the `cross-platform-build-fixer` agent gains git/PR workflow awareness.

**Tech Stack:** Git, GitHub CLI (`gh`), Git Bash on Windows 11, bash shell scripts.

---

## Naming Convention (reference for all tasks)

| Branch type | Pattern | Example |
|---|---|---|
| Topic branch | `topic/<N>-<slug>` | `topic/7-newidea` |
| Claude worktree branch | `claude/<N>-<slug>-<suffix>` | `claude/7-newidea-pedantic-noyce` |
| Worktree directory | `.claude/worktrees/<N>-<slug>-<suffix>` | `.claude/worktrees/7-newidea-pedantic-noyce` |

**Extraction rule:** Given branch `claude/7-newidea-pedantic-noyce`, the topic base = `topic/7-newidea` — strip `claude/` prefix, then drop everything after the second hyphen-delimited segment (`N-slug`). For topics with multi-word slugs (`topic/7-new-idea`), the claude branch is `claude/7-new-idea-<suffix>` — the suffix is always appended after the full topic slug. To robustly find the base, we do: `git branch -r | grep "topic/" | xargs git merge-base HEAD` — or simpler: find the remote `topic/*` branch that this claude branch was created from.

**Simpler extraction (recommended):** The `new-topic` command stores the topic base in a git config `branch.<claude-branch>.merge` or a local file `.claude/current-topic`. PR commands read from `.claude/current-topic`.

---

### Task 1: Update `docs/GIT.md` — Document topic-branch workflow

**Files:**
- Modify: `docs/GIT.md`

**Step 1: Add the topic-branch section**

Replace the entire file with:

```markdown
# Git Workflow

## Commits
- Commit after each phase is complete
- Descriptive commit messages
- Never commit `.env` or `prisma/dev.db`

## .gitignore Maintenance
When adding new tools, dependencies, or generated files, update `.gitignore` accordingly.

Key ignored patterns:
- `node_modules/`, `.next/`, `build/`, `dist/` — build artifacts
- `.env*` — all environment variable files (secrets, DB credentials)
- `prisma/dev.db*` — local SQLite files (if ever used)
- `coverage/` — test coverage reports
- OS/IDE files: `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/*`

## Branch Hierarchy

```
main
└── topic/N-slug          (user's feature branch — PR target for Claude)
    └── claude/N-slug-xx  (Claude's worktree branch — PRs → topic, never main)
```

### Topic branches
- Owned by the user
- Named `topic/<N>-<slug>` (e.g. `topic/7-newidea`)
- PR from topic → main when feature is done

### Claude worktree branches
- Created by Claude; one per worktree session
- Named `claude/<N>-<slug>-<suffix>` — must mirror the parent topic (e.g. `claude/7-newidea-pedantic-noyce`)
- **Always PR to the parent topic branch**, never directly to `main`
- Multiple claude branches per topic are allowed; clean them up with `/new-topic` or `/clean_gone`

## Starting a new topic

```bash
# 1. Create and push your topic branch from main
git checkout main && git pull
git checkout -b topic/7-newidea
git push -u origin topic/7-newidea

# 2. In Claude Code, run the slash command:
/new-topic topic/7-newidea
# This will:
#   - Delete all local claude/* branches (and their worktrees)
#   - Create a new worktree from topic/7-newidea
#   - Set .claude/current-topic so PRs auto-target the right branch
```

## PR workflow (Claude)
- `/commit-push-pr` reads `.claude/current-topic` to set `--base`
- Produces PRs like: `claude/7-newidea-xyz → topic/7-newidea`
- After user reviews the PR on GitHub, they merge it into the topic branch

## Cleanup
- `/clean_gone` removes `[gone]` branches and their worktrees after remote branches are deleted
- `/new-topic` also performs cleanup of existing `claude/*` branches before switching
```

**Step 2: Verify it looks right**

```bash
cat docs/GIT.md
```
Expected: the full workflow document as written above.

**Step 3: Commit**

```bash
git add docs/GIT.md
git commit -m "docs(git): add topic-branch worktree workflow"
```

---

### Task 2: Create `.claude/commands/commit-push-pr.md` — project-local override

This overrides the global `commit-commands` plugin to always target the topic branch.

**Files:**
- Create: `.claude/commands/commit-push-pr.md`

**Step 1: Write the file**

```markdown
---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(git branch:*), Bash(cat:*), Bash(git log:*)
description: Commit, push, and open a PR targeting the current topic branch
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Current topic target: !`cat .claude/current-topic 2>/dev/null || echo "UNKNOWN — run /new-topic first"`
- Recent commits on this branch: !`git log --oneline -10`

## Your task

Based on the above changes:

1. Read the base branch from `.claude/current-topic` (the file contains one line: `topic/N-slug`).
   - If the file is missing or says UNKNOWN, **stop and tell the user to run `/new-topic <branch>` first**.
2. Create a commit with an appropriate message (stage all relevant files; do not commit `.env` or secrets).
3. Push the branch to `origin`.
4. Create a pull request using:
   ```
   gh pr create --base <topic-branch> --title "..." --body "..."
   ```
   where `<topic-branch>` is the value read from `.claude/current-topic`.
5. Return the PR URL.

Do all of the above in a single message. Do not use any other tools or do anything else.
```

**Step 2: Verify**

```bash
cat .claude/commands/commit-push-pr.md
```
Expected: file contents as above.

**Step 3: Commit**

```bash
git add .claude/commands/commit-push-pr.md
git commit -m "feat(commands): override commit-push-pr to target topic branch"
```

---

### Task 3: Create `.claude/commands/new-topic.md` — topic switch command

**Files:**
- Create: `.claude/commands/new-topic.md`

**Step 1: Write the file**

```markdown
---
allowed-tools: Bash(git fetch:*), Bash(git branch:*), Bash(git worktree:*), Bash(git checkout:*), Bash(mkdir:*), Bash(echo:*), Bash(cat:*), Bash(ls:*)
description: Switch to a new topic branch — cleans old claude/* branches and creates a fresh worktree
---

## Context

- Current branch: !`git branch --show-current`
- All local branches: !`git branch -v`
- All worktrees: !`git worktree list`
- All remote topic branches: !`git branch -r | grep topic/`

## Your task

The user wants to start working on a new topic. The topic branch name is provided as the argument `$ARGUMENTS`.

If `$ARGUMENTS` is empty, list available remote `topic/*` branches and ask the user which to use.

Otherwise, follow these steps in order:

### Step 1 — Fetch and prune
```bash
git fetch --prune
```

### Step 2 — Delete all local `claude/*` branches (and their worktrees)
```bash
git branch -v | grep '^[+ ] *claude/' | sed 's/^[+* ]//' | awk '{print $1}' | while read branch; do
  echo "Processing claude branch: $branch"
  worktree=$(git worktree list | grep "\[$branch\]" | awk '{print $1}')
  if [ -n "$worktree" ] && [ "$worktree" != "$(git rev-parse --show-toplevel)" ]; then
    echo "  Removing worktree: $worktree"
    git worktree remove --force "$worktree"
  fi
  echo "  Deleting branch: $branch"
  git branch -D "$branch"
done
```

Report which branches and worktrees were removed.

### Step 3 — Verify the topic branch exists on the remote
```bash
git branch -r | grep "$ARGUMENTS"
```
If not found, warn the user and stop.

### Step 4 — Generate worktree name and create worktree

Generate a short random suffix (use the last 6 chars of a UUID or use an adjective-noun combo).
The new branch name must follow `claude/<N>-<slug>-<suffix>`, matching the topic name.

For example, if topic is `topic/7-newidea`, branch is `claude/7-newidea-<suffix>`.

```bash
TOPIC_BRANCH="$ARGUMENTS"                          # e.g. topic/7-newidea
TOPIC_SHORT="${TOPIC_BRANCH#topic/}"                # e.g. 7-newidea
SUFFIX=$(LC_ALL=C cat /dev/urandom | tr -dc 'a-z' | fold -w6 | head -1 2>/dev/null || echo "work$(date +%H%M)")
CLAUDE_BRANCH="claude/${TOPIC_SHORT}-${SUFFIX}"    # e.g. claude/7-newidea-xyzabc
WORKTREE_DIR=".claude/worktrees/${TOPIC_SHORT}-${SUFFIX}"

git fetch origin "$TOPIC_BRANCH":"$TOPIC_BRANCH" 2>/dev/null || true
git worktree add "$WORKTREE_DIR" -b "$CLAUDE_BRANCH" "origin/$TOPIC_BRANCH"
```

### Step 5 — Record the topic target
```bash
echo "$TOPIC_BRANCH" > .claude/current-topic
```

### Step 6 — Report
Tell the user:
- Topic branch: `<TOPIC_BRANCH>`
- New Claude branch: `<CLAUDE_BRANCH>`
- Worktree path: `<WORKTREE_DIR>`
- PRs from this session will target: `<TOPIC_BRANCH>`
- To open the worktree session: open Claude Code with `--add <WORKTREE_DIR>` or `cd <WORKTREE_DIR>`

**Note for Windows/Git Bash:** `/dev/urandom` may not be available. Fallback: use `SUFFIX=$(date +%S%N | cut -c1-6)` or `SUFFIX=$(powershell -Command "[System.Guid]::NewGuid().ToString().Substring(0,6)" 2>/dev/null || echo "work01")`.
```

**Step 2: Verify**

```bash
cat .claude/commands/new-topic.md
```

**Step 3: Commit**

```bash
git add .claude/commands/new-topic.md
git commit -m "feat(commands): add new-topic command for topic branch switching"
```

---

### Task 4: Update `.claude/agents/cross-platform-build-fixer.md` — add git/PR workflow

**Files:**
- Modify: `.claude/agents/cross-platform-build-fixer.md`

**Step 1: Add a new section `### 8. Git & PR Workflow (Windows Git Bash)`**

After the existing `### 7. Escalation` section (around line 86), insert:

```markdown
### 8. Git & PR Workflow (Windows Git Bash)

This project uses a **topic-branch worktree model**. Know these rules when running git or `gh` commands:

#### Branch hierarchy
```
main
└── topic/N-slug          (user's PR target)
    └── claude/N-slug-xx  (Claude's working branch — PR → topic, NEVER main)
```

#### Key files
- `.claude/current-topic` — one line: the topic branch name (e.g. `topic/7-newidea`). Read this before creating any PR.

#### Creating a PR (always)
```bash
TOPIC=$(cat .claude/current-topic)
gh pr create --base "$TOPIC" --title "..." --body "..."
```
Never use `gh pr create` without `--base`. Default base is `main`, which is wrong.

#### Switching topics (`/new-topic`)
```bash
git fetch --prune
# Delete all claude/* branches (and worktrees):
git branch -v | grep '^[+ ] *claude/' | sed 's/^[+* ]//' | awk '{print $1}' | while read b; do
  wt=$(git worktree list | grep "\[$b\]" | awk '{print $1}')
  [ -n "$wt" ] && git worktree remove --force "$wt"
  git branch -D "$b"
done
# Create new worktree from topic branch:
git worktree add ".claude/worktrees/N-slug-suffix" -b "claude/N-slug-suffix" "origin/topic/N-slug"
echo "topic/N-slug" > .claude/current-topic
```

#### Windows Git Bash quirks for git/gh
- `/dev/urandom` for random suffixes: not always available. Use `date +%S%N | cut -c1-6` as fallback.
- `gh` must be authenticated: `gh auth status` to verify.
- PowerShell for GUID: `powershell -Command "[System.Guid]::NewGuid().ToString().Substring(0,6)"`.
- Path to worktrees: `.claude/worktrees/` (forward slashes work in Git Bash).
- `git worktree remove --force` is needed on Windows if the worktree directory has open handles.

#### Clean-up commands
- `/clean_gone` — removes `[gone]` branches after PRs are merged and remote branches deleted.
- `/new-topic <branch>` — full cleanup + fresh worktree for a new topic.
```

**Step 2: Verify the insertion looks correct**

```bash
grep -n "Git & PR Workflow" .claude/agents/cross-platform-build-fixer.md
```
Expected: shows the new section heading.

**Step 3: Commit**

```bash
git add .claude/agents/cross-platform-build-fixer.md
git commit -m "feat(agents): add git/PR workflow section to cross-platform-build-fixer"
```

---

### Task 5: Create `.claude/current-topic` for the CURRENT session

Since we're on `claude/pedantic-noyce` which was created from `main` (before this workflow existed), this is a migration step. If a future topic branch is created, `/new-topic` will handle it. For now, document the missing file:

**Step 1: Check if `.claude/current-topic` exists in the repo root**

```bash
ls -la .claude/current-topic 2>/dev/null || echo "MISSING"
```

**Step 2: Add `.claude/current-topic` to `.gitignore`** (it's session-local state, not committed)

Open `.gitignore` and add:
```
# Claude session state
.claude/current-topic
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .claude/current-topic (session-local state)"
```

---

### Task 6: Update `CLAUDE.md` — reference the new git workflow

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update the Git Workflow section**

The current section says:
```markdown
## Git Workflow
For commit conventions and `.gitignore` patterns, see [docs/GIT.md](docs/GIT.md).
```

Update to:
```markdown
## Git Workflow
For commit conventions, `.gitignore` patterns, and the **topic-branch worktree model** (how Claude branches are named and where PRs go), see [docs/GIT.md](docs/GIT.md).

Key rules:
- Claude branches: `claude/<N>-<slug>-<suffix>` (always scoped to a topic)
- Claude PRs always target the topic branch, never `main`
- Start a new topic with `/new-topic topic/<N>-<slug>` — this cleans old Claude branches
- Current topic is tracked in `.claude/current-topic` (session-local, not committed)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): reference topic-branch workflow in git section"
```

---

## Summary

After all tasks, the workflow is:

```
# User creates new topic
git checkout -b topic/7-newidea && git push -u origin topic/7-newidea

# In Claude Code session on main worktree:
/new-topic topic/7-newidea
# → deletes all claude/* branches/worktrees
# → creates claude/7-newidea-<suffix> from topic/7-newidea
# → writes topic/7-newidea to .claude/current-topic

# Claude does work in the new worktree, then:
/commit-push-pr
# → PR target: topic/7-newidea (from .claude/current-topic)
# → NEVER targets main directly

# After PR merged and remote branch deleted:
/clean_gone
# → removes [gone] claude/* branches and worktrees
```

## Unresolved questions
- None — naming convention and `.claude/current-topic` approach are unambiguous.
- Optional: If you want the worktrees to auto-install deps (`npm install`) after creation, add that to the `new-topic` command's Step 6.
