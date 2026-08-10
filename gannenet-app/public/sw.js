/* גננת בקליק — service worker: offline for the whole app (except AI) */
const VERSION = "gannenet-v1";
const SHELL = "shell-" + VERSION;
const FILES = "files-" + VERSION;
const CATALOG = "catalog-" + VERSION;

const CORE = [
  "/",
  "/shelf",
  "/shelf/upload",
  "/library",
  "/newsletter",
  "/calendar",
  "/pricing",
  "/generator",
  "/manifest.webmanifest",
  "/icon.svg",
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

const isFile = (u) => u.pathname.startsWith("/api/drive/");
const isCatalog = (u) => u.pathname === "/api/drive-catalog";
const isStatic = (u) =>
  u.pathname.startsWith("/_next/static") ||
  /\.(png|jpe?g|svg|gif|webp|css|js|woff2?|ico|webmanifest)$/.test(u.pathname);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // leave cross-origin alone

  // Never cache admin surfaces or the AI generator API — must stay live.
  if (
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/shelf/admin") ||
    url.pathname.startsWith("/api/generate")
  ) {
    return;
  }

  if (isFile(url)) return e.respondWith(cacheFirst(req, FILES));
  if (isCatalog(url)) return e.respondWith(staleWhileRevalidate(req, CATALOG));
  if (isStatic(url)) return e.respondWith(cacheFirst(req, SHELL));
  if (req.mode === "navigate") return e.respondWith(navigation(req));
  return e.respondWith(networkFirst(req, SHELL));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetching = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || fetching;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function navigation(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(req)) ||
      (await cache.match("/shelf")) ||
      (await cache.match("/")) ||
      Response.error()
    );
  }
}

// "Save for offline" — the page posts a list of file URLs to pre-cache.
self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "PREFETCH" && Array.isArray(data.urls)) {
    e.waitUntil(
      (async () => {
        const cache = await caches.open(FILES);
        let done = 0;
        for (const u of data.urls) {
          try {
            const res = await fetch(u);
            if (res && res.ok) await cache.put(u, res.clone());
          } catch {}
          done++;
          const clients = await self.clients.matchAll();
          clients.forEach((c) => c.postMessage({ type: "PREFETCH_PROGRESS", done, total: data.urls.length }));
        }
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: "PREFETCH_DONE", total: data.urls.length }));
      })()
    );
  }
});
