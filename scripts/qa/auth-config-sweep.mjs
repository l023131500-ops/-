#!/usr/bin/env node
// What every reachable Supabase project declares about signing up (§1א, core.issues #172).
//
// The 12/08 sweep (QA/platform/autoconfirm-0812) asked this question through the
// *live sites*: pull each production bundle, find the SUPABASE_URL + anon key it
// carries, call the public GET /auth/v1/settings. That was the right tool then —
// it needed no credentials — but it can only see the handful of fields GoTrue
// publishes anonymously, and it can only see a project that some live page
// happens to embed. It closed with "none of the eight other projects is visible
// from this environment (list_projects returns one)".
//
// That sentence is what this script exists to stop repeating. The MCP server does
// show one project; SUPABASE_ACCESS_TOKEN shows ten, and for those ten the
// Management API returns the whole auth config — including site_url and
// smtp_host, which /auth/v1/settings never exposes. Measure before honouring a
// block: on 13/08 this found csjekrvukbdznetsrodj already flipped to
// mailer_autoconfirm=true, three live systems (06, 12, 17) still filed as broken
// under a reading that was a day out of date.
//
// Read-only. It creates no user, sends no mail and writes no config. Flipping a
// setting is a separate, deliberate act — and on bkalut-production it is the
// user's, because that project carries the protected 08/09.
//
// The token is not in this file and must not be: it lives in core.secrets
// (name='SUPABASE_ACCESS_TOKEN', service='supabase-management'), readable
// through the Supabase MCP. Pass it in the environment.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_… node scripts/qa/auth-config-sweep.mjs [--json]

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error(
    'SUPABASE_ACCESS_TOKEN is unset. It is not on disk — read it from core.secrets\n' +
      "  select value from core.secrets where name='SUPABASE_ACCESS_TOKEN';\n" +
      'and pass it in the environment for this one command.',
  );
  process.exit(2);
}

const API = 'https://api.supabase.com/v1';
const auth = { Authorization: `Bearer ${TOKEN}` };

// Projects that carry a protected system (RUN_INSTRUCTIONS "מוגן"). Reported
// like any other — reading is allowed and the answer matters — but marked, so a
// later run does not read "autoconfirm off" as work waiting to be done here.
const PROTECTED = {
  bieebmnmkffwbqlsfozh: 'נושא את 08 בקלות זכאות ו-09 בקלות ניהול',
};

async function get(path) {
  const res = await fetch(API + path, { headers: auth });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const projects = await get('/projects');

const rows = [];
for (const p of projects) {
  const row = { ref: p.id, name: p.name, region: p.region, status: p.status };
  try {
    const c = await get(`/projects/${p.id}/config/auth`);
    Object.assign(row, {
      autoconfirm: c.mailer_autoconfirm === true,
      signup_disabled: c.disable_signup === true,
      site_url: c.site_url ?? null,
      custom_smtp: Boolean(c.smtp_host),
      // A reset link is only delivered somewhere real if site_url is. The
      // twin of #198: csjekrvukbdznetsrodj shipped every reset mail pointing
      // at http://localhost:3000 — the recipient's own machine.
      site_url_is_local: /localhost|127\.0\.0\.1/i.test(c.site_url ?? ''),
    });
  } catch (e) {
    row.error = e.message;
  }
  if (PROTECTED[p.id]) row.protected = PROTECTED[p.id];
  rows.push(row);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ reachable: rows.length, projects: rows }, null, 2));
} else {
  console.log(`SUPABASE_ACCESS_TOKEN reaches ${rows.length} projects\n`);
  const pad = (s, n) => String(s ?? '').padEnd(n);
  console.log(pad('ref', 22) + pad('autoconfirm', 13) + pad('signup', 9) + 'site_url');
  for (const r of rows) {
    if (r.error) {
      console.log(pad(r.ref, 22) + 'ERROR ' + r.error);
      continue;
    }
    console.log(
      pad(r.ref, 22) +
        pad(r.autoconfirm ? 'on' : 'OFF', 13) +
        pad(r.signup_disabled ? 'CLOSED' : 'open', 9) +
        (r.site_url_is_local ? `${r.site_url}  ← local` : r.site_url) +
        (r.protected ? `   [מוגן: ${r.protected}]` : ''),
    );
  }

  const needsConfirm = rows.filter((r) => !r.error && !r.autoconfirm);
  const local = rows.filter((r) => r.site_url_is_local);
  console.log(
    `\n${needsConfirm.length} require email confirmation · ${local.length} still point their mail at localhost`,
  );
}

// Exit code is about reachability, not about the settings: a project whose
// config cannot be read is the thing that would silently shrink this report.
process.exit(rows.some((r) => r.error) ? 1 : 0);
