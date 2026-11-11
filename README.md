# Restaurant Simulation App

**ISDS 4125: Analysis and Design of Information Systems — LSU**
**Team:** Tahj Foster, Cole Jacobs, Kalynn Loftis, Sarah Reid, Kylie LaCaze

A web interface for the restaurant management simulation used in ISDS 4125. Students enter restaurant decisions each round; the application generates the legacy RFI input files for the FORTRAN simulation, imports the resulting FR.LST output, and presents results through a dashboard.

> **Status:** Phase 1 complete. Milestone 2.1 adds the local D1 database and development fixtures.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Routing | React Router (library mode) |
| Backend API | Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) — Phase 2 |
| Styling | Tailwind CSS v4 |
| Testing | Vitest + Testing Library |

---

## Prerequisites

- **Node.js** 20 or later ([nodejs.org](https://nodejs.org))
- **npm** 10 or later (included with Node.js)
- **Wrangler** is installed as a project dependency — no global install needed

Verify your versions:
```bash
node --version   # should be v20.x or later
npm --version    # should be 10.x or later
```

---

## Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/colejacobs67/restaurant-simulation-app-trial-run.git
cd restaurant-simulation-app-trial-run

# Install all dependencies
npm install
```

---

## Local Development

The application has two separate processes during development:

**Terminal 1 — Frontend (React + Vite, with hot module replacement)**
```bash
npm run dev
# → Vite dev server on http://localhost:5173
# → /api/* requests are automatically proxied to the Worker on :8787
```

**Terminal 2 — Backend API (Hono Worker via Wrangler)**
```bash
npm run dev:api
# → Worker dev server on http://localhost:8787
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note:** Both terminals must be running to use API endpoints during frontend development. If you only need to work on the UI, `npm run dev` alone is sufficient — API calls will fail gracefully since the Worker is not running.

---

## Full Preview (Worker + Built Frontend)

To test the complete application as it will behave in production — the Worker serving both the API and the static frontend:

```bash
npm run preview
# Runs: vite build && wrangler dev
# → Full app on http://localhost:8787
```

---

## Local D1 database

The Hono Worker reads Cloudflare D1 through its `DB` binding. The schema
contains `User`, `Team`, `TeamDecision`, `MenuItem`, `MenuItemDecision`, and
`TeamMetrics`. Decisions and metrics use team and round keys, while menu
decisions also reference a catalog item. See the [project plan](project-plan.md)
for the relationship map, SQLite type mappings, and unresolved schema questions.

Initialize the local database before starting the API Worker.

```bash
npm run db:init
npm run dev:api
```

With the Worker running, check its database readiness endpoint.

```bash
curl -f http://localhost:8787/api/health/db
```

Expect `{"status":"ok"}` after the migration creates all six tables. The endpoint
returns HTTP 503 if the binding or schema is unavailable. `/api/health` checks
Worker liveness independently. If Wrangler needs the static asset directory on
a fresh checkout, run `npm run build` once before starting the Worker.

To inspect the local fixtures and foreign keys:

```bash
npx wrangler d1 execute DB --local --command "SELECT TeamID, TeamName, FirmNumber FROM Team ORDER BY FirmNumber"
npx wrangler d1 execute DB --local --command "PRAGMA foreign_key_check"
```

The first command lists five demo teams on a fresh seeded database. An empty
result from the second means there are no foreign key violations. Wrangler keeps
local data in the ignored `.wrangler/` directory.

- `npm run db:migrate` applies pending schema migrations from `db/migrations/`.
  Use this command alone for an empty local schema.
- `npm run db:seed` loads development fixtures separately. Running it again
  preserves existing rows. Conflicting IDs, firm numbers, and menu names are
  skipped. The seed includes no user accounts. Its results are fictional and its
  menu list is a sample pending OQ-4.
- The initial migration targets an empty database. If you manually loaded the
  original `db/schema.sql`, use a fresh local persistence directory with
  `--persist-to` on the Wrangler migration, seed, and dev commands.
- The database ID in `wrangler.jsonc` is a local placeholder. A Cloudflare-hosted
  database needs its own binding and migrations before deployment.

## Running Tests

```bash
# Run tests once (CI mode)
npm run test:run

# Run tests in watch mode (development)
npm run test
```

The database integration suite starts Miniflare on loopback with an isolated,
in-memory D1 database. It applies the checked-in SQL and leaves your local
development data intact. Run it on its own with
`npm run test:run -- test/worker/database.test.ts`.

Tests are located in `test/` and cover:
- **`test/lib/design-tokens.test.ts`** — guards design token hex values against drift
- **`test/components/Button.test.tsx`** — Button component rendering, behavior, accessibility
- **`test/worker/health.test.ts`** — Worker liveness and database readiness responses
- **`test/worker/database.test.ts`** — D1 migrations, reads and writes, constraints, and repeatable development seeding

---

## Type Checking

```bash
npm run type-check
# Type-checks both the frontend (tsconfig.json) and Worker (tsconfig.worker.json)
```

---

## Project Structure

```
restaurant-simulation-app-trial-run/
├── index.html                    # HTML entry (Google Fonts, dark mode init)
├── package.json                  # Dependencies and npm scripts
├── vite.config.ts                # Vite + Tailwind plugin + /api proxy
├── vitest.config.ts              # Test configuration
├── wrangler.jsonc                # Cloudflare Worker configuration
├── tsconfig.json                 # Frontend TypeScript config
├── tsconfig.worker.json          # Worker TypeScript config
│
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point (BrowserRouter)
│   ├── App.tsx                   # Route tree
│   ├── styles/index.css          # Tailwind + design tokens
│   ├── lib/design-tokens.ts      # Color/font constants (also used by Recharts)
│   ├── hooks/useDarkMode.ts      # Dark mode with localStorage
│   ├── routes/                   # Page components
│   └── components/ui/            # Shared UI components
│
├── worker/                       # Cloudflare Worker (Hono)
│   └── index.ts                  # API routes + static asset fallback
│
├── db/
│   ├── migrations/               # Versioned D1 schema
│   ├── schema.sql                # Original six-table reference
│   └── seed.dev.sql              # Local development fixtures
│
├── test/                         # Test files (mirrors src/ structure)
│
└── docs/
    └── open-questions.md         # Unresolved requirements (OQ-1 through OQ-10)
```

---

## Design System

Colors, typography, and components follow the team's design system document.

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#E0A94F` | Gold — main buttons, chart bars |
| `deep-green` | `#1F3A2A` | Text, outlines, selected tabs |
| `card` | `#FCEDE4` | Light orange — card backgrounds |
| `alert` | `#D98B62` | Soft orange — warnings, errors |
| `dark-bg` | `#161616` | Dark mode background |
| `dark-card` | `#242424` | Dark mode card background |

**Fonts:** Bricolage Grotesque (headings, 24 px bold) · Hanken Grotesk (body, 16 px / 14 px medium)

Dark mode is toggled via the moon/sun button in the navigation bar and persists in `localStorage`.

---

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Application foundation, design system, navigation shells | Complete |
| 2 | Database, authentication, role-based access | In progress |
| 3 | Student decision forms | ⏳ Planned |
| 4 | Professor tools, RFI file generation | ⏳ Planned |
| 5 | FR.LST import and parsing | ⏳ Planned |
| 6 | Results dashboard | ⏳ Planned |
| 7 | Integration, testing, Cloudflare deployment | ⏳ Planned |

---

## Open Questions

Five requirements are unresolved and block specific implementation phases. See [`docs/open-questions.md`](docs/open-questions.md) for details.

The most critical: **obtain sample RFI input and FR.LST output files** from the professor before Phase 4 begins.

---

## Security Notes

- Never commit `.env` files, API keys, or database credentials to this repository.
- The `.gitignore` excludes `.env`, `.env.local`, and `.env.production`.
- Passwords are stored as hashes (Phase 2). The `PasswordHash` field never contains plaintext.