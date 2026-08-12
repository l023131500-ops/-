import { NextRequest } from "next/server";
import { getUploaded } from "@/lib/supabase";
import { isHiddenFile } from "@/lib/overrides";
import { contentDisposition, downloadFilename } from "@/lib/download-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `up_<base36 ms>_<base36 rand>.<ext>` — exactly the object names `uploadItem()`
// writes at the root of the bucket, and nothing else. No slash and no second dot
// can match, so nothing here can be walked out of the bucket root.
const NAME_RE = /^up_[a-z0-9]+_[a-z0-9]+\.[a-z0-9]{1,8}$/;

const BUCKET = "gannenet-shelf";

/**
 * Streams an uploaded shelf file out of the `gannenet-shelf` bucket through our
 * own origin — the third and last source to get this, after /api/drive/[id]
 * (Drive) and /api/shelf/[name] (the seed files).
 *
 * Until this route existed, `entryToItem()` handed the browser the bucket's
 * public URL on `supabase.co`, and everything the other two sources get from
 * being same-origin, uploaded material did not have: the download button could
 * not download (no `Content-Disposition` to set, and `download` is ignored
 * cross-origin), the PDF viewer could not read the file (it reads with
 * `fetch()`), the service worker skipped it (`url.origin !== location.origin`),
 * "שמירת התצוגה לאופליין" filtered it out, and it put a file the app serves back
 * on an off-domain host — which is the thing serving under more30.com exists to
 * avoid.
 */
/**
 * A missing object does not always arrive as 404. On this project's network the
 * upstream status of a Supabase error is rewritten to **400** and the real one
 * is carried in the body (`{"statusCode":"404",...}`) — the same reason
 * `deleteObject()` in `lib/supabase.ts` reads the body rather than the status.
 *
 * Now that an upload can be deleted, "gone" and "broken" are no longer the same
 * answer: the service worker drops its offline copy on the first and keeps it on
 * the second, so collapsing both into 502 would leave a deleted file being
 * served out of a teacher's own browser for ever.
 */
async function isGone(res: Response): Promise<boolean> {
  if (res.status === 404 || res.status === 410) return true;
  const body = await res.text().catch(() => "");
  return /"?statusCode"?\s*:\s*"?404|not_?found/i.test(body);
}

async function fromStorage(name: string, method: "GET" | "HEAD" = "GET") {
  // `cache: "no-store"` below is Next's own fetch cache and says nothing to
  // Supabase's CDN, which sits in front of the object — and the two were
  // measured **disagreeing about whether this file exists**: seconds after
  // /api/admin/delete removed it, an upstream HEAD said gone and an upstream GET
  // for the same URL returned 200 and all 29,278 bytes, so the route answered
  // 502 ("broken") for a file that was deleted. `lib/overrides.ts` documents the
  // same CDN and the same remedy: a request header does not dislodge it, a
  // distinct URL does. Deletability is worth more here than edge caching of a
  // handful of uploaded files, and our own `max-age=300` still absorbs the
  // repeat views.
  const bust = `?t=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return fetch(`${(process.env.SUPABASE_URL || "").replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${name}${bust}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ""}`,
    },
    // Not optional. Next caches `fetch()` in a route handler by default, and it
    // held the bytes: measured right after /api/admin/delete removed the object,
    // Storage answered "gone" for the very same URL while this route kept
    // returning **200 and the full body**. An upload can now be deleted, so the
    // one thing that must never be served from a cache is this.
    cache: "no-store",
  });
}

/**
 * The title the teacher typed on `/shelf/upload`, which is what the card on the
 * shelf says and so what she expects the saved file to be called. It costs one
 * small GET of the upload's own metadata object, so it is asked for on the
 * download path only — a view does not need a filename at all.
 */
async function titleFor(name: string): Promise<string | undefined> {
  const item = await getUploaded(idOf(name)).catch(() => null);
  return item?.title;
}

const idOf = (name: string) => name.slice(0, name.lastIndexOf("."));

/**
 * The admin screen says הסתרת קובץ "מסירה אותו מהאתר לגמרי", and until this
 * check existed that was not true of the file itself. `/shelf/[id]`, the shelf
 * list and `/api/catalog` all honoured `hidden`; this route — the URL those
 * three link *at*, and the one the download button opens — consulted nothing and
 * kept serving the bytes. Measured on production against a hidden upload:
 * `200 image/png 2441B` (QA/gannenet/hide-roundtrip-0812/_results.txt). Anyone
 * who had the address from before it was hidden — a shared link, a browser
 * history entry, the service worker's own offline copy — still had the material,
 * which is exactly what a teacher hides a file to stop.
 *
 * 404 and not 403: "gone" is what makes the service worker drop its cached copy
 * (see the comment on `isGone`), so hiding evicts the file from the browsers
 * that already took it instead of leaving it readable offline for ever.
 */
async function hidden(name: string): Promise<boolean> {
  return isHiddenFile(idOf(name)).catch(() => false);
}

function outHeaders(upstream: Response, dl: boolean, title?: string, name?: string) {
  const headers = new Headers();
  const type = upstream.headers.get("content-type") || "application/octet-stream";
  headers.set("Content-Type", type);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set("Content-Disposition", contentDisposition(dl, downloadFilename({ title, mime: type, objectName: name })));
  // An upload object is written once under a fresh id and never rewritten, so
  // while it exists the same URL is always the same bytes — which is what the
  // old `max-age=86400` was for. It can now be *deleted* though, and a browser
  // copy that outlives the delete by a day also re-populates the service
  // worker's FILES cache the moment that cache is correctly evicted. Offline
  // reading is the FILES cache's job, not the HTTP cache's, so both layers now
  // revalidate on the same five minutes.
  headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return headers;
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const name = params.name;
  if (!NAME_RE.test(name)) return new Response("bad name", { status: 400 });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    return new Response("storage not configured", { status: 503 });

  try {
    if (await hidden(name)) return new Response("gone", { status: 404 });
    const upstream = await fromStorage(name);
    if (!upstream.ok || !upstream.body) {
      return (await isGone(upstream))
        ? new Response("gone", { status: 404 })
        : new Response("upstream error", { status: 502 });
    }
    const dl = req.nextUrl.searchParams.get("dl") === "1";
    return new Response(upstream.body, {
      status: 200,
      headers: outHeaders(upstream, dl, dl ? await titleFor(name) : undefined, name),
    });
  } catch {
    return new Response("fetch failed", { status: 500 });
  }
}

/**
 * The existence check the service worker makes before it drops a teacher's
 * cached copy of a file. It has to be cheap — re-pulling a 6MB PDF on every view
 * of a file she already has would undo the offline cache it is protecting — so
 * it asks Storage with HEAD too and never moves a body at all.
 *
 * Two things were measured rather than assumed on the way here. Next does *not*
 * derive HEAD from GET for this route, so the handler is needed. And the obvious
 * shape — reuse the GET upstream and `body.cancel()` it — **hangs**: the 400 and
 * 404 answers came back, and the one that had bytes behind it never returned a
 * byte, not even its headers (`probes.mjs` run 1 and 2, and a raw `http.request`
 * that timed out before the status line). With no body fetched there is nothing
 * to cancel and nothing to hang on.
 */
export async function HEAD(req: NextRequest, { params }: { params: { name: string } }) {
  const name = params.name;
  if (!NAME_RE.test(name)) return new Response(null, { status: 400 });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    return new Response(null, { status: 503 });

  try {
    if (await hidden(name)) return new Response(null, { status: 404 });
    const upstream = await fromStorage(name, "HEAD");
    if (upstream.ok) {
      // No metadata read here: the service worker's existence check is the only
      // caller and it must stay cheap. The name a body-less response would carry
      // is never used.
      const headers = outHeaders(upstream, req.nextUrl.searchParams.get("dl") === "1", undefined, name);
      // The size is not what a HEAD is being asked for, and announcing it on a
      // body-less response makes the client wait for bytes that never come.
      headers.delete("Content-Length");
      return new Response(null, { status: 200, headers });
    }
    // A HEAD carries no body, and on this project's network an absent object
    // answers **400** with the real 404 only in the body — so gone-or-broken
    // cannot be decided from a HEAD here. That costs one GET, on the failing
    // path only, where there are no bytes to move anyway.
    return new Response(null, { status: (await isGone(await fromStorage(name))) ? 404 : 502 });
  } catch {
    return new Response(null, { status: 500 });
  }
}
