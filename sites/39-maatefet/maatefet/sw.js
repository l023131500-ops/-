/* מעטפת — service worker: app-shell offline only.
 *
 * ⚠️ אסור לקבוע במטמון תשובות RPC/API עם מידע אישי (הצפנת-שדה, 2FA) — לכן
 * המטמון מוגבל ל-shell הסטטי (HTML/manifest/icon) בלבד. כל קריאה שאינה GET,
 * וכל קריאה חוצת-מקור (Supabase/פונטים), פשוט לא נוגעים בה ועוברת ישר לרשת —
 * אותו עיקרון בדיוק כמו apps/40-gannenet/public/sw.js.
 * admin.html מכוון אדמינים בלבד ומוצא בכוונה מרשימת ה-shell: המסך הזה חייב
 * להיות תמיד עדכני-לרשת, לא PWA offline.
 */
const VERSION = "maatefet-v1";
const SHELL = "shell-" + VERSION;

const CORE = [
  "/maatefet/",
  "/maatefet/index.html",
  "/maatefet/portal.html",
  "/maatefet/instructor.html",
  "/maatefet/join.html",
  "/maatefet/manifest.webmanifest",
  "/maatefet/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // RPCs are POST — never intercepted
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase/fonts stay live, uncached
  if (url.pathname.startsWith("/maatefet/admin.html")) return; // admin always live

  if (req.mode === "navigate") return e.respondWith(networkFirstNav(req));
  if (CORE.some((p) => url.pathname === p)) return e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function networkFirstNav(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(req)) ||
      (await cache.match("/maatefet/portal.html")) ||
      (await cache.match("/maatefet/")) ||
      Response.error()
    );
  }
}
