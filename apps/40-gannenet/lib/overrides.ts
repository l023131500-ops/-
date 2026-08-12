// Server-only. Admin curation overrides, held in the existing Storage bucket
// (same isolation model as the upload index — no DB table).
//
// ONE OBJECT PER FILE: overrides/<fileId>.json = { hidden?, hiddenPages?, note? }
//
// It was a single overrides.json holding the whole map, and that made every save
// a read-modify-write of shared state: two admins saving at once, even on two
// different files, and one save was silently lost. Storage has no compare-and-set
// to close that, and both candidates were probed against the real bucket rather
// than assumed — `If-Match` is accepted and *ignored* on upload (a deliberately
// bogus ETag still returned 200 and still overwrote), and a lock object cannot be
// released, because the anon key may create and overwrite but not delete
// (create-if-absent on an existing key is a real atomic 409 `KeyAlreadyExists`,
// but DELETE is 403 `AccessDenied`). Write-then-verify was measured too and does
// not work: it reported a save as landed that a later write clobbered a moment
// after the check — `QA/gannenet/overrides-cas-0811/` has that run.
//
// Giving each file its own object removes the shared write instead of trying to
// guard it: two files are two keys and cannot collide at all, and two saves of
// the *same* file are last-writer-wins on one field, which is what a human would
// expect anyway. Clearing an override writes `{}` rather than deleting the
// object, since the anon key cannot delete; readers treat an empty entry as absent.
import type { ShelfItem } from "@/lib/catalog";

const URL_ = process.env.SUPABASE_URL || "";
const KEY_ = process.env.SUPABASE_ANON_KEY || "";
const BUCKET = "gannenet-shelf";
const PREFIX = "overrides";
// The map this replaced. Still read and folded in underneath the per-file
// objects, so a bucket written by the old code keeps its curation.
const LEGACY = "overrides.json";

export type Override = { hidden?: boolean; hiddenPages?: number[]; note?: string };
export type OverrideMap = Record<string, Override>;

export const overridesReady = Boolean(URL_ && KEY_);

function authHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY_, Authorization: `Bearer ${KEY_}`, ...extra };
}

function objectUrl(name: string, fresh = false) {
  // `cache: "no-store"` is Next's own fetch cache and says nothing to Supabase's
  // CDN, which sits in front of the object and was seen once serving
  // `x-cache: HIT` with a superseded body; a request-header `Cache-Control:
  // no-cache` did not dislodge it, a distinct URL did. Only the admin read-back
  // pays for that, so public catalog reads keep their edge caching.
  const bust = fresh ? `?t=${Date.now()}-${Math.random().toString(36).slice(2)}` : "";
  return `${URL_}/storage/v1/object/${BUCKET}/${name}${bust}`;
}

function clean(o: any): Override | null {
  if (!o || typeof o !== "object") return null;
  const next: Override = {};
  if (o.hidden) next.hidden = true;
  if (Array.isArray(o.hiddenPages) && o.hiddenPages.length) next.hiddenPages = o.hiddenPages;
  if (o.note) next.note = String(o.note);
  return Object.keys(next).length ? next : null;
}

async function getJson(name: string, fresh = false): Promise<any> {
  try {
    const res = await fetch(objectUrl(name, fresh), { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function putJson(name: string, body: any): Promise<boolean> {
  const res = await fetch(objectUrl(name), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function listOverrideFiles(): Promise<string[]> {
  try {
    const res = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix: PREFIX, limit: 1000 }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    // `id: null` rows are sub-folders, not objects.
    return rows.filter((r) => r && r.id && String(r.name).endsWith(".json")).map((r) => r.name);
  } catch {
    return [];
  }
}

export async function readOverrides(): Promise<OverrideMap> {
  if (!overridesReady) return {};
  const map: OverrideMap = {};

  const legacy = await getJson(LEGACY);
  if (legacy && typeof legacy === "object") {
    for (const [id, o] of Object.entries(legacy)) {
      const c = clean(o);
      if (c) map[id] = c;
    }
  }

  const names = await listOverrideFiles();
  const loaded = await Promise.all(
    names.map(async (n) => [n.replace(/\.json$/, ""), await getJson(`${PREFIX}/${n}`)] as const)
  );
  // Per-file objects are authoritative: an empty one clears a legacy entry.
  for (const [id, raw] of loaded) {
    if (raw === null) continue;
    const c = clean(raw);
    if (c) map[id] = c;
    else delete map[id];
  }
  return map;
}

// The write result is part of the return value on purpose: the caller reports
// "נשמר" to a human, and a discarded `false` here made that report a lie —
// with no bucket configured this returns false immediately.
export async function setOverride(
  fileId: string,
  patch: Override
): Promise<{ ok: true; override: Override } | { ok: false; reason: "unconfigured" | "write" }> {
  if (!overridesReady) return { ok: false, reason: "unconfigured" };
  const name = `${PREFIX}/${fileId}.json`;
  const current = clean(await getJson(name, true)) || {};
  const next = clean({ ...current, ...patch });
  if (!(await putJson(name, next || {}))) return { ok: false, reason: "write" };
  return { ok: true, override: next || {} };
}

/**
 * "Is this one file hidden?" — the same question `applyOverrides` answers for a
 * whole list, asked for a single id without listing the prefix.
 *
 * `readOverrides()` costs a LIST plus one GET per curated file, and the file
 * route (`/api/upload/[name]`) runs on every view and every download of every
 * uploaded material. It reads the file's own object and only falls back to the
 * legacy map when that object does not exist — which is the same precedence
 * `readOverrides()` uses: a per-file object is authoritative, and an empty one
 * (`{}`, what clearing writes, since the anon key may not delete) means *not*
 * hidden even if the legacy map says otherwise.
 *
 * Not cached on purpose. Hiding is a moderation action — "the material has a
 * parent's phone number on it" — and a TTL here is a window in which the file
 * keeps being served after a human pressed הסתר.
 */
export async function isHiddenFile(fileId: string): Promise<boolean> {
  if (!overridesReady) return false;
  const own = await getJson(`${PREFIX}/${fileId}.json`, true);
  if (own !== null) return Boolean(clean(own)?.hidden);
  const legacy = await getJson(LEGACY);
  return Boolean(clean(legacy?.[fileId])?.hidden);
}

// Apply to the public catalog: drop hidden files, attach hiddenPages.
export function applyOverrides(items: ShelfItem[], map: OverrideMap): ShelfItem[] {
  const out: ShelfItem[] = [];
  for (const i of items) {
    const o = map[i.id];
    if (o?.hidden) continue;
    out.push(o?.hiddenPages?.length ? { ...i, hiddenPages: o.hiddenPages } : i);
  }
  return out;
}
