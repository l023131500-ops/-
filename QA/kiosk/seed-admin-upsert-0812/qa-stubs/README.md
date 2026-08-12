# Stub packages — how the boot path in this folder was actually run

`apps/35-kioskfleet/server/node_modules` is not installed in this checkout, so
`src/db.js` (better-sqlite3) and `src/auth.js` (bcryptjs) cannot be imported and
the real boot path cannot run. The existing tests work around that by importing
only the dependency-free modules; that leaves `seed.js` itself — the wiring, the
log lines, the actual `config` values — measured by nothing.

These four stubs close that gap. Copy them in, run the harness, remove them:

```powershell
$nm = 'apps\35-kioskfleet\server\node_modules'
New-Item -ItemType Directory -Force -Path $nm | Out-Null
Copy-Item 'QA\kiosk\seed-admin-upsert-0812\qa-stubs\*' $nm -Recurse -Force

$env:DB_PATH='./data/qa-seed.db'; $env:SEED_ADMIN_USER='admin'; $env:SEED_ADMIN_PASSWORD='More30Admin2026'
cd QA\kiosk\seed-admin-upsert-0812
node qa-boot-seed.mjs boot1-empty      # created
node qa-boot-seed.mjs boot2-unchanged  # unchanged, identical hash
node qa-drift.mjs                      # password changed + demoted + deactivated
node qa-boot-seed.mjs boot3-after-drift # updated: password, role, active

Remove-Item $nm -Recurse -Force        # do not leave these behind
```

What each stub is, and what it is not:

- **better-sqlite3** — the four calls `db.js` makes (`prepare`, `exec`, `pragma`,
  `close`), forwarded to node's own `node:sqlite`. A real engine underneath, so
  the DDL, the UNIQUE constraint on `users.username` and the foreign keys are
  the real ones.
- **bcryptjs** — `hashSync`/`compareSync` over `crypto.scryptSync`, salted per
  call like the real thing. The salting is the part that matters: it is what
  makes "boot 2 leaves the hash byte-identical" a real measurement of the
  compare-before-write path rather than a string comparison.
- **jsonwebtoken**, **dotenv** — imported by `auth.js` and `config.js` at module
  load and never reached on this path. Present so the imports resolve, and they
  do nothing.

Do not leave them in `node_modules`. A later `npm install` writes the real
packages over them, but until it runs anything importing them gets a stub while
looking installed.
