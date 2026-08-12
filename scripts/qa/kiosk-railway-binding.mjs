#!/usr/bin/env node
// 35 kioskfleet — the one live system the server-side-binding sweep left out.
//
// QA/platform/server-side-binding-0812 asked Vercel's production environment
// which Supabase project each keyless system talks to, and recorded in writing
// that 35 sits on Railway and was therefore not measured. This closes that.
//
// The Railway half (variable names, volume mount, source repo) is read through
// the Railway MCP tools and cannot be re-run from plain node — the exact ids
// are pinned below so the next round can re-ask it in three calls instead of
// hunting for them.
//
// The half that IS re-runnable from here is the live one, and it is also §1ב's
// acceptance test: admin / More30Admin2026 must sign in on production.
//
// Read-only apart from the login itself, which mints a token and writes nothing.
// Probe more30.com, never *.up.railway.app — NetFree answers Railway with 418.

const BASE = 'https://more30.com/kiosk';

// Railway coordinates, pinned from get-service-config on 12/08/2026.
export const RAILWAY = {
  projectId: '776b3989-21c4-40d7-8232-893cf169ed3d',
  serviceId: '93efbfc0-bb13-4ccb-af69-2807a7bd693c',
  environmentId: '04950e10-9fa7-4e7c-a7df-fa989c46696d',
  source: { repo: 'l023131500-ops/zol', branch: 'claude/what-do-you-see-gxo5tc', rootDirectory: 'kiosk/server' },
  volumeMount: '/app/data',
};

const CREDS = { username: 'admin', password: 'More30Admin2026' }; // §1ב, core.secrets

async function probe(path, init = {}) {
  const res = await fetch(BASE + path, init);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { path, status: res.status, body };
}

const out = { at: new Date().toISOString(), base: BASE, railway: RAILWAY, checks: {} };

// 1. alive, and mounted where it thinks it is
const health = await probe('/api/health');
out.checks.health = {
  status: health.status,
  ok: health.body?.ok === true,
  basePath: health.body?.basePath ?? null,
  basePathCorrect: health.body?.basePath === '/kiosk',
};

// 2. §1ב — the shared admin credential signs in
const login = await probe('/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(CREDS),
});
const token = login.body?.token ?? null;
out.checks.login = {
  status: login.status,
  ok: login.status === 200 && !!token,
  user: login.body?.user ?? null,
  role: login.body?.user?.role ?? null,
};

// 3. the data behind it — real rows, whatever the count turns out to be
if (token) {
  const devices = await probe('/api/devices', { headers: { authorization: `Bearer ${token}` } });
  out.checks.devices = {
    status: devices.status,
    count: Array.isArray(devices.body?.devices) ? devices.body.devices.length : null,
  };
}

out.verdict = {
  supabaseBinding: 'none — no SUPABASE_* variable exists on the service',
  dataStore: 'SQLite at $DB_PATH on the Railway volume mounted at /app/data',
  registryMatches: true, // core.projects: supabase_project = null, supabase_schema = null
  seedAdminHolds: out.checks.login.ok,
};

console.log(JSON.stringify(out, null, 2));
