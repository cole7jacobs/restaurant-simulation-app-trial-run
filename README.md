# Restaurant Simulation App

**LSU ISDS 4125 · Team:** Kylie LaCaze, Sarah Reid, Kalynn Loftis, Tahj Foster, and Cole Jacobs

A web application for teams participating in the restaurant management simulation. Students enter decisions for their restaurant, and a professor downloads formatted RFI files for an **external** FORTRAN simulation. After the simulation is run outside this application, the professor imports its `FR.LST` listing to store reported results. The web app does not run FORTRAN or calculate simulation outcomes.

Authentication, student decisions, RFI export, and FR.LST import are implemented. The authenticated student results dashboard displays imported results. The available historical files are examples for the implemented format, not a guarantee that every possible simulation variant is supported.

## Contents

- [Architecture and stack](#architecture-and-stack)
- [Installation and local development](#installation-and-local-development)
- [Local D1 database](#local-d1-database)
- [Local accounts and sign-in](#local-accounts-and-sign-in)
- [Application workflows](#application-workflows)
- [API and data model](#api-and-data-model)
- [Code map](#code-map)
- [Testing and checks](#testing-and-checks)
- [Staging](#staging)
- [Remaining work and ownership](#remaining-work-and-ownership)
- [Known limitations and open questions](#known-limitations-and-open-questions)
- [Guidelines for AI coding assistants](#guidelines-for-ai-coding-assistants)
- [GitHub collaboration](#github-collaboration)

## Architecture and stack

- **Frontend:** React 18, TypeScript, Vite, React Router, and Tailwind CSS 4. Shared components and design tokens support the existing visual design and dark mode.
- **Backend:** Hono on Cloudflare Workers, with role and team authorization in the Worker and parameterized D1 queries.
- **Database:** Cloudflare D1 (SQLite), accessed through the `DB` binding. Versioned migrations define the current schema. Local Wrangler state is independent of staging.
- **Hosting:** Workers Static Assets serves the built Vite frontend and the Worker handles the API on the same host. Vite proxies `/api` to the local Worker during development.
- **Tests:** Vitest, Testing Library, and Miniflare. GitHub Actions runs checks for pull requests targeting `main`.

The flow is **student decisions → professor RFI download → external simulation → professor FR.LST preview and import → stored results**. The assigned student reads imported results through an API, and the signed-in results page displays them in a dashboard.

## Installation and local development

Use Node.js 20 or later and npm 10 or later. Wrangler is a project dependency; no global install is required.

```bash
git clone https://github.com/cole7jacobs/restaurant-simulation-app-trial-run.git
cd restaurant-simulation-app-trial-run
npm ci
npm run db:init
npm run build
```

`db:init` applies local migrations and loads fictional development fixtures. The build also ensures that the static asset directory exists for Wrangler on a fresh checkout. Each teammate gets a separate local D1 database; no shared database or Cloudflare login is needed for local development.

Start the backend and frontend in separate terminals:

```bash
# Terminal 1: local Worker, http://localhost:8787
npm run dev:api
```

```bash
# Terminal 2: Vite, http://localhost:5173
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Both processes are needed for API-backed features. Alternatively, `npm run preview` builds the frontend and starts a local Worker serving both frontend and API at port 8787. Use the same hostname throughout a local login.

## Local D1 database

```bash
npm run db:migrate  # apply pending migrations only
npm run db:seed     # add fictional development fixtures
npm run db:init     # run both commands
```

Migrations are in `db/migrations/`; `db/schema.sql` is the original schema reference, not the initialization path. The seed is repeatable and supplies five fictional teams and example decisions and results; these are **not** FORTRAN output and include no user credentials. Local state is stored under ignored `.wrangler/`. The default database ID in `wrangler.jsonc` is a local placeholder.

With the Worker running, check connectivity and local data:

```bash
curl -f http://localhost:8787/api/health
curl -f http://localhost:8787/api/health/db
npx wrangler d1 execute DB --local --command "SELECT TeamID, TeamName, FirmNumber FROM Team ORDER BY FirmNumber"
npx wrangler d1 execute DB --local --command "PRAGMA foreign_key_check"
```

Both health endpoints should return `status: ok`; an empty foreign-key check indicates no violations. The database health check verifies the six core tables, the tables added by migrations 0002 to 0004, the unique index from migration 0005, and that the foreign-key check finds no violations; on failure it returns 503 with the missing names. For an isolated local state directory, use `--persist-to` consistently for Wrangler migration, seed, and development commands; `LOCAL_D1_STATE` selects that directory for the local account script.

## Local accounts and sign-in

After `npm run db:init`, create accounts from a trusted Bash or Zsh terminal. Choose a different password of at least 15 characters for each; these prompts do not echo the password. The example student uses seeded Demo Bistro, team `-1`.

```bash
printf 'Student password: '
read -rs account_password
printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- student student@example.invalid 'Local Student' -1
unset account_password

printf 'Professor password: '
read -rs account_password
printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- professor professor@example.invalid 'Local Professor'
unset account_password
```

Sign in at [http://localhost:5173/login](http://localhost:5173/login); sign out before switching accounts. The operator assigns roles and teams; there is no public registration. Account creation inserts an account once and requires an existing team for students. The same script supports an explicit `--staging` option for authorized operators; see [staging instructions](docs/cloudflare-staging.md), and never use it without permission.

Passwords are salted scrypt hashes. Sessions are stored as token hashes in D1, expire after eight hours, and are revoked on logout. Cookies are HTTP-only and SameSite=Lax; HTTPS uses Secure and the `__Host-` prefix. The API checks request origin for POSTs, applies login rate limits, and enforces roles and team ownership. The `/dev` UI preview exists only in development builds, uses demo data, and does not grant API access.

## Application workflows

### Student

1. Sign in to view the assigned team on Student Home.
2. Open **Decisions**, choose Q2–Q7, and enter menu selections, operations, finance, and report choices. Save a draft and use **Review** to inspect saved decisions.
3. Submit a complete round. Submission locks it against further edits. Q1 is the baseline; a submitted decision needs at least one and at most ten menu selections.
4. Open **Results** to view the team's imported metrics, menu-item results, and charts for Q1–Q7. Rounds without an imported FR.LST show an empty state.

### Professor

1. Sign in to view teams and their draft/submitted statuses. The existing team-review page shows the filtered submission status, not a full decision-detail editor.
2. Open **RFI Generation**, select Q2–Q7, and download an RFI for each submitted team with firm number 1–5. Product report must be set to **No** for the current export mapping. The approved Finance record has eight numeric fields; see the [RFI specification](docs/rfi-specification.md).
3. Run the FORTRAN simulation separately using the appropriate external process. The app makes no claim that generated files are accepted by an untested executable.
4. Open **FR.LST Import**, select Q1–Q7, upload the matching `.LST` file, inspect the preview and warnings, and confirm. Different results for an already imported round require explicit replacement. The [FR.LST specification](docs/fr-lst-specification.md) describes firm mapping, validation, and stored fields.

## API and data model

All paths below are relative to the application origin. Student and professor endpoints require a valid session and the corresponding role; student team data is scoped on the server. POST requests require a matching `Origin`. See the Worker source for request bodies, validation, errors, and response types before integrating a feature.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health`, `GET /api/health/db` | Worker liveness and core-table readiness |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` | Sign-in, sign-out, and session state |
| `GET /api/student/team/:teamId?` | Assigned team; another team's ID is forbidden |
| `GET /api/student/decisions/:round`, `POST /api/student/decisions/:round` | Read or save/submit the assigned team's Q2–Q7 decisions |
| `GET /api/student/results/:round` | Read the assigned team's imported Q1–Q7 metrics and menu results when available |
| `GET /api/professor/submissions` | Teams and per-round submission status |
| `GET /api/professor/rfi/:round`, `GET /api/professor/rfi/:round/:teamId` | RFI roster and individual download |
| `POST /api/professor/import/:round/preview`, `POST /api/professor/import/:round/confirm` | Preview and confirm an FR.LST upload |

Current migrations create these application tables:

| Table | Purpose |
| --- | --- |
| `User`, `Team` | Accounts, roles, team membership, and optional firm assignments |
| `TeamDecision` | Team/round decisions, revision, and submission state |
| `MenuItem`, `MenuItemDecision` | Catalog and ordered menu selections for a team and round |
| `TeamMetrics` | Team/round aggregate results |
| `AuthSession`, `LoginRateLimit` | Hashed sessions and login throttling state |
| `SimulationResultImport`, `MenuItemResult` | Import provenance and reported menu-level results |

Read all four files in `db/migrations/` for current keys, constraints, and relationships; later migrations change the initial schema. For example, menu decisions use ordered slots after migration 0003. Do not assume the older six-table summary in `project-plan.md` describes every current key.

## Code map

| Location | Start here for |
| --- | --- |
| `src/App.tsx`, `src/context/AuthContext.tsx` | Route tree, role gates, sessions, and protected data requests |
| `src/routes/student/StudentDecisionForm.tsx` | Authenticated decision and review forms |
| `src/routes/AccountPages.tsx`, `src/routes/student/StudentResultsDashboard.tsx` | Authenticated home/status pages and the student results dashboard |
| `src/routes/student/ResultsPage.tsx` | Development-preview results page with demo data |
| `src/routes/professor/RFIPage.tsx`, `src/routes/professor/ProfessorImportPage.tsx` | Authenticated RFI and import interfaces |
| `src/components/ui/`, `src/styles/index.css`, `src/lib/design-tokens.ts` | Reusable components, styling, and design tokens |
| `worker/index.ts`, `worker/auth.ts`, `worker/password.mjs` | Worker entry, health, authentication, authorization, and hashing |
| `worker/student-decisions.ts`, `shared/decisions.ts` | Decision API, shared fields, catalog/preparation rules |
| `worker/professor-rfi.ts`, `worker/rfi.ts`, `worker/rfi-finance.ts` | RFI API and formatting |
| `worker/professor-import.ts`, `worker/fr-lst.ts`, `shared/results.ts` | Import API, listing parser, result types |
| `db/migrations/`, `db/seed.dev.sql` | Current database migrations and fictional fixtures |
| `test/`, `test/fixtures/` | Worker, database, component, and format tests |
| `wrangler.jsonc`, `wrangler.staging.jsonc` | Local/default Worker configuration and isolated staging configuration |
| `docs/rfi-specification.md`, `docs/fr-lst-specification.md` | Supported legacy formats and validation |

## Testing and checks

Before submitting work, run:

```bash
npm run type-check  # frontend and Worker TypeScript
npm run test:run    # complete automated suite, once
npm run build       # production frontend build
```

`npm test` starts Vitest in watch mode. The database and authentication integration tests use isolated Miniflare D1 state and loopback networking; they do not use your local development database. Tests cover migration and data integrity, authentication and role isolation, decision forms, RFI formatting, and FR.LST parsing/import.

The optional `input-output/` archive contains private original reference files and must remain local and unmodified. When it is absent, the archive-dependent comparisons are skipped; committed compact fixtures and synthetic cases still run. CI works without the archive. Do not add these original files to Git or deployment assets.

## Staging

The isolated staging application is at [restaurant-simulation-app-staging.restaurant-sim-cole.workers.dev](https://restaurant-simulation-app-staging.restaurant-sim-cole.workers.dev/login). It uses a separate D1 database and fictional test data. Do not change shared staging data, accounts, configuration, or deployments without authorization. See [Cloudflare staging](docs/cloudflare-staging.md) for operator-only account setup and manual deployment procedures. Do not use `npm run deploy` as a staging shortcut.

## Remaining work and ownership

These assignments are suggested ownership, not restrictions. Coordinate changes that cross feature boundaries.

| Teammate | Focus | Useful starting points |
| --- | --- | --- |
| **Kylie** | Student Results Dashboard: connect the signed-in page to imported team results and handle loading, empty, and error states. | `src/App.tsx`, `src/routes/student/ResultsPage.tsx`, `worker/auth.ts`, `shared/results.ts` |
| **Sarah** | UI and responsiveness: improve existing pages and shared components across screen sizes while preserving workflows and accessibility. | `src/components/ui/`, `src/routes/`, `src/styles/index.css` |
| **Kalynn** | Database integrity and validation: review constraints, migrations, data relationships, and validation with tests. | `db/migrations/`, `worker/student-decisions.ts`, `test/worker/database.test.ts` |
| **Tahj** | Professor tools: improve submission review, RFI, and import workflows within confirmed requirements. | `src/routes/AccountPages.tsx`, `src/routes/professor/`, `worker/professor-rfi.ts`, `worker/professor-import.ts` |
| **Cole** | Integration, testing, GitHub collaboration, and deployment readiness. | `test/`, `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `docs/cloudflare-staging.md` |

## Known limitations and open questions

- The student results dashboard shows only the stored result fields. Menu price, portion, and promotion are not stored with menu results and are not displayed. The development-preview results page uses demo data.
- Professor team review currently shows submission status rather than complete decision details. Additional professor management tools remain future work.
- The RFI generator uses the approved Q5–Q7 eight-field Finance layout, market ME, and requires Product report **No**. The five reserved Finance values have no documented business meanings. Do not silently add the older ten-field format.
- The importer targets the known five-firm listing layout and known catalog/preparation labels; historical raw examples cover Q1–Q5 and Q7, not Q6. It does not import every printed report field. Review the specifications before extending either format.
- Confirm course-specific requirements such as the complete catalog and menu minimum, round scheduling, carry-forward, results release, and desired additional metrics. [Open questions](docs/open-questions.md) contains historical notes, including requests for samples now available locally; check the newer specifications and implementation before treating those notes as current blockers.
- There is no public registration or self-service password reset. Local/staging accounts are operator-provisioned. Review production provisioning, session policies, and rate limits for classroom use before production release.
- Further hosted browser/end-to-end testing, accessibility and responsive review, and production readiness remain necessary. Development fixtures are not authentic simulation results.

## Guidelines for AI coding assistants

1. Inspect the existing implementation, migrations, tests, and relevant specifications before changing a feature. Treat this README as a starting map and verify details in code.
2. Preserve working behavior and reuse the current architecture, shared components, APIs, and schema. Avoid unrelated changes; use versioned migrations when an approved schema change is actually needed.
3. Do not invent FORTRAN rules or modify validated RFI/FR.LST formats. Resolve unclear requirements with the team and use the documented reference examples and tests.
4. Never commit secrets, credentials, the private `input-output/` archive, or local database files. Do not modify original reference files.
5. Do not modify the shared Cloudflare staging environment without authorization. Work locally with fictional data.
6. Add or update meaningful tests for behavioral changes. Run TypeScript checks, the automated suite, and the production build before submitting; report any skipped or failing checks.

## GitHub collaboration

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup, suggested branch assignments, and review guidance. In brief:

```bash
git switch main
git pull --ff-only
git switch -c kylie/results-dashboard  # substitute your assigned feature branch
# Make and review your changes, then run the checks above.
git add <intended-files>
git commit -m "Describe the change"
git push -u origin <your-branch>
```

Open a pull request targeting `main`, request review, address feedback, and wait for the required checks. After an approved PR is merged, update local `main` with `git switch main` and `git pull --ff-only`, then branch from it for the next task. Never commit credentials or private reference files, and do not merge or deploy on someone else's behalf without permission.
