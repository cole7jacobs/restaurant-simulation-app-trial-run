# Cloudflare staging

Staging uses `wrangler.staging.jsonc`, a separate Worker and D1 database. The default local configuration is not the staging configuration. Staging address: https://restaurant-simulation-app-staging.restaurant-sim-cole.workers.dev. Its database is `restaurant-simulation-app-staging-db`. It contains fictional seed data only; outputs are not simulation results. The account's workers.dev subdomain is `restaurant-sim-cole`.

After approved changes merge, a Cloudflare-authorized maintainer should pull main, run `npm ci`, `npm run type-check`, `npm run test:run`, and `npm run build`, review migration changes and the target configuration, and then run:

```sh
npx wrangler whoami
npx wrangler d1 migrations list DB --remote --config wrangler.staging.jsonc
npx wrangler d1 migrations apply DB --remote --config wrangler.staging.jsonc
npx wrangler deploy --config wrangler.staging.jsonc
curl -f https://restaurant-simulation-app-staging.restaurant-sim-cole.workers.dev/api/health
curl -f https://restaurant-simulation-app-staging.restaurant-sim-cole.workers.dev/api/health/db
```

Back up or assess staging data before applying destructive migrations; schema migrations affect the remote staging database. Do not run the default `npm run deploy` for staging. Only `dist/` is uploaded as static assets. Confirm its contents before deploying; never copy `input-output/` there.

To provision fictional staging accounts, use trusted account access and a hidden prompt. The following commands write password hashes to staging, not to the repository. Use unique passwords of at least 15 characters and deliver them through a secure channel. These are persistent accounts; remove or rotate them when no longer needed. Team -1 is a fictional seeded team.

```sh
printf 'Student password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- --staging student student@example.invalid 'Staging Student' -1
unset account_password
printf 'Professor password: '; read -rs account_password; printf '\n'
printf '%s\n' "$account_password" | npm run account:create -- --staging professor professor@example.invalid 'Staging Professor'
unset account_password
```

Never copy local password hashes, sessions, tokens, or real student data to staging. Sign in over HTTPS and test each role. Staging has no separate access gate; anyone knowing its URL can reach its login. Monitor usage and account plan limits; paid-plan overages may incur charges. Wrangler 3 currently warns that it is outdated; evaluate an upgrade separately.
