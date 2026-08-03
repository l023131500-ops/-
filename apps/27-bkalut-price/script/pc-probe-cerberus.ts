// One-off probe: verify Cerberus login + CSRF + file discovery for each chain.
// Does NOT write to the DB. Usage: node $TSX_BIN script/pc-probe-cerberus.ts
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// --- TLS bootstrap (mirror of pc-daily-import.ts): the Cerberus portal omits
// the Sectigo intermediate, so Node needs NODE_EXTRA_CA_CERTS pointed at our
// bundled intermediate before any TLS handshake. Re-exec ourselves once. ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CA = path.join(__dirname, "pc", "certs", "sectigo-server-auth-dv-r36.pem");
if (
  existsSync(CA) &&
  process.env.PC_CA_BOOTSTRAPPED !== "1" &&
  process.env.NODE_EXTRA_CA_CERTS !== CA
) {
  const r = spawnSync(
    process.execPath,
    [...process.execArgv, ...process.argv.slice(1)],
    {
      stdio: "inherit",
      env: { ...process.env, NODE_EXTRA_CA_CERTS: CA, PC_CA_BOOTSTRAPPED: "1" },
    },
  );
  process.exit(r.status ?? 1);
}

const { discover } = await import("./pc/adapters.ts");

const CHAINS = [
  { id: 5, chain_name: "אושר עד", auth_user: "osherad" },
  { id: 6, chain_name: "יוחננוף", auth_user: "yohananof" },
  { id: 7, chain_name: "חצי חינם", auth_user: "HaziHinam" },
  { id: 8, chain_name: "טיב טעם", auth_user: "TivTaam" },
  { id: 9, chain_name: "מגה / קרפור", auth_user: "Carrefour" },
];

function mkFeed(c: { id: number; chain_name: string; auth_user: string }) {
  return {
    id: c.id,
    chain_name: c.chain_name,
    chain_id: null,
    source_url: null,
    source_type: "cerberus",
    feed_format: "xml",
    feed_kinds: null,
    auth_user: c.auth_user,
    notes: null,
    verified: 0,
    active: 0,
    adapter: "cerberus",
    direct_file_url: null,
    discovery_url: "https://url.publishedprices.co.il",
    max_files_per_run: 10,
    last_status: null,
    last_run_at: null,
    last_message: null,
    last_error: null,
    last_success_at: null,
  };
}

for (const c of CHAINS) {
  const label = `[${c.id}] ${c.chain_name} (${c.auth_user})`;
  try {
    const res = await discover(mkFeed(c) as any);
    const files = res.files ?? [];
    const sample = files.slice(0, 3).map((f: any) => f.fileName).join(", ");
    const noteStr = (res.notes && res.notes.length) ? ` notes=${JSON.stringify(res.notes)}` : "";
    console.log(
      `OK   ${label} — קבצים=${files.length} skeleton=${res.skeleton} [${sample}]${noteStr}`,
    );
  } catch (e: any) {
    const cause = e?.cause ? ` cause=${e.cause?.code || e.cause?.message || e.cause}` : "";
    console.log(`FAIL ${label} — ${e?.message || e}${cause}`);
  }
}
