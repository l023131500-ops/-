// Probe raw login for problematic Cerberus chains across username variants.
// Tells us whether login itself succeeds (302->/file) and how many files the
// directory lists. Does NOT write to DB.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CA = path.join(__dirname, "pc", "certs", "sectigo-server-auth-dv-r36.pem");
if (existsSync(CA) && process.env.PC_CA_BOOTSTRAPPED !== "1" && process.env.NODE_EXTRA_CA_CERTS !== CA) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: CA, PC_CA_BOOTSTRAPPED: "1" },
  });
  process.exit(r.status ?? 1);
}

const BASE = "https://url.publishedprices.co.il";
const UA = "bkalut-pc-import/1.0";

function parseCookies(setCookie: string[] | null): string {
  if (!setCookie) return "";
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

function metaCsrf(html: string): string | null {
  const m = html.match(/<meta\s+name=["']csrftoken["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function tryLogin(user: string, password: string) {
  // 1. GET /login to obtain cookie + csrf
  const r1 = await fetch(`${BASE}/login`, { headers: { "user-agent": UA } });
  let cookie = parseCookies(r1.headers.getSetCookie?.() ?? null);
  const html1 = await r1.text();
  const csrf1 = metaCsrf(html1);

  // 2. POST /login/user
  const body = new URLSearchParams({ username: user, password, csrftoken: csrf1 || "" });
  const r2 = await fetch(`${BASE}/login/user`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "user-agent": UA,
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
    body: body.toString(),
  });
  const setC2 = parseCookies(r2.headers.getSetCookie?.() ?? null);
  if (setC2) cookie = setC2 || cookie;
  const loc = r2.headers.get("location") || "";
  const status = r2.status;

  // 3. GET /file to refresh csrf
  const r3 = await fetch(`${BASE}/file`, { headers: { "user-agent": UA, cookie } });
  const html3 = await r3.text();
  const csrf3 = metaCsrf(html3);

  // 4. POST /file/json/dir
  const dirBody = new URLSearchParams();
  dirBody.set("sEcho", "1");
  dirBody.set("iColumns", "5");
  dirBody.set("sColumns", ",,,,");
  dirBody.set("iDisplayStart", "0");
  dirBody.set("iDisplayLength", "100000");
  dirBody.set("mDataProp_0", "fname");
  dirBody.set("mDataProp_1", "typeLabel");
  dirBody.set("mDataProp_2", "size");
  dirBody.set("mDataProp_3", "ftime");
  dirBody.set("mDataProp_4", "");
  dirBody.set("cd", "/");
  dirBody.set("csrftoken", csrf3 || "");
  const r4 = await fetch(`${BASE}/file/json/dir`, {
    method: "POST",
    headers: { "user-agent": UA, "content-type": "application/x-www-form-urlencoded", cookie },
    body: dirBody.toString(),
  });
  let count = -1;
  let firstNames: string[] = [];
  try {
    const j: any = await r4.json();
    const rows = j?.aaData ?? [];
    count = rows.length;
    firstNames = rows.slice(0, 4).map((x: any) => x.fname);
  } catch {
    count = -1;
  }
  return { status, loc, csrf1: !!csrf1, csrf3: !!csrf3, dirStatus: r4.status, count, firstNames };
}

const TARGETS: { label: string; users: string[] }[] = [
  { label: "חצי חינם (7290700100008)", users: ["HaziHinam", "hazihinam", "Hazi-Hinam", "HaziHinam2", "halfprice", "7290700100008"] },
  { label: "מגה / קרפור (7290055700007)", users: ["Carrefour", "carrefour", "mega", "Mega", "CarrefourIL", "7290055700007"] },
];

for (const t of TARGETS) {
  console.log(`\n=== ${t.label} ===`);
  for (const u of t.users) {
    try {
      const r = await tryLogin(u, "");
      console.log(
        `  user="${u}" pw="" -> login=${r.status}${r.loc ? " loc=" + r.loc : ""} dir=${r.dirStatus} files=${r.count}${r.firstNames.length ? " [" + r.firstNames.join(", ") + "]" : ""}`,
      );
    } catch (e: any) {
      console.log(`  user="${u}" pw="" -> ERROR ${e?.message || e}${e?.cause ? " cause=" + (e.cause?.code || e.cause) : ""}`);
    }
  }
}
