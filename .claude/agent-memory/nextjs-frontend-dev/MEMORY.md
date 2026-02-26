# ChungFamilyApp — Frontend Dev Agent Memory

## Project Structure
- Dashboard page: `src/app/(protected)/page.tsx` (Server Component)
- Dashboard components: `src/components/dashboard/` (5 files, all Server Components)
- Nav: `src/components/nav.tsx` (Client Component — uses useSession/usePathname)
- Globals: `src/app/globals.css` — warm holiday OKLCH palette (coral primary, teal accent)
- App shell: `src/app/layout.tsx` — `max-w-5xl` container, `px-4 py-8`
- shadcn/ui available: badge, button, card, dialog, form, input, label, select, separator, table
- Trip detail page: `src/app/(protected)/trips/[id]/page.tsx` — 3-tab layout (Expenses/Participants/Balance)
- New components: `participants-tab.tsx`, `balance-tab.tsx` in `src/components/trips/`
- New models: TripParticipant, ExpenseSplit, Settlement (migration: 20260226030257)

## Design Patterns (confirmed)
- Hero gradient banners: `bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500`
- Nav uses: `from-amber-50 via-orange-50 to-rose-50` warm gradient
- Stat cards: `border-t-2` accent top + icon square (rounded-xl, colored bg)
- Category color palette: purple=hotel, blue=flight, orange=food, yellow=gas, emerald=ev_charging, pink=tours, red=shopping, gray=other
- `cn()` always used for conditional class merging (never string concat)
- Alert banners: standalone `div` with `rounded-2xl border` instead of Card (lighter visual weight)
- Empty states: centered column with large emoji + muted text + CTA link

## Tailwind v4 Notes
- Use `border-t-2 border-t-{color}` for colored top border on cards
- Arbitrary opacity values `opacity-[0.07]` work fine
- `pointer-events-none select-none` for decorative emoji overlays
- `first:rounded-l-full last:rounded-r-full` for segmented progress bars

## Workflow
- `npm run typecheck` — use after every file change (not `npm run build`)
- `npm run dev --webpack` — avoids Turbopack/Prisma Windows crash
- No `any` types; no inline styles except for dynamic `width: \`${pct}%\``

## Links
- Patterns detail: `patterns.md` (to be created when more confirmed)
