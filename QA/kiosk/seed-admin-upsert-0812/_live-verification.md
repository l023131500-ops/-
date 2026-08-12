# Live verification — more30.com/kiosk, after the deploy

kioskfleet does **not** deploy from this monorepo. Railway service
`kioskfleet` (project 776b3989-21c4-40d7-8232-893cf169ed3d) builds from
`l023131500-ops/zol`, branch `claude/what-do-you-see-gxo5tc`, rootDirectory
`kiosk/server` — a different repo entirely, and only `STATUS.md` and `app.json`
of this app are tracked here. A commit to `fix/nadlan-a11y` alone would have
left the fix on the shelf, so the three files were also written to that repo
through the GitHub contents API.

Order was deliberate: `seedadmin.js` first, then its test, then `seed.js` last.
Each write is its own commit and each commit is its own Railway deploy, so
shipping `seed.js` before the module it imports would have put one deploy into
a boot loop.

    3fd7a15  kiosk/server/src/seedadmin.js         (new)
    e78c246  kiosk/server/test/seedadmin.test.mjs  (new)
    35099db  kiosk/server/src/seed.js              (was 612176b — byte-identical
                                                    to the local copy this
                                                    change started from)

Deployment `7ea591a6-81ff-4eaf-a48a-b14958bb3e80` (commit 35099db) → SUCCESS.

## Boot log

    db: /app/data/kioskfleet_v2.db — existing file (data persisted)
    KioskFleet server running (production)

No seed line, which is the correct report and worth stating plainly: the row
already matched `SEED_ADMIN_PASSWORD`, so `applySeedAdmin` returned `unchanged`
and wrote nothing. Today's deployment was not in the broken state — this change
is the guarantee that it stays out of it, not a repair of it. The volume mount
at `/app/data` is why it could have drifted silently: the database survives
every deploy, so under the old create-if-empty check the environment variable
had not been consulted since the file was created.

## The credential §1ב documents, against production

    POST https://more30.com/kiosk/api/auth/login
    {"username":"admin","password":"More30Admin2026"}

    200
    {"id":1,"username":"admin","role":"admin","fullName":"מנהל מערכת","deviceLimit":9999}
    token: present

Checked through `more30.com`, not the Railway hostname — NetFree answers
`*.up.railway.app` with 418 from this machine, so a check there measures the
filter rather than the service.
