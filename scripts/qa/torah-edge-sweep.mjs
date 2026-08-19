#!/usr/bin/env node
// ============================================================================
// QA sweep — 01 torah-platform (Supabase project bieebmnmkffwbqlsfozh)
//
// Asks every deployed edge function the same question the mthbram / zchuyot /
// lux-manage sweeps asked: does it answer a caller who sends no `apikey` and no
// `Authorization` at all?
//
// Read-only by construction. Every probe body is deliberately incomplete so the
// handler returns on its own validation before it writes, charges or sends:
//   - activate-invite / admin-users / nedarim-admin / nedarim-create-payment /
//     ai-match-teacher  ->  POST {}  (each validates required fields first)
//   - nedarim-webhook   ->  OPTIONS only. A POST/GET there with a non-Nedarim IP
//     inserts a `rejected_ip` row into the live nedarim_transactions table, so it
//     is never sent.
//
// Usage: node scripts/qa/torah-edge-sweep.mjs [outDir]
// ============================================================================

import { writeFileSync, mkdirSync } from "node:fs";

const PROJECT = "bieebmnmkffwbqlsfozh";
const BASE = `https://${PROJECT}.supabase.co/functions/v1`;

const PROBES = [
  { fn: "activate-invite", method: "POST", body: {}, expect: "400 חסרים פרטים if reachable unauthenticated" },
  { fn: "admin-users", method: "POST", body: {}, expect: "401 אין הרשאה (gate is first)" },
  { fn: "ai-match-teacher", method: "POST", body: {}, expect: "400 missing lead_id if reachable unauthenticated" },
  { fn: "nedarim-admin", method: "POST", body: {}, expect: "401 missing auth token (gate is first)" },
  { fn: "nedarim-create-payment", method: "POST", body: {}, expect: "400 missing required fields if reachable unauthenticated" },
  { fn: "nedarim-webhook", method: "OPTIONS", body: null, expect: "200 ok — preflight only, never POSTed (it writes on reject)" },
];

const run = async ({ fn, method, body, expect }) => {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/${fn}`, {
      method,
      // deliberately no apikey, no Authorization
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return {
      fn, method, expect,
      status: res.status,
      ms: Date.now() - started,
      bytes: text.length,
      body: text.slice(0, 400),
    };
  } catch (e) {
    return { fn, method, expect, status: null, error: String(e?.message || e) };
  }
};

const outDir = process.argv[2] || "QA/torah-edge-sweep";
const results = [];
for (const p of PROBES) {
  const r = await run(p);
  results.push(r);
  console.log(`${String(r.status ?? "ERR").padEnd(4)} ${r.method.padEnd(7)} ${r.fn}  ${(r.body || r.error || "").slice(0, 120)}`);
}

mkdirSync(outDir, { recursive: true });
const payload = { project: PROJECT, base: BASE, at: new Date().toISOString(), results };
writeFileSync(`${outDir}/_results.json`, JSON.stringify(payload, null, 2), "utf8");
console.log(`\nwrote ${outDir}/_results.json`);
