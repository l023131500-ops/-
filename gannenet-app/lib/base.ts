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
