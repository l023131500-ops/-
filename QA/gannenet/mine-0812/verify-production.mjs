// "החומרים שלי" (40 gannenet) — verification against production, after deploy.
//
// Run: node QA/gannenet/mine-0812/verify-production.mjs
// Reads SUPABASE_URL / SUPABASE_ANON_KEY out of apps/40-gannenet/.env.local so
// no secret is written here; the sign-in uses the official §1ב test user.
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://more30.com/gannenet";
const cb = () => `cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;

const env = Object.fromEntries(
  readFileSync("apps/40-gannenet/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);

const out = { at: new Date().toISOString(), base: BASE, checks: [] };
const note = (name, status, detail) => {
  out.checks.push({ name, status, detail });
  console.log(`${String(status).padEnd(4)} ${name} — ${detail}`);
};

// 1. the screen exists and is the right screen
const page = await fetch(`${BASE}/shelf/mine?${cb()}`);
const html = await page.text();
note("GET /shelf/mine", page.status, `title present: ${html.includes("החומרים שלי")}`);

// 2. the list is refused without a session
const anon = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`);
note("GET /api/catalog?mine=1 (no auth)", anon.status, await anon.text());

// 3. …and with a token that is not a token
const bogus = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`, {
  headers: { Authorization: "Bearer not.a.real.token" },
});
note("GET /api/catalog?mine=1 (bogus token)", bogus.status, await bogus.text());

// 4. the public shelf read stays open — this route serves both
const pub = await fetch(`${BASE}/api/catalog?${cb()}`);
const pubBody = await pub.text();
note("GET /api/catalog (public)", pub.status, pubBody.slice(0, 120));

// 5. a real session opens it
const signIn = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: env.SUPABASE_ANON_KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: "test@more30.com", password: "More30Test2026" }),
});
const session = await signIn.json();
if (!signIn.ok) {
  note("sign-in test@more30.com", signIn.status, JSON.stringify(session).slice(0, 200));
} else {
  note("sign-in test@more30.com", signIn.status, `user ${session.user?.id}`);
  const mine = await fetch(`${BASE}/api/catalog?mine=1&${cb()}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await mine.text();
  note("GET /api/catalog?mine=1 (real token)", mine.status, body.slice(0, 200));
  // The uploader field is what the filter runs on, and it must not leak the
  // address it was written from.
  note("uploader_email absent from response", mine.status, String(!body.includes("uploader_email")));
}

writeFileSync("QA/gannenet/mine-0812/_results.json", JSON.stringify(out, null, 2), "utf8");
