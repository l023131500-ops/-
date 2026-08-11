// Removes the QA upload this run's first pass left behind (the probe sent the
// delete route the wrong field name). Product path only: /api/admin/delete.
import { readFileSync } from "node:fs";
const APP = "C:/Users/USER/Downloads/more30/apps/40-gannenet";
const ORIGIN = "http://localhost:3043/gannenet";
const env = Object.fromEntries(
  readFileSync(`${APP}/.env.local`, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
);

const before = await fetch(`${ORIGIN}/api/catalog`).then((r) => r.json());
console.log("uploaded items before:", before.items.length, before.items.map((i) => i.id));

for (const it of before.items) {
  const r = await fetch(`${ORIGIN}/api/admin/delete`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": env.ADMIN_PASSWORD || "" },
    body: JSON.stringify({ fileId: it.id }),
  });
  console.log(`  delete ${it.id} -> ${r.status} ${(await r.text()).slice(0, 160)}`);
}

const after = await fetch(`${ORIGIN}/api/catalog`).then((r) => r.json());
console.log("uploaded items after:", after.items.length);
const drive = await fetch(`${ORIGIN}/api/drive-catalog`).then((r) => r.json());
console.log("drive catalog:", drive.items.length);
