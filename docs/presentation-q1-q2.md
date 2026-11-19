# Q1-to-Q2 authenticated presentation

This is a **local, isolated** demonstration of the real authenticated application, separate from public Demo Mode. It reads the private reference files in `input-output/` and never changes the ordinary local D1 database or Cloudflare staging. Do not commit or publish those files or the generated private SQL in `.wrangler/`.

## Prepare or reset

From the repository root, install dependencies with `npm ci`. Make sure these local files are present:

- `input-output/00_Q1-simulation-start/output-of-simulation/FR.LST`
- `input-output/01_Q2-decisions/required-by-legacy-simulation/RFI{1..5}ME.TXT`
- `input-output/01_Q2-decisions/output-of-simulation/FR.LST` (needed during the presentation)

Run the setup with a **new** name each time:

```bash
npx vite-node scripts/prepare-presentation.ts presentation-demo-day
```

The script refuses to overwrite an existing directory. To reset, choose another unique name, for example `presentation-demo-day-2`; use that name in all commands below. Each database starts with all five Q1 firm results, five authentic Q2 decision sets, firm 1 as an editable draft, firms 2–5 marked submitted, and no Q2 results or accounts. Do not run `npm run db:init` or the development seed against this database: those commands target another state or add fictional data.

The script checks fixed-width Q2 records against the app's current generator and stops on unsupported values. The archived Q2 Finance record has ten zero fields; generated files use the approved Q5–Q7 eight-field format with signed `+0` in the first three fields. Therefore the generated Finance line deliberately differs from the historical Q2 line. Report Product is set to No because the exporter's enabled mapping is unconfirmed. These files are formatted for the app's approved profile; an external executable has not been tested for acceptance.

## Create presentation accounts

Use a separate password of at least 15 characters for each account. Bash/Zsh hidden prompts keep passwords out of shell history. Substitute your unique presentation state path if you chose a different name. These commands create accounts only in the named local database; do not use `--staging`.

```bash
printf 'Student password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | LOCAL_D1_STATE=.wrangler/presentation-demo-day npm run account:create -- student present-student@example.invalid 'Presentation Student' 1
unset account_password
printf 'Professor password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | LOCAL_D1_STATE=.wrangler/presentation-demo-day npm run account:create -- professor present-professor@example.invalid 'Presentation Professor'
unset account_password
```

## Start and present

In separate terminals, start the Worker and Vite. Keep their host and port consistent for login and POST origin checks.

```bash
npx wrangler dev --local --port 8787 --config wrangler.presentation.jsonc --persist-to .wrangler/presentation-demo-day
```

```bash
npm run dev
```

Open `http://localhost:5173/login`. Sign in as the presentation student and open **Results → Q1**. Q2 is not yet imported. Open **Decisions**, choose Q2, and change **Staff FTEs per day** from `29.0` to `32.5`. Save the draft, review, and submit. Submitting locks the round; use a fresh named database to repeat rather than editing a submitted record.

Sign out and sign in as the presentation professor. Open **RFI Generation**, choose Q2, and download each of the five submitted files. In `RFI1ME.TXT`, the new value is on the `Operations` record (record 19), its first numeric field, columns 44–53, as `32.5` right-aligned. It is generated from the submitted decision, not a hardcoded replacement.

Open **FR.LST Import**, select Q2, and choose `input-output/01_Q2-decisions/output-of-simulation/FR.LST`. Preview, verify all five firm mappings, and confirm the import. Sign back in as the student and open **Results → Q2**; Q1 remains available. The Q2 file is an output from a prior simulation run: its results do **not** reflect the newly edited decision, and the application does not run FORTRAN or recalculate results.

If port 8787 is in use, stop the other local process or configure the Vite proxy and Worker together to use a free port. Keep passwords private; never put them in files or Git. If the presentation must be hosted instead of local, plan a separate isolated Cloudflare database and Worker with the owner before making any hosted changes.

## Local reset button

For the existing `presentation-demo-day` state, install the validated reset snapshot once with `node scripts/install-presentation-snapshot.mjs`, then start the local Worker using the command above. The snapshot installer refuses to overwrite an existing snapshot and does not replace existing accounts or results. The Reset Presentation button appears on the authenticated Professor Home page only when this local-only Worker and snapshot are available. Confirm the dialog to restore Q1 results and Q2 decisions and clear Q2 results; accounts and sessions are preserved. The normal and staging Worker entry points do not register this reset endpoint.
