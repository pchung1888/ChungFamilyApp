# Commands

Quick reference for seeding and managing data without using the UI.
Run these from Git Bash (or any terminal) while `npm run dev` is running.

## Files

| File | Entity |
|------|--------|
| [family.md](family.md) | Family members |
| [cards.md](cards.md) | Credit cards & benefits *(Phase 3)* |
| [trips.md](trips.md) | Trips & expenses *(Phase 4)* |

## Tips

- All commands target `http://localhost:3000` — make sure `npm run dev` is running
- Responses follow `{ data, error }` format
- You can also use **Prisma Studio** to browse and edit data directly:
  ```bash
  npx prisma studio
  ```
  Opens a visual DB browser at http://localhost:5555
