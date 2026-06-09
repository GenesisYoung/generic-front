# Generic ERP Front End

A Vue 3 single-page application providing the front-end shell for a generic ERP system. Handles authentication, role-based access, and a navigation layout that hosts modules for users, roles, permissions, products, inventory, customers, suppliers, and reports.

## Stack

| Layer | Library |
| --- | --- |
| Framework | Vue 3 (Composition API) |
| Language | TypeScript (strict) |
| Build | Vite |
| UI | Vuetify 4 + MDI icons |
| Charts | ECharts via vue-echarts |
| State | Pinia + pinia-plugin-persistedstate |
| Routing | Vue Router 5 (hash history) |
| HTTP | Axios (with JWT interceptors) |
| Testing | Vitest + @vue/test-utils |
| Linting | Oxlint + ESLint + Prettier |

## Getting Started

**Prerequisites:** Node `^20.19.0` or `>=22.12.0`

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

Copy `.env.example` to `.env.local` and set at minimum:

```env
VITE_API_BASE_URL=https://localhost:8443   # backend API origin
```

### Dev mode (bypass login)

Set these in `.env.local` to skip the login flow during local development:

```env
VITE_APP_DEV_MODE=true
VITE_APP_DEV_USER_ROLES=1001,1002          # comma-separated Permission codes
```

When dev mode is active a fake identity and tokens are injected at store init and the `/login` route redirects to home.

## Commands

```bash
npm run dev          # start dev server
npm run build        # type-check then build for production
npm run type-check   # vue-tsc only
npm run test:unit    # run Vitest unit tests
npm run lint         # oxlint (auto-fix) then eslint (auto-fix)
npm run format       # prettier over src/
```

Run a single test file:

```bash
npx vitest run src/__tests__/App.spec.ts
```

## Project Structure

```text
src/
├── api/
│   ├── http.ts          # Axios instance with JWT request/response interceptors
│   ├── api.ts           # API call definitions
│   └── interface.ts     # API response types
├── assets/
│   ├── config/
│   │   ├── auth.ts      # Permission enum, Identity/AuthToken types
│   │   └── navigation.ts# Sidebar nav item definitions
│   ├── components/
│   │   └── AppNavigation.vue
│   └── styles/
│       └── main.css
├── lang/
│   ├── us_en.ts         # English string map
│   └── china_zh.ts      # Chinese string map
├── router/
│   ├── index.ts         # Root router + auth guard
│   └── file/manage.ts   # /manage/* routes
├── stores/
│   └── auth.ts          # Auth store (login / refresh / logout)
├── theme/
│   ├── theme.ts         # Theme interface
│   └── primary.ts       # Primary theme definition
├── types/
│   └── auth.ts          # Shared Identity / TokenPair types
├── views/
│   ├── auth/LoginView.vue
│   ├── home/ManagerView.vue
│   ├── manager/
│   │   ├── UserManage.vue
│   │   ├── RoleManage.vue
│   │   └── PermissionManage.vue
│   ├── HomeView.vue
│   ├── MainEntry.vue
│   └── NotFound.vue
└── __tests__/
    └── App.spec.ts
```

## Authentication

Authentication is JWT-based. The auth store (`src/stores/auth.ts`) manages state and is persisted across page refreshes via `pinia-plugin-persistedstate` (access token, refresh token, and identity only).

The Axios instance (`src/api/http.ts`) attaches the `Authorization: Bearer <token>` header on every request. On a `401` response it automatically attempts a token refresh and retries the original request. Concurrent requests that all fail with `401` are queued and retried together once the refresh completes. If the refresh fails the user is logged out.

Route-level auth is enforced by a `beforeEach` guard that checks `isAuthenticated` for routes with `meta.requiresAuth: true`.

## Permissions

The `Permission` enum in `src/assets/config/auth.ts` defines numeric role codes:

| Code | Role |
| --- | --- |
| 1001 | ROOT |
| 1002 | ACCOUNTANT |
| 1003 | HR |
| 1004 | MARKETING |
| 1005 | PURCHASER |
| 1006 | SALESMAN |
| 1007 | BRAND_MANAGER |
| 1008 | DESIGNER |
| 1009 | CUSTOMER_RELATION |

Routes under `/manage/*` currently require `Permission.ROOT`.

## Internationalisation

String resources live in `src/lang/`. The active language map is provided to the component tree via Vue's `provide/inject` using the `LanKey` symbol. English (`us_en.ts`) and Chinese (`china_zh.ts`) are included.

## Theming

Vuetify themes are defined under `src/theme/`. The `Theme` interface (`theme.ts`) types the full set of Vuetify color and variable tokens. `primary.ts` exports the active theme object.

## Code Conventions

- Path alias `@/` maps to `src/` — use it for all internal imports
- No semicolons, single quotes, 100-char line width (enforced by Prettier)
- Strict TypeScript with `noUncheckedIndexedAccess` — index access returns `T | undefined`
- Pinia stores use the Composition API `setup` style
- Linting is dual-layer: Oxlint (fast, Rust-based) runs first, then ESLint for Vue/TS rules
