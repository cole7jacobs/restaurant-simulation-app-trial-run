# Restaurant Simulation App

**ISDS 4125: Analysis and Design of Information Systems — LSU**
**Team:** Tahj Foster, Cole Jacobs, Kalynn Loftis, Sarah Reid, Kylie LaCaze

A web interface for the restaurant management simulation used in ISDS 4125. Students enter restaurant decisions each round; the application generates the legacy RFI input files for the FORTRAN simulation, imports the resulting FR.LST output, and presents results through a dashboard.

> **Status:** Milestone 1.1 — Project scaffolding complete. Authentication, database, and decision forms are implemented in Phase 2–3.

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

## Running Tests

```bash
# Run tests once (CI mode)
npm run test:run

# Run tests in watch mode (development)
npm run test
```

Tests are located in `test/` and cover:
- **`test/lib/design-tokens.test.ts`** — guards design token hex values against drift
- **`test/components/Button.test.tsx`** — Button component rendering, behavior, accessibility
- **`test/worker/health.test.ts`** — Worker health endpoint status code, body shape, timestamp

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
│   └── schema.sql                # Six-table relational schema
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
| 1 | Application foundation, design system, navigation shells | 🔄 In progress |
| 2 | Database, authentication, role-based access | ⏳ Planned |
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