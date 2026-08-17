// Base path the app is served under (e.g. "/40" on more.30.com, "" standalone).
// next/link, next/image, /_next assets and public files are auto-prefixed by
// Next's `basePath`; this helper covers what Next does NOT prefix: fetch() calls,
// hardcoded file/href URLs, and the service worker.
export const BASE = process.env.NEXT_PUBLIC_APP_BASE_PATH || "";

export function withBase(path: string): string {
  if (!path || !path.startsWith("/")) return path;
  if (BASE && path.startsWith(BASE + "/")) return path; // already prefixed
  return BASE + path;
}

/**
 * URL for a "הורדת הקובץ" button. A file we stream through one of our own routes
 * (/api/shelf, /api/drive) is served `Content-Disposition: inline` by default,
 * and `?dl=1` is the only thing that makes those routes answer `attachment`.
 *
 * This used to be written `source === "drive" ? file + "?dl=1" : file`, with the
 * comment "local assets download directly" — true while the seed assets were
 * static files under public/, and false since they moved into the bucket behind
 * /api/shelf. So all 258 seed files had a download button whose href was
 * byte-identical to the "פתיחה בכרטיסייה חדשה" beside it: it opened the PDF
 * instead of saving it. (`public/sw.js`'s `isFile()` carried the same stale
 * assumption after that move and was fixed for the same reason.)
 *
 * Keyed on the URL rather than on `source`, so it stays right for whatever a
 * later source streams through /api/ — an uploaded file, once it does.
 */
export function downloadUrl(file: string): string {
  const url = withBase(file);
  if (!file.startsWith("/api/")) return url; // off-origin or a static asset
  return url + (url.includes("?") ? "&" : "?") + "dl=1";
}
