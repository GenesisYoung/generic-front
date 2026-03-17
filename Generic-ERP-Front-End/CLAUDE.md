# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Type-check + build for production
npm run type-check   # Run vue-tsc type checking only
npm run test:unit    # Run unit tests with Vitest
npm run lint         # Run oxlint then eslint (both auto-fix)
npm run format       # Format with Prettier
```

To run a single test file: `npx vitest run src/__tests__/App.spec.ts`

## Architecture

**Stack:** Vue 3 + TypeScript + Vite SPA. State via Pinia, routing via Vue Router.

**Key conventions:**
- Path alias `@/` maps to `src/` — use it for all internal imports
- No semicolons, single quotes, 100-char line width (Prettier)
- Strict TypeScript with `noUncheckedIndexedAccess` — index access returns `T | undefined`
- Linting is dual-layer: Oxlint (fast, Rust) runs first, then ESLint for Vue/TS rules

**Environment:** Backend API base URL is `VITE_API_BASE_URL` (defaults to `http://localhost:3000`). All Vite env vars must be prefixed `VITE_` to be exposed to the client.

**Structure:**
- `src/router/` — Vue Router route definitions
- `src/stores/` — Pinia stores (composition API style)
- `src/__tests__/` — Vitest unit tests (jsdom environment)
