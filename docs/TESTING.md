# Testing

## Setup
- **Framework:** Vitest + `@testing-library/react` + `@testing-library/user-event`
- **Environment:** happy-dom (not jsdom — jsdom v27 has ESM-only deps that break in CJS mode)
- **Config:** `vitest.config.ts`

## Scripts
```bash
npm run test            # run all tests once
npm run test:watch      # watch mode
npm run coverage        # run tests + coverage report (enforces thresholds)
```

## Coverage Requirements

Coverage is **enforced** via `vitest.config.ts` thresholds on the `src/components/**` and `src/app/api/**` scopes (excluding `src/components/ui/**`):

| Metric     | Threshold |
|------------|-----------|
| Lines      | 90 %      |
| Statements | 90 %      |
| Branches   | 85 %      |
| Functions  | 83 %      |

Current baseline (Feb 2026): **92.7 % lines · 92.0 % statements · 86.7 % branches · 85.1 % functions**

`npm run coverage` exits non-zero if any threshold is breached — **CI will fail on under-covered code.**

### CI enforcement
`.github/workflows/test.yml` runs `npm run coverage` on every push and pull request.
There is no branch protection rule; the CI failure is advisory but strongly encouraged to fix before merging.

### Adding coverage for new code
Every new component or API route must have a companion test in a co-located `__tests__/` folder.
Run `npm run coverage` locally before pushing to verify you haven't dropped below the thresholds.

## Conventions
- Tests live in co-located `__tests__/` folders next to the component they test
- Reference test: `src/components/family/__tests__/family-form.test.tsx` (10 tests, ~95% coverage)

## Known Quirks

### vitest.config.ts aliases
- Uses `resolve.alias` array with most-specific paths first for `@/*` resolution
- `vite-tsconfig-paths` v6 is ESM-only — **do NOT use it** in vitest.config.ts (CJS mode)
- Use `path.resolve(__dirname, './src')` alias instead

### Mocks
- Radix UI Select: `src/__mocks__/ui/select.tsx` — aliased in vitest.config.ts to avoid jsdom portal issues
- next/navigation: `src/__mocks__/next/navigation.ts`
- Prisma: `vi.mock("@/lib/prisma", ...)` with `vi.fn()` stubs — no real DB in tests

### API route tests
- Use `// @vitest-environment node` directive for routes that import `fs/promises` (avoids happy-dom Vite browser-external error)
- Route params are `Promise`-based in Next.js 16: `params: Promise.resolve({ id: "..." })`
- `vi.hoisted()` is required for mocks that need to be defined before `vi.mock()` factory runs

### happy-dom quirks
- `step="0.01"` / `step="0.1"` inputs trigger `stepMismatch` in happy-dom — work around by adding `document.querySelector("form")!.setAttribute("novalidate", "")` before click
- `window.confirm` / `window.alert` stubs in `src/test-setup.ts` are guarded with `typeof window !== "undefined"` so they don't throw in `@vitest-environment node` tests
- Date formatting tests: use `new Date(year, monthIndex, day)` local constructor (not ISO strings) to avoid UTC-offset shifts
