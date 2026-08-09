/**
 * Storage-only catalog store (no database table, no schema) — maximum isolation
 * from the shared project: the ONLY footprint is one public Storage bucket
 * (`gannenet-shelf`). Uploaded-item metadata lives in a single `index.json`
 * object inside that bucket. All access is server-side (the anon key is never
 * exposed to the browser; uploads go through the validated /api/catalog route).
 *
 * If env is unset the app still works fully with the repo seed catalog.
 */
import type { ShelfItem } from "@/lib/catalog";

const URL_ = process.env.SUPABASE_URL || "";
const KEY_ = process.env.SUPABASE_ANON_KEY || "";
const BUCKET = "gannenet-shelf";
const INDEX = "index.json";

export const supabaseReady = Boolean(URL_ && KEY_);

function authHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY_, Authorization: `Bearer ${KEY_}`, ...extra };
}

export function publicUrl(path: string): string {
  return `${URL_}/storage/v1/object/public/${BUCKET}/${path}`;
}

type IndexEntry = {
  id: string;
  title: string;
  category: string;
  sender: string;
  date: string;
  mime: string;
  storage_path: string;
  sizeKB: number;
  kind: "pdf" | "image";
};

function entryToItem(e: IndexEntry): ShelfItem {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    sender: e.sender || "",
    date: e.date || "",
    mime: e.mime,
    file: publicUrl(e.storage_path),
    sizeKB: e.sizeKB || 0,
    kind: e.kind === "image" ? "image" : "pdf",
    source: "upload",
  };
}

// Authenticated read of the object (avoids CDN staleness). Missing => [].
async function readIndex(): Promise<IndexEntry[]> {
  if (!supabaseReady) return [];
  try {
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${INDEX}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as IndexEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(entries: IndexEntry[]): Promise<boolean> {
  const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${INDEX}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify(entries),
  });
  return res.ok;
}

export async function listUploaded(): Promise<ShelfItem[]> {
  const entries = await readIndex();
  // newest first
  return entries.slice().reverse().map(entryToItem);
}

export async function getUploaded(id: string): Promise<ShelfItem | null> {
  const entries = await readIndex();
  const e = entries.find((x) => x.id === id);
  return e ? entryToItem(e) : null;
}

export async function uploadItem(input: {
  title: string;
  category: string;
  sender: string;
  file: File;
}): Promise<{ ok: true; item: ShelfItem } | { ok: false; error: string }> {
  if (!supabaseReady) return { ok: false, error: "אחסון הענן אינו מוגדר (חסרים משתני SUPABASE)." };
  const { title, category, sender, file } = input;
  const isImage = file.type.startsWith("image/");
  const ext = file.name.includes(".") ? file.name.split(".").pop() : isImage ? "jpg" : "pdf";
  const id = `up_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const storagePath = `${id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const up = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" }),
    body: bytes,
  });
  if (!up.ok) return { ok: false, error: `העלאת הקובץ נכשלה (${up.status}): ${await up.text()}` };

  const entry: IndexEntry = {
    id,
    title,
    category,
    sender: sender || "",
    date: new Date().toISOString().slice(0, 10),
    mime: file.type || (isImage ? "image/jpeg" : "application/pdf"),
    storage_path: storagePath,
    sizeKB: Math.round(bytes.length / 1024),
    kind: isImage ? "image" : "pdf",
  };

  const entries = await readIndex();
  entries.push(entry);
  const ok = await writeIndex(entries);
  if (!ok) return { ok: false, error: "שמירת האינדקס נכשלה." };

  return { ok: true, item: entryToItem(entry) };
}
