/**
 * Storage-only catalog store (no database table, no schema) — maximum isolation
 * from the shared project: the ONLY footprint is one public Storage bucket
 * (`gannenet-shelf`). All access is server-side (the anon key is never exposed
 * to the browser; uploads go through the validated /api/catalog route).
 *
 * ONE OBJECT PER UPLOAD: uploads/<id>.json holds that upload's metadata.
 *
 * It was a single `index.json` holding the whole array, which made every upload
 * a read-modify-write of shared state — the same shape `lib/overrides.ts` was
 * moved off, and worse here, because the loser's *bytes* still land in the
 * bucket and only the entry naming them is lost, so the file becomes an orphan
 * nothing can list, reach or clean up. Measured before it was changed, two
 * concurrent uploads through the real route against the real bucket: eight
 * uploads all answered 200 and **one** entry survived. Storage offers no
 * compare-and-set to guard the shared write with — `QA/gannenet/overrides-cas-0811/`
 * has that probed against this bucket (`If-Match` accepted and ignored, a lock
 * object un-releasable because the anon key cannot DELETE, write-then-verify
 * still lossy). Two uploads are two keys and cannot collide at all.
 *
 * The same run found the second half of it: the authenticated read of
 * `index.json` is served by Supabase's CDN, which held an empty body while the
 * object itself was not empty. So `/api/catalog` showed nothing after a
 * successful upload, and every read-modify-write started from a stale array —
 * the reason all eight collapsed to one rather than the four a pure race would
 * cost. A per-upload object is written once and never mutated, so a cached copy
 * of it is the correct copy.
 *
 * If env is unset the app still works fully with the repo seed catalog.
 */
import type { ShelfItem } from "@/lib/catalog";

const URL_ = process.env.SUPABASE_URL || "";
const KEY_ = process.env.SUPABASE_ANON_KEY || "";
// Removal is the one operation the anon key cannot do: it may create and
// overwrite but DELETE is 403 `AccessDenied` (probed against this bucket in
// `QA/gannenet/overrides-cas-0811/`). So deletion — and only deletion — uses the
// service-role key. It is server-only, never reaches the browser, and is
// optional: with it unset the app runs exactly as before and the delete route
// answers 503 instead of pretending the file is gone.
const SERVICE_KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "gannenet-shelf";
const PREFIX = "uploads";
// The array this replaced. Still read and folded in underneath the per-upload
// objects, so a bucket written by the old code keeps its uploads. Nothing
// writes it any more, so a cached copy is the final copy and it needs no
// cache-buster.
const LEGACY = "index.json";

export const supabaseReady = Boolean(URL_ && KEY_);
export const deleteReady = Boolean(URL_ && SERVICE_KEY_);

function authHeaders(extra: Record<string, string> = {}) {
  return { apikey: KEY_, Authorization: `Bearer ${KEY_}`, ...extra };
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_KEY_, Authorization: `Bearer ${SERVICE_KEY_}`, ...extra };
}

/**
 * URL the browser gets for an uploaded file. This was the bucket's public URL on
 * `supabase.co` — the one source not streamed through our own origin, and so the
 * one source whose download button could not download, whose PDF the viewer
 * could not read (it reads with `fetch()`), and which the service worker and the
 * offline prefetch both skipped for being cross-origin. `/api/upload/[name]`
 * serves the same bytes from here.
 */
function fileUrl(objectName: string): string {
  return `/api/upload/${objectName}`;
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
  // מי העלה, כפי ששרת האימות אמר — לא כפי שהטופס הצהיר. `sender` הוא קרדיט
  // חופשי שהגננת מקלידה ואפשר להקליד בו כל דבר; אלה נכתבים מהטוקן שנבדק ב-
  // `lib/require-user.ts`. אופציונליים כי כל מה שהועלה לפני שהכתיבה נסגרה
  // מאחורי כניסה (וכל שורה מ-index.json הישן) אינו נושא אותם — וכזה חומר לא
  // שייך לאיש ולכן לא יופיע ב"החומרים שלי" של אף אחד.
  uploader_id?: string;
  uploader_email?: string;
};

function entryToItem(e: IndexEntry): ShelfItem {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    sender: e.sender || "",
    date: e.date || "",
    mime: e.mime,
    file: fileUrl(e.storage_path),
    sizeKB: e.sizeKB || 0,
    kind: e.kind === "image" ? "image" : "pdf",
    source: "upload",
  };
}

function isEntry(o: any): o is IndexEntry {
  return Boolean(o && typeof o === "object" && o.id && o.storage_path);
}

// Ids are `up_<base36 ms>_<base36 rand>`, so creation order is readable off the
// id itself — no field to add, and legacy entries sort with the new ones. The
// array's own order used to carry this, and per-object storage has no order.
function createdAt(e: IndexEntry): number {
  const stamp = Number.parseInt(String(e.id).split("_")[1] || "", 36);
  return Number.isFinite(stamp) ? stamp : Date.parse(e.date || "") || 0;
}

async function getJson(name: string, fresh = false): Promise<any> {
  try {
    // `cache: "no-store"` is Next's own fetch cache and says nothing to
    // Supabase's CDN, which sits in front of the object; only a distinct URL
    // dislodges it (`lib/overrides.ts` has the run that established this). It
    // matters now that entries can be deleted: a cached copy of a deleted
    // entry made deleteUpload() report a write failure on an idempotent retry.
    // Only that path pays for it — catalog reads keep their edge caching.
    const bust = fresh ? `?t=${Date.now()}-${Math.random().toString(36).slice(2)}` : "";
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}${bust}`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function putJson(name: string, body: any): Promise<boolean> {
  const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "x-upsert": "true" }),
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function listUploadFiles(): Promise<string[]> {
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

async function readEntries(): Promise<IndexEntry[]> {
  if (!supabaseReady) return [];
  const byId = new Map<string, IndexEntry>();

  const legacy = await getJson(LEGACY);
  if (Array.isArray(legacy)) {
    for (const e of legacy) if (isEntry(e)) byId.set(e.id, e);
  }

  const names = await listUploadFiles();
  const loaded = await Promise.all(names.map((n) => getJson(`${PREFIX}/${n}`)));
  // Per-upload objects are authoritative over the legacy array.
  for (const e of loaded) if (isEntry(e)) byId.set(e.id, e);

  return [...byId.values()].sort((a, b) => createdAt(b) - createdAt(a)); // newest first
}

export async function listUploaded(): Promise<ShelfItem[]> {
  return (await readEntries()).map(entryToItem);
}

/**
 * החומרים שמשתמש אחד העלה. הסינון נעשה כאן, בשרת, ולא בדפדפן: `entryToItem()`
 * לא מעביר את `uploader_email` ל-ShelfItem בכוונה, כך שכתובת המייל של מי
 * שהעלתה לא נשלחת לאף מבקר במדף הציבורי.
 *
 * מזהה ריק מחזיר רשימה ריקה ולא את הכול — כדי שתקלה בצד הקורא לא תהפוך את
 * "החומרים שלי" למדף של כולם.
 */
export async function listUploadedBy(uploaderId: string): Promise<ShelfItem[]> {
  if (!uploaderId) return [];
  return (await readEntries()).filter((e) => e.uploader_id === uploaderId).map(entryToItem);
}

export async function getUploaded(id: string): Promise<ShelfItem | null> {
  if (!supabaseReady) return null;
  const direct = await getJson(`${PREFIX}/${id}.json`);
  if (isEntry(direct)) return entryToItem(direct);
  const legacy = await getJson(LEGACY);
  const e = Array.isArray(legacy) ? legacy.find((x: any) => isEntry(x) && x.id === id) : null;
  return e ? entryToItem(e) : null;
}

export async function uploadItem(input: {
  title: string;
  category: string;
  sender: string;
  file: File;
  // מי שהטוקן שלה נבדק מול שרת האימות ב-`POST /api/catalog`. חובה: מאז שהכתיבה
  // נסגרה מאחורי כניסה אין נתיב שמגיע לכאן בלי מזהה, וחתימה אופציונלית הייתה
  // מחזירה בשקט את ההעלאה חסרת-הבעלים.
  uploader: { id: string; email: string | null };
}): Promise<{ ok: true; item: ShelfItem } | { ok: false; error: string }> {
  if (!supabaseReady) return { ok: false, error: "אחסון הענן אינו מוגדר (חסרים משתני SUPABASE)." };
  const { title, category, sender, file, uploader } = input;
  const isImage = file.type.startsWith("image/");
  // The extension is the only part of the object name that comes from the user
  // (`file.name`), and the object name is now also a route segment — so anything
  // that is not a plain short extension is replaced rather than stored. Keeps
  // /api/upload/[name]'s pattern total: every object this writes is reachable.
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = /^[a-z0-9]{1,8}$/.test(rawExt) && file.name.includes(".") ? rawExt : isImage ? "jpg" : "pdf";
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
    uploader_id: uploader.id,
    ...(uploader.email ? { uploader_email: uploader.email } : {}),
  };

  // One key of its own — no read, nothing shared, nothing to lose to a
  // concurrent upload. The bytes are already in the bucket at this point, so a
  // failure here is reported rather than swallowed: the caller can retry, and
  // an unreported failure is exactly what left an orphan blob behind before.
  if (!(await putJson(`${PREFIX}/${id}.json`, entry))) {
    return { ok: false, error: "שמירת פרטי החומר נכשלה. הקובץ הועלה — נסו לשלוח שוב." };
  }

  return { ok: true, item: entryToItem(entry) };
}

// Every blob this upload wrote. Keyed on the *object name*, not on the entry's
// `storage_path`, so it also reaches a file whose metadata write failed — the
// orphan class `uploadItem()` can still produce when the bucket accepts the
// bytes and then refuses the entry. Uploaded blobs sit at the bucket root
// (`<id>.<ext>`); the 258 seed assets are under `seed/`, so they are not listed
// here at all and no seed file can be named by this.
async function listBlobsFor(id: string): Promise<string[]> {
  try {
    const res = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix: "", limit: 1000 }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.filter((r) => r && r.id && String(r.name).startsWith(`${id}.`)).map((r) => String(r.name));
  } catch {
    return [];
  }
}

// Already-gone counts as success: the object is not there, which is what the
// caller asked for, and it makes the retry after a partial failure safe to run.
// Checking `res.status === 404` alone is not enough — a not-found delete arrives
// here as **400** with the 404 in the body (the same status rewriting the whole
// project sees on Supabase errors), so the body is what decides.
async function deleteObject(name: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
      method: "DELETE",
      headers: serviceHeaders(),
    });
    if (res.ok || res.status === 404) return true;
    const body = await res.text().catch(() => "");
    return /"?statusCode"?\s*:\s*"?404|not_?found/i.test(body);
  } catch {
    return false;
  }
}

/**
 * Remove uploaded material for good — bytes and entry both.
 *
 * The admin could only ever *hide* an upload (`lib/overrides.ts`), which drops it
 * from every shelf but leaves the blob in the bucket for ever; there was no code
 * path in this app that deletes anything. So the bucket only grew, a file a
 * teacher uploaded by mistake stayed retrievable to anyone who knew its URL, and
 * the orphans left by earlier failures had no way out except a hand-run script.
 *
 * Blobs first, entry last. The entry is the only thing that can name the blob, so
 * dropping it first would strand the bytes exactly the way an orphan is made;
 * this way a failure half-way leaves the material still listed and the retry is
 * idempotent. In between, the shelf shows an item whose file 404s — recoverable,
 * unlike an unreachable blob.
 */
export async function deleteUpload(
  id: string
): Promise<
  | { ok: true; removed: string[] }
  | { ok: false; reason: "unconfigured" | "missing" | "blob" | "entry" }
> {
  if (!supabaseReady) return { ok: false, reason: "unconfigured" };
  if (!deleteReady) return { ok: false, reason: "unconfigured" };

  const blobs = await listBlobsFor(id);
  const meta = `${PREFIX}/${id}.json`;
  const hasEntry = isEntry(await getJson(meta, true));
  const legacy = await getJson(LEGACY, true);
  const inLegacy = Array.isArray(legacy) && legacy.some((e: any) => isEntry(e) && e.id === id);
  if (!blobs.length && !hasEntry && !inLegacy) return { ok: false, reason: "missing" };

  const removed: string[] = [];
  for (const name of blobs) {
    if (!(await deleteObject(name))) return { ok: false, reason: "blob" };
    removed.push(name);
  }
  if (hasEntry) {
    if (!(await deleteObject(meta))) return { ok: false, reason: "entry" };
    removed.push(meta);
  }
  // The legacy array is the one shared object left, and rewriting it is normally
  // the read-modify-write this module was moved off. It is safe *here* and only
  // here: nothing writes `index.json` any more (see the note on LEGACY), so this
  // read cannot lose a concurrent write — there are none.
  if (inLegacy) {
    const next = legacy.filter((e: any) => !(isEntry(e) && e.id === id));
    if (!(await putJson(LEGACY, next))) return { ok: false, reason: "entry" };
    removed.push(`${LEGACY}#${id}`);
  }
  return { ok: true, removed };
}
