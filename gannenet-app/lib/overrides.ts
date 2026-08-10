// Server-only. Admin curation overrides, stored as a single JSON object in the
// existing Storage bucket (same isolation model as the upload index — no DB table).
//   overrides.json = { "<fileId>": { hidden?: bool, hiddenPages?: number[], note?: string } }
import type { ShelfItem } from "@/lib/catalog";

const URL_ = process.env.SUPABASE_URL || "";
const KEY_ = process.env.SUPABASE_ANON_KEY || "";
const BUCKET = "gannenet-shelf";
const OBJECT = "overrides.json";

export type Override = { hidden?: boolean; hiddenPages?: number[]; note?: string };
export type OverrideMap = Record<string, Override>;

export const overridesReady = Boolean(URL_ && KEY_);

function authHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY_, Authorization: `Bearer ${KEY_}`, ...extra };
}

export async function readOverrides(): Promise<OverrideMap> {
  if (!overridesReady) return {};
  try {
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${OBJECT}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === "object" ? (data as OverrideMap) : {};
  } catch {
    return {};
  }
}

export async function writeOverrides(map: OverrideMap): Promise<boolean> {
  if (!overridesReady) return false;
  const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${OBJECT}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify(map),
  });
  return res.ok;
}

export async function setOverride(fileId: string, patch: Override): Promise<OverrideMap> {
  const map = await readOverrides();
  const next: Override = { ...(map[fileId] || {}), ...patch };
  // prune empties so the object stays clean
  if (!next.hidden) delete next.hidden;
  if (!next.hiddenPages || next.hiddenPages.length === 0) delete next.hiddenPages;
  if (!next.note) delete next.note;
  if (Object.keys(next).length === 0) delete map[fileId];
  else map[fileId] = next;
  await writeOverrides(map);
  return map;
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
