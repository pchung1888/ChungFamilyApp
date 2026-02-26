---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(git branch:*), Bash(cat:*), Bash(git log:*)
description: Commit, push, and open a PR targeting the current topic branch (reads .claude/current-topic)
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Current topic target: !`cat .claude/current-topic 2>/dev/null || echo "UNKNOWN — run /new-topic first"`
- Recent commits on this branch: !`git log --oneline -10`

## Your task

Based on the above changes:

1. Read the base branch from the "Current topic target" shown above.
   - If it says UNKNOWN or the file is missing, **stop and tell the user to run `/new-topic <branch>` first**.
2. Stage all relevant changed files (do not stage `.env`, secrets, or generated files like `node_modules`).
3. Create a single commit with an appropriate message that matches the repo's commit style.
4. Push the current branch to `origin`.
5. Create a pull request using:
   ```
   gh pr create --base <topic-branch> --title "..." --body "$(cat <<'EOF'
   ## Summary
   <1-3 bullet points>

   ## Test plan
   [Bulleted markdown checklist of TODOs for testing the pull request...]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```
   where `<topic-branch>` is the value from `.claude/current-topic`.
6. Return the PR URL.

Do all steps in a single message. Do not use any other tools or take any other actions.
