# Contributing

Clone the repository and install its locked dependencies:

```sh
git clone https://github.com/cole7jacobs/restaurant-simulation-app-trial-run.git
cd restaurant-simulation-app-trial-run
npm ci
npm run db:init
```

Each developer has their own local D1 database; no copy of another person's database is needed. Run `npm run dev:api` and `npm run dev` in separate terminals, then open http://localhost:5173. For hidden password prompts and commands to create a local student and professor, see [README](README.md#local-accounts-and-sign-in). Never commit credentials. The fictional seed data is for development only.

Suggested ownership (not restrictions):

- `kylie/results-dashboard`
- `sarah/ui-polish`
- `kalynn/database-review`
- `tahj/professor-tools`
- `cole/integration-testing`

Start from current main with `git switch main && git pull --ff-only`, then `git switch -c kylie/results-dashboard` (substitute your branch). Make focused changes and run `npm run type-check`, `npm run test:run`, and `npm run build`. Inspect `git status` and `git diff`; stage intended changes with `git add <files>` and commit with `git commit -m "Describe the change"`. Push your feature branch with `git push -u origin <branch>` and open a pull request to `main` on GitHub. Request a teammate review, address feedback on the same branch, and merge once approved and checks pass, following the repository owner's rules. Afterwards switch to main and run `git pull --ff-only`; create a new branch for the next task.

The `input-output/` archive is private and ignored. Tests use compact fixtures or skip archive comparisons when it is absent; never add the archive to Git or deployment assets. Pull requests run CI without Cloudflare secrets. Deployment is manual and documented in [staging deployment](docs/cloudflare-staging.md).
