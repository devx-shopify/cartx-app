# cartx on Fly.io: deploy fix and move to a team organization

**For:** Ansh. **Prepared by:** Vishvam, 26 Oct 2026.
**Why:** cartx (`cartx` app and `cartx-db`) lives in Ansh's personal Fly organization. Personal organizations can't have team members, so nobody else can deploy, read logs or help in an incident. The fix is to move cartx into a team organization and invite the team.

There are two parts. Part A is urgent and unblocks today's release. Part B is the planned move.

---

## Part A: Deploy today's release (urgent)

`main` has the cart-based upsells release (PR #36, commit `0b81f23`), but it is **not deployed**.

**What's wrong:** GitHub Actions has not run a job in this repo since 10 Aug. Since then every "Fly Deploy" run sat in "queued" with no runner and was cancelled (5 Sep, 24 Oct). Today's run is queued the same way. This is almost certainly GitHub Actions billing on the `devx-commerce` org (minutes used up, a $0 spending limit, or a failed payment). If Actions were disabled, the run would fail instead of waiting.

### A1. Deploy manually (gets us live today)

From an up-to-date `main`:

```bash
git checkout main && git pull
fly deploy --remote-only --app cartx
```

Then check:
- `https://cartx.fly.dev/health` returns 200.
- `fly logs --app cartx` shows the migration `20261022105305_upsell_rules` applied at boot (it only adds three tables: `UpsellRule`, `UpsellProduct`, `UpsellImport`).

After that, Vishvam runs `shopify app deploy` from `main` to release the drawer.

### A2. Fix GitHub Actions (so future merges deploy themselves)

An org admin checks, on GitHub, `devx-commerce`:
1. **Settings → Billing and plans:** Actions minutes used, spending limit, payment method.
2. **Settings → Actions → General:** Actions allowed for the org and for `cartx-app`.
3. **Settings → Actions → Runners:** GitHub-hosted runners allowed (the workflow uses `ubuntu-latest`).

Once fixed, cancel today's stuck run and re-run **Fly Deploy** from the Actions tab (it supports a manual run), or just let the next merge to `main` deploy.

---

## Part B: Move cartx to a team organization

### What moves and what doesn't

| Item | Moves with `fly apps move`? | Action |
|---|---|---|
| `cartx` app: machines, secrets, certificates, domains | Yes | `cartx.fly.dev` stays the same, so Shopify needs no change |
| Scheduled jobs (`analytics-rollup`, `analytics-retention`) | Yes, they are machines in the `cartx` app | Check they still run after the move |
| `cartx-db` (Postgres) | **No.** Fly does not support moving Postgres between orgs | Create a new database in the new org and copy the data |
| Private networking | Apps in different orgs can't reach each other | App and database must end up in the same org |
| GitHub deploy token (`FLY_API_TOKEN`) | Needs a new token | Create a deploy token after the move and update the GitHub secret |
| Billing | Moves to the new org | Add a payment method to the new org first |

**Downtime:** about 15 to 30 minutes, mostly the database copy. Do it at low traffic and tell merchants if needed.

### B1. Create the organization and invite the team (any time, no downtime)

```bash
fly orgs create devx-commerce        # or create it in the dashboard
fly orgs invite devx-commerce vishvam.joshi@devxlabs.ai
```

- Add a payment method to the new org.
- Make at least two people **admins** so the org never depends on one person.

### B2. Find out what kind of database `cartx-db` is

```bash
fly apps list                       # is cartx-db listed as an app? -> Fly Postgres (unmanaged)
fly mpg list                        # is it listed here?             -> Managed Postgres
fly status --app cartx-db           # size, region, volume
fly ssh console --app cartx -C 'printenv DATABASE_URL'   # how the app connects today
```

Note the size, region (`sin`) and the current `DATABASE_URL`.

### B3. Create the new database in the new org (no downtime)

**If `cartx-db` is Fly Postgres:**
```bash
fly postgres create --name cartx-db-v2 --org devx-commerce --region sin
```
Pick the same or bigger size and volume as today. Save the connection string it prints.

**If `cartx-db` is Managed Postgres:** create a cluster in the dashboard (Managed Postgres → Create) under the new org, region `sin`, same plan. Save the connection string.

### B4. Maintenance window: copy data and move the app

1. **Stop the app so nothing writes** (remember the machine count from `fly status --app cartx`, normally 2):
   ```bash
   fly scale count 0 --app cartx --yes
   ```
   The scheduled job machines are separate and only run hourly or daily. Start the window right after an hourly rollup.

2. **Dump the old database** (terminal 1 opens a tunnel, terminal 2 dumps):
   ```bash
   # Fly Postgres:
   fly proxy 15432:5432 --app cartx-db
   # Managed Postgres instead: fly mpg proxy <old-cluster-id>  (note the local port)

   pg_dump --format=custom --no-owner --no-acl \
     "postgres://<user>:<password>@localhost:15432/<dbname>" > cartx.dump
   ```

3. **Restore into the new database** (tunnel to the new one, then restore):
   ```bash
   fly proxy 25432:5432 --app cartx-db-v2      # or: fly mpg proxy <new-cluster-id>
   pg_restore --no-owner --no-acl --dbname \
     "postgres://<user>:<password>@localhost:25432/<dbname>" cartx.dump
   ```
   Quick check: row counts match for `Session`, `ThemeConfig`, `Store` and `AnalyticsEvent` on both databases.

4. **Move the app:**
   ```bash
   fly apps move cartx --org devx-commerce --yes
   ```

5. **Point the app at the new database and start it:**
   ```bash
   fly secrets set DATABASE_URL="<new connection string>" --app cartx --stage
   fly deploy --remote-only --app cartx
   fly scale count 2 --app cartx --yes
   ```
   Use the private address for the connection string (`.flycast` or `.internal`), now that app and database share an org.

### B5. Check everything

- [ ] `https://cartx.fly.dev/health` returns 200.
- [ ] The cartx admin opens inside Shopify, and Promotions and Upsells show existing data.
- [ ] On a store, the cart drawer loads, the progress bar and gifts work, and upsells show.
- [ ] `fly machines list --app cartx` lists `analytics-rollup` and `analytics-retention`, and the next run succeeds (Sentry cron monitors `cartx-rollup` and `cartx-retention` stay green).
- [ ] `fly logs --app cartx` shows no database errors.

### B6. CI and team access

```bash
fly tokens create deploy --app cartx --name "github-actions"
```
Put the token in GitHub → `cartx-app` → Settings → Secrets and variables → Actions → `FLY_API_TOKEN`. Then re-run **Fly Deploy** once to confirm CI deploys work (needs Part A2 fixed).

### B7. Clean up (after a week)

Keep the old `cartx-db` stopped but not deleted for about a week. Once everything is confirmed, delete it from the personal org.

### Rollback

If something goes wrong during the window:
1. `fly apps move cartx --org personal --yes` (if it was already moved).
2. `fly secrets set DATABASE_URL="<old connection string>" --app cartx`.
3. `fly scale count 2 --app cartx --yes`.

The old database is untouched by the copy, so rolling back loses nothing written before the window.

---

## Sources

- [Fly.io: Move an app between organizations](https://fly.io/docs/apps/move-app-org/)
- [Fly.io: App handover guide](https://fly.io/docs/apps/app-handover-guide/)
- [fly apps move](https://fly.io/docs/flyctl/apps-move/)
- [Fly.io: Organization roles and permissions](https://fly.io/docs/security/org-roles-permissions/)
- [fly orgs invite](https://fly.io/docs/flyctl/orgs-invite/)
- [Fly.io: Access tokens](https://fly.io/docs/security/tokens/)
- [Community: Moving a Postgres app to another Fly org](https://community.fly.io/t/moving-postgres-app-to-another-fly-org/17997)
- [Community: After moving app to new org, cannot connect to DB](https://community.fly.io/t/after-moving-app-to-new-org-cannot-connect-to-db/11857)
