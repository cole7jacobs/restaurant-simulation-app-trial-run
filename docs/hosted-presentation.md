# Dedicated hosted presentation (approval required)

This procedure is a proposal. Do not create resources, write remote data, merge, or deploy without the owner's explicit approval. The owner must also review and merge the presentation PR first. Confirm the Cloudflare plan and potential charges before creating resources. The separate proposed names are Worker `sampleslice-presentation` and D1 `sampleslice-presentation-db`; never use the staging database. Check availability immediately before creation.

The checked-in `wrangler.presentation-hosted.jsonc` intentionally contains an invalid database ID. After creating the dedicated database, replace that placeholder locally with its exact ID and verify both the database name and ID before any remote command. The intended initial URL is `https://sampleslice-presentation.restaurant-sim-cole.workers.dev`; `PRESENTATION_HOST` must match the actual HTTPS hostname. The ID is not a credential. Use only this configuration for the hosted presentation; the regular staging configuration continues to use `worker/index.ts` and does not expose reset.

Locally prepare the ignored seed file with `node scripts/prepare-hosted-presentation.mjs`. It runs the existing validated setup using the private reference archive, then adds reset snapshots. It creates no accounts and makes no remote calls. It refuses to overwrite an existing seed file. After approval and after applying all checked-in migrations to the **new, empty** presentation database, the operator can import `.wrangler/hosted-presentation-seed.sql` with Wrangler `d1 execute DB --remote --config wrangler.presentation-hosted.jsonc --file .wrangler/hosted-presentation-seed.sql`. This file contains derived simulation data and must never be committed or published publicly. Do not run the seed on a database containing data.

Provision fictional accounts with distinct passwords of at least 15 characters, entered in hidden terminal prompts; no password is supplied on the command line or committed. These commands write salted password hashes to the presentation database and require authorized Cloudflare access:

```bash
printf 'Student password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- --presentation student present-student@example.invalid 'Presentation Student' 1
unset account_password
printf 'Professor password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- --presentation professor present-professor@example.invalid 'Presentation Professor'
unset account_password
```

After approval and merge, build and deploy with `npx wrangler deploy --config wrangler.presentation-hosted.jsonc`, then verify `/api/health`, `/api/health/db`, sign-in, role isolation, Q1, Q2 decisions, RFI download, Q2 import, dashboard, and reset. Use Safari for professor and Chrome for student; keep their credentials private. The professor reset checks authentication, origin, the configured HTTPS presentation host, and the snapshot marker. It restores Q1/Q2 presentation data but not accounts or sessions. The normal staging Worker has no reset endpoint. The historical Q2 result file predates any live edits and does not demonstrate a fresh FORTRAN run.

The committed config is a deployment template until the new D1 ID is filled in. Do not deploy the default `wrangler.jsonc` or the staging configuration to create the presentation site. Hosted verification and the final site URL cannot be confirmed until authorized resources exist and deployment completes.
