# Restaurant Simulation App project plan

## Phase 1 application foundation

Complete. The React and Vite UI provides development previews for student and
professor workflows. Hono runs on Cloudflare Workers and serves the built
frontend through the static assets binding.

## Phase 2 database and access

### Milestone 2.1 local database

The Worker accesses SQLite through its Cloudflare D1 `DB` binding. Versioned
migrations in [db/migrations](db/migrations/) define the database. The original
[schema reference](db/schema.sql) is retained for comparison.

| Table | Primary key | Relationships and uniqueness |
| --- | --- | --- |
| User | UserID | Unique email. Optional TeamID references Team. |
| Team | TeamID | FirmNumber is optional and unique when assigned. |
| TeamDecision | TeamID, RoundNumber | References Team. A null SubmittedAt identifies a draft. |
| MenuItem | MenuItemID | Unique ItemName. |
| MenuItemDecision | TeamID, RoundNumber, MenuItemID | References MenuItem and the complete TeamDecision key. |
| TeamMetrics | TeamID, RoundNumber | References Team. Associates with decisions by team and round without requiring a decision row. |

Rounds are represented by integer `RoundNumber` fields. The schema follows the
data dictionary's key and nullability definitions. SQLite represents VARCHAR
and timestamps as TEXT, booleans as INTEGER with checks, and DECIMAL as REAL.
STRICT tables enforce storage types. VARCHAR lengths, DECIMAL precision and
scale, and timestamp formatting are not enforced by SQLite. The application
will handle validation when those fields become writable through the API.

The database enforces the optional User-to-Team foreign key and allowed roles.
Student membership and professor account provisioning belong to Milestone 2.2.
The round numbering and creation workflow is open under OQ-6. The authoritative
menu catalog, preparation mappings, legacy file details, and results workflow
are tracked in [open questions](docs/open-questions.md).

Use `npm run db:init` for a migrated and seeded local database, or
`npm run db:migrate` for schema only. Use `npm run db:seed` to load the fictional
fixtures separately. Start the Worker with `npm run dev:api` and check
`GET /api/health/db`. See the [README](README.md#local-d1-database) for commands
to inspect data and foreign keys. The automated D1 tests use an isolated
in-memory Miniflare database.

### Milestone 2.2 authentication and role-based access

Implemented for local review. An operator provisions accounts with a fixed role
and assigns an existing team to each student. The Worker validates D1 sessions
and authorizes protected reads by role and team. Students can read their own
team profile. Professors can read all teams and submission statuses. See the
[local account setup](README.md#local-accounts-and-sign-in).

Migration 0002 adds a case-insensitive email index, session storage, and
login rate-limit state. The legacy simulation workflow and production account
provisioning remain scheduled separately.

## Phase 3 student decisions

Migration 0003 adds ordered menu slots, preserves existing decisions and their
result fields, and loads the 13 archived catalog items. Preparation choices are
item-specific. Student accounts save and review their team's decisions for
Q2–Q7 and submit a completed round. Submission locks the record. Q1 is the
baseline. The form supports ten slots and requires at least one for submission.
Round scheduling and any stricter menu minimum remain open.

The approved Finance export standard is the Q5–Q7 eight-field record. The
first three fields are signed whole-dollar changes in time deposits,
certificates of deposit, and notes payable, followed by five unsigned zeroes.
The serializer validates field widths, emits `+0` for newly generated zeroes,
and writes a 123-character line followed by CRLF. See the
[RFI specification](docs/rfi-specification.md).

## Milestone 4.1 professor RFI export

Professors can select Q2–Q7, see the team submission statuses, and download
one RFI file per submitted team. The Worker validates the complete submission
and uses the Q5–Q7 archive profile for market ME. The enabled Product report
mapping remains open, so an export requires Product set to No. See the
[RFI specification](docs/rfi-specification.md).

## Milestone 5.1 professor FR.LST import

Professors select Q1–Q7, upload a listing, review the detected results, and
confirm import. The Worker checks the printed period and firm mappings before
writing aggregates and menu performance in one D1 batch. Students can retrieve
their team's imported data through a protected API for the next dashboard
milestone. See the [FR.LST specification](docs/fr-lst-specification.md).

## Later phases

1. Connect the results dashboard to imported data and verify the release
   workflow.
2. Perform end-to-end testing and prepare Cloudflare deployment.
