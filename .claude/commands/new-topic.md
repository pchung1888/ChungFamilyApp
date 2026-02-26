---
allowed-tools: Bash(git fetch:*), Bash(git branch:*), Bash(git worktree:*), Bash(git checkout:*), Bash(echo:*), Bash(cat:*), Bash(ls:*), Bash(date:*)
description: Switch to a new topic branch — deletes all claude/* branches/worktrees and creates a fresh worktree
---

## Context

- Current branch: !`git branch --show-current`
- All local branches (with worktree markers): !`git branch -v`
- All worktrees: !`git worktree list`
- Remote topic branches: !`git branch -r | grep topic/ || echo "(none)"`

## Your task

The topic branch to switch to is: `$ARGUMENTS`

If `$ARGUMENTS` is empty, list the remote `topic/*` branches from context above and ask the user which one to use. Stop and wait for their answer.

Otherwise, follow these steps **in order**:

### Step 1 — Fetch and prune remote tracking info

```bash
git fetch --prune
```

### Step 2 — Delete all local `claude/*` branches and their worktrees

```bash
git branch -v | grep -E '^\+? +claude/' | sed 's/^[+* ]*//' | awk '{print $1}' | while read branch; do
  echo "Processing: $branch"
  worktree=$(git worktree list | grep "\[$branch\]" | awk '{print $1}')
  if [ -n "$worktree" ]; then
    main_worktree=$(git rev-parse --show-toplevel)
    if [ "$worktree" != "$main_worktree" ]; then
      echo "  Removing worktree: $worktree"
      git worktree remove --force "$worktree"
    fi
  fi
  echo "  Deleting branch: $branch"
  git branch -D "$branch"
done
```

Report which branches and worktrees were deleted.

### Step 3 — Verify the topic branch exists on the remote

Run this command after the fetch to get fresh remote data:
```bash
git branch -r | grep "origin/${TOPIC_BRANCH#origin/}" || git branch -r | grep "$ARGUMENTS"
```
If the branch is not found, stop and warn the user. Do not rely on the pre-fetch context for this check.

### Step 4 — Generate a random suffix (Windows-safe)

Use this to generate a 6-character suffix:

```bash
SUFFIX=$(date +%S%N 2>/dev/null | cut -c1-6)
# Fallback if %N not supported (Windows):
if [ -z "$SUFFIX" ] || [ ${#SUFFIX} -lt 4 ]; then
  SUFFIX=$(date +%Y%m%d%H%M%S | tail -c 7 | head -c 6)
fi
```

### Step 5 — Compute names and create the worktree

```bash
TOPIC_BRANCH="$ARGUMENTS"                   # e.g. topic/7-newidea
TOPIC_SHORT="${TOPIC_BRANCH#topic/}"          # e.g. 7-newidea
CLAUDE_BRANCH="claude/${TOPIC_SHORT}-${SUFFIX}"   # e.g. claude/7-newidea-123456
WORKTREE_DIR=".claude/worktrees/${TOPIC_SHORT}-${SUFFIX}"  # relative to repo root

# Fetch the topic branch to ensure we have it locally
git fetch origin "${TOPIC_BRANCH}:${TOPIC_BRANCH}" 2>/dev/null || true

# Create the worktree
git worktree add "$WORKTREE_DIR" -b "$CLAUDE_BRANCH" "$TOPIC_BRANCH"
```

### Step 6 — Record the topic target

```bash
echo "$TOPIC_BRANCH" > "$(git rev-parse --show-toplevel)/.claude/current-topic"
```

This file is gitignored (session-local state).

### Step 7 — Report to the user

Tell the user:
- Topic branch: `<TOPIC_BRANCH>`
- New Claude branch: `<CLAUDE_BRANCH>`
- Worktree path: `<WORKTREE_DIR>`
- PRs from this session will target: `<TOPIC_BRANCH>`
- To open this worktree in a new Claude Code session, `cd` to `<WORKTREE_DIR>` from the main repo root, or open it as a working directory in Claude Code.
