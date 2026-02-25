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
