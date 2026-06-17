# Generic ERP Frontend — Development Process Document

> **Last Updated:** June 17, 2026  
> **Stage:** Early-to-Mid Development (v0.0.0)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Implemented Functionalities](#5-implemented-functionalities)
6. [Environment & Configuration](#6-environment--configuration)
7. [Development Workflow](#7-development-workflow)
8. [Current Stage & Roadmap](#8-current-stage--roadmap)

---

## 1. Project Overview

`generic-front` is the **Vue 3 SPA frontend** of the Generic ERP system. It communicates exclusively with the `generic_erp` Spring Boot backend via a JSON REST API. At this stage the application provides a complete authentication shell, a permission-gated navigation sidebar, and the scaffolding for user and role management. Additional ERP feature modules (inventory, purchasing, HR, reporting, etc.) are defined in the navigation structure and ready to be built out.

---

## 2. Technology Stack

| Category | Technology | Version |
|---|---|---|
| Language | TypeScript (strict mode) | 5.9.3 |
| UI Framework | Vue 3 (Composition API) | latest |
| Build Tool | Vite | 7.3.1 |
| Component Library | Vuetify 4 | 4.x |
| Icon Set | Material Design Icons (MDI) | 7.4.47 |
| State Management | Pinia | 3.0.4 |
| State Persistence | pinia-plugin-persistedstate | 4.7.1 |
| Routing | Vue Router | 5.0.3 |
| HTTP Client | Axios | 1.14.0 |
| Charts / Visualisation | Apache ECharts + vue-echarts | 6.0.0 / 8.0.1 |
| Unit Testing | Vitest + @vue/test-utils | 4.0.18 / 2.4.6 |
| Linting | Oxlint + ESLint | ~1.50.0 / 10.0.2 |
| Formatting | Prettier | 3.8.1 |
| Node.js Requirement | Node.js | ^20.19.0 or >=22.12.0 |

---

## 3. Architecture

### Application Layers

```
┌────────────────────────────────────────────────────────┐
│  Views  (pages rendered per route)                     │
│  views/auth/LoginView.vue                              │
│  views/home/ManagerView.vue                            │
│  views/manage/UserManage.vue                           │
│  views/manage/RoleList.vue  /  RoleDistribute.vue      │
└─────────────────────┬──────────────────────────────────┘
                      │ uses
┌─────────────────────▼──────────────────────────────────┐
│  Components  (shared UI building blocks)               │
│  AppNavigation.vue  PaginationBar.vue  TabMenu.vue     │
└─────────────────────┬──────────────────────────────────┘
                      │ reads/writes
┌─────────────────────▼──────────────────────────────────┐
│  Pinia Stores  (global reactive state)                 │
│  stores/auth.ts          — identity & tokens           │
│  stores/tabs.ts          — open tab list               │
└─────────────────────┬──────────────────────────────────┘
                      │ calls
┌─────────────────────▼──────────────────────────────────┐
│  API Layer  (Axios instance + interceptors)             │
│  api/http.ts  —  JWT injection, 401 auto-refresh       │
└─────────────────────┬──────────────────────────────────┘
                      │ HTTP/JSON
┌─────────────────────▼──────────────────────────────────┐
│  generic_erp  (Spring Boot backend)                    │
└────────────────────────────────────────────────────────┘
```

### Routing Model

- **Hash history** mode (`/#/path`) — avoids server-side routing configuration.
- `router/index.ts` registers a `beforeEach` guard: unauthenticated users are redirected to `/login`; logged-in users visiting `/login` are redirected to `/`.
- Protected routes carry `meta: { requiresAuth: true }`.
- Module sub-routes live in separate files under `router/file/`.

### Token Refresh Strategy

1. Axios response interceptor catches `401` responses.
2. The first 401 triggers a `POST /api/auth/refresh/access` call using the stored refresh token.
3. Concurrent requests that 401 during the refresh are queued and replayed once a new token is received.
4. If the refresh itself fails, the user is logged out and redirected to `/login`.

---

## 4. Project Structure

```
generic-front/
├── app/                             # Application root (renamed from Generic-ERP-Front-End/)
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Dependencies & npm scripts
│   ├── vite.config.ts               # Vite config (@ alias → src/)
│   ├── vitest.config.ts             # Test runner config (jsdom)
│   ├── tsconfig*.json               # TypeScript configurations
│   ├── eslint.config.ts             # ESLint rules
│   ├── .oxlintrc.json               # Oxlint rules
│   ├── .prettierrc.json             # Prettier settings
│   ├── .editorconfig                # Editor normalisation
│   └── src/
│       ├── main.ts                  # App bootstrap: Pinia, Vuetify, Router
│       ├── App.vue                  # Root component
│       ├── api/
│       │   ├── http.ts              # Axios instance with JWT & refresh interceptors
│       │   └── api.ts               # Typed request helpers
│       ├── assets/
│       │   ├── config/
│       │   │   ├── auth.ts          # Permission enum, Identity & Token types
│       │   │   └── navigation.ts    # Sidebar menu item definitions
│       │   ├── components/
│       │   │   ├── AppNavigation.vue   # Sidebar navigation
│       │   │   ├── PaginationBar.vue   # Table pagination controls
│       │   │   └── TabMenu.vue         # Multi-tab interface
│       │   └── styles/
│       │       └── main.css
│       ├── lang/
│       │   ├── us_en.ts             # English string map
│       │   └── china_zh.ts          # Simplified Chinese string map
│       ├── router/
│       │   ├── index.ts             # Root router + auth guard
│       │   └── file/
│       │       └── manage.ts        # /manage/* route definitions
│       ├── stores/
│       │   ├── auth.ts              # Auth state (login, refresh, logout)
│       │   └── tabs.ts              # Tab state
│       ├── theme/
│       │   ├── theme.ts             # Theme interface
│       │   └── primary.ts           # Default dark theme (violet #7C3AED)
│       ├── types/
│       │   ├── auth.ts              # LoginRequest, TokenPair, Identity, AuthState
│       │   ├── interface.ts         # APIResponse, Tab, Pagination
│       │   └── navigation.ts        # NavItem type
│       ├── views/
│       │   ├── HomeView.vue         # Authenticated landing page
│       │   ├── MainEntry.vue        # Main layout shell with sidebar + tab bar
│       │   ├── NotFound.vue         # 404 page
│       │   ├── auth/
│       │   │   └── LoginView.vue    # Login form
│       │   ├── home/
│       │   │   └── ManagerView.vue  # Manager dashboard
│       │   └── manage/
│       │       ├── UserManage.vue      # User management page
│       │       ├── RoleManage.vue      # Role module container
│       │       ├── RoleList.vue        # Role list/table
│       │       ├── RoleDistribute.vue  # Assign permissions to roles
│       │       └── PermissionManage.vue # Permission management (stub)
│       └── __tests__/
│           └── App.spec.ts
├── CLAUDE.md                        # Claude Code project guidance
├── README.md                        # Project documentation
├── ERP FrontEnd Auth.pdf            # Auth architecture spec
└── ERP_Auth_Architecture.png        # Auth architecture diagram
```

---

## 5. Implemented Functionalities

### 5.1 Authentication

- **Login page** (`/login`) — username + password form, calls `POST /api/auth/login`.
- **JWT token pair** stored in Pinia auth store and persisted to `localStorage` via `pinia-plugin-persistedstate`.
- **Automatic token refresh** — Axios interceptor silently exchanges an expired access token using the refresh token before retrying the original request.
- **Concurrent 401 handling** — queues parallel failing requests during refresh; all replayed once the new token arrives.
- **Logout** — clears store and localStorage, redirects to `/login`.
- **Dev mode bypass** — set `VITE_APP_DEV_MODE=true` to skip login during development.

### 5.2 Navigation & Routing

- **Sidebar** (`AppNavigation.vue`) — 10 navigation items defined in `assets/config/navigation.ts`, each with an MDI icon and an i18n label key.
- **Route auth guard** — `beforeEach` enforces `requiresAuth` meta flag on all protected routes.
- **Multi-tab UI** (`TabMenu.vue` + `stores/tabs.ts`) — tracks open pages as tabs; switching tabs navigates the router.
- **404 fallback** — unmatched routes redirect to `/`.
- **Backend-driven sidebar** — sidebar menu items fetched from `GET /api/users/fetch/sidebar/menu` and merged with local config (as of June 17, 2026).

### 5.3 User Management (`/manage/users`)

- User list displayed in a table.
- CRUD operation scaffolding connected to the backend.
- Pagination via `PaginationBar.vue`.

### 5.4 Role Management (`/manage/roles`)

- **RoleList** (`/manage/roles/list`) — tabular display of all roles.
- **RoleDistribute** (`/manage/roles/distribute`) — UI for assigning permissions to a role.
- Both routes require `Permission.ROOT`.

### 5.5 Permission Management

- Route and component stub (`PermissionManage.vue`) defined at `/manage/permissions`.
- Nine permission codes defined in the `Permission` enum: `ROOT`, `ACCOUNTANT`, `HR`, `MARKETING`, `PURCHASER`, `SALESMAN`, `BRAND_MANAGER`, `DESIGNER`, `CUSTOMER_RELATION`.

### 5.6 Internationalisation (i18n)

- String maps for **English** (`us_en.ts`) and **Simplified Chinese** (`china_zh.ts`).
- Delivered to components via Vue's `provide` / `inject` pattern.
- Navigation labels use i18n keys, allowing runtime language switching.

### 5.7 Theming

- Dark theme applied by default.
- Primary colour: violet `#7C3AED`.
- Theme interface (`theme/theme.ts`) supports Vuetify colour tokens for easy theme extension.

### 5.8 Chart Support

- ECharts (`vue-echarts`) installed and registered globally — ready for use in dashboard and report views.

---

## 6. Environment & Configuration

### Environment Variables

Create `app/.env.local` (git-ignored) with:

```env
# Backend API base URL (required)
VITE_BASE_URL=http://localhost:8080

# Skip login screen in development (optional)
VITE_APP_DEV_MODE=true

# Comma-separated permission codes for the synthetic dev user (optional)
VITE_APP_DEV_USER_ROLES=ROOT
```

### Code Style Rules

| Rule | Value |
|---|---|
| Semicolons | None |
| Quotes | Single |
| Line width | 100 characters |
| Indent | 2 spaces |
| Trailing commas | All |

Enforced by Prettier + ESLint + Oxlint. Run `npm run format` to auto-fix formatting and `npm run lint` to check.

### TypeScript Strictness

`tsconfig.app.json` enables:
- `strict: true`
- `noUncheckedIndexedAccess: true` — array index and object key access returns `T | undefined`

---

## 7. Development Workflow

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm (bundled with Node.js)
- The `generic_erp` backend running locally (or a remote dev URL)

### Running the Dev Server

```bash
cd app
npm install          # first time only
npm run dev          # starts Vite dev server at http://localhost:5173
```

### Running Tests

```bash
cd app
npm run test:unit
```

### Type Checking

```bash
cd app
npm run type-check
```

### Lint & Format

```bash
cd app
npm run lint         # Oxlint then ESLint
npm run format       # Prettier auto-fix
```

### Production Build

```bash
cd app
npm run build        # outputs to app/dist/
```

### Branch Strategy

- `main` — stable, reviewed code
- `claude/amazing-mayer-v3gn5l` — current active development branch
- Feature branches: branch off `main`, open a PR back to `main`

### Adding a New ERP Module

1. Add a route entry in `router/file/<module>.ts` and import it in `router/index.ts`.
2. Add a navigation item in `assets/config/navigation.ts`.
3. Add i18n label keys to `lang/us_en.ts` and `lang/china_zh.ts`.
4. Create the view component(s) under `views/<module>/`.
5. Connect to the backend via typed Axios calls in `api/http.ts` or a dedicated module file.

---

## 8. Current Stage & Roadmap

### Current Stage: Auth Shell + Management Scaffolding

**Commit Timeline:**

| Date | Milestone |
|---|---|
| April 15, 2026 | Home page v1.0 |
| April 17, 2026 | User Manage v1.0 |
| April 20–21, 2026 | User Manage v1.1, Role Manage v1.0 |
| June 9, 2026 | Project restructure (`app/` directory), security setup |
| June 17, 2026 | Sidebar connected to backend API |

### Module Completion Status

| Module | Status | Notes |
|---|---|---|
| Authentication (login, token refresh, logout) | Done | Full flow implemented & tested manually |
| Route auth guards | Done | `beforeEach` guard active on all protected routes |
| Sidebar navigation | Done | Backend-driven as of June 17, 2026 |
| Tab management UI | Done | Pinia store + TabMenu component |
| i18n (English + Chinese) | Done | String maps complete for existing screens |
| Dark theme | Done | Vuetify primary theme applied |
| User management page | In Progress (~60%) | List + CRUD scaffolded; edge cases pending |
| Role management | In Progress (~50%) | List and distribute views exist; full CRUD pending |
| Permission management | Stub only | Component created, no logic implemented |
| Product management | Not started | Navigation item defined |
| Inventory management | Not started | Navigation item defined |
| Customer management | Not started | Navigation item defined |
| Supplier management | Not started | Navigation item defined |
| Report management | Not started | Navigation item defined; ECharts ready |
| Settings page | Not started | Navigation item defined |
| Unit / component tests | Minimal | Only `App.spec.ts` example exists |
| Error notification UI | Not started | Toast/snackbar system not yet implemented |

### Immediate Next Steps

1. Complete user management CRUD (create, edit, delete with validation).
2. Complete role management CRUD and permission assignment flow.
3. Implement `PermissionManage.vue`.
4. Add a global error notification system (Vuetify snackbar).
5. Add i18n strings for all new screens.
6. Begin the first new ERP module (TBD — HR or Inventory).
7. Increase unit test coverage for auth store and API interceptors.
