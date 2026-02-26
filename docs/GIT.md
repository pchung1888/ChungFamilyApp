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
    └── claude/N-slug-<suffix>  (Claude's worktree branch — PRs → topic, never main)
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

> **Note:** Branches created before this convention (e.g. `claude/pedantic-noyce`) omit the topic prefix and can be removed with `/clean_gone` or `/new-topic`.

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
