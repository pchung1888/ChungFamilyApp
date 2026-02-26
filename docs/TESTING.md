# Testing

## Setup
- **Framework:** Vitest + `@testing-library/react` + `@testing-library/user-event`
- **Environment:** happy-dom (not jsdom — jsdom v27 has ESM-only deps that break in CJS mode)
- **Config:** `vitest.config.ts`

## Scripts
```bash
npm run test            # run all tests once
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

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

### Coverage
- Coverage thresholds are omitted until all components have tests (thresholds would fail on untested files)

### happy-dom bug
- happy-dom has a known bug with `step=0.1` inputs and `stepMismatch` validation — tests work around this
