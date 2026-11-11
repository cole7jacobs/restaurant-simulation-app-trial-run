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

Pending review of Milestone 2.1. Confirm professor account provisioning
(OQ-9) and student team assignment before implementing password hashing,
sessions, and server-side access checks. Verify both role boundaries and
student team isolation before wiring protected UI flows to the Worker.

## Later phases

1. Implement student decision entry and submission after the catalog and
   preparation mappings are confirmed.
2. Implement professor submission review and RFI export once the input format
   is confirmed.
3. Import FR.LST results once the output format is confirmed.
4. Connect the results dashboard to imported data and verify the release
   workflow.
5. Perform end-to-end testing and prepare Cloudflare deployment.
