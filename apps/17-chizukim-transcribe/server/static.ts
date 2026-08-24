import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

// The client build lands in dist/public, but where that sits relative to the
// server bundle depends on how it was built: the long-running server runs from
// dist/ (so ./public), while the Vercel function runs from api/ with the client
// served straight off the CDN. Try the known layouts and fall back to API-only
// mode instead of throwing — a missing client must not take the API down.
function findClientDir(): string | null {
  const candidates = [
    process.env.STATIC_DIR,
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist/public"),
  ].filter((p): p is string => !!p);

  return candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) ?? null;
}

export function serveStatic(app: Express) {
  const distPath = findClientDir();

  if (!distPath) {
    console.warn("[static] no client build found — serving API routes only");
    return;
  }

  // Vite fingerprints everything under assets/ with a content hash in the
  // filename, so a given URL's bytes never change — safe to cache for a year
  // as immutable. Everything else (index.html, manifest.json, the favicon)
  // has no hash and must be revalidated every request, or a stale index.html
  // could keep pointing at a bundle that's since been replaced.
  const assetsDir = path.join(distPath, "assets") + path.sep;
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        res.setHeader(
          "Cache-Control",
          filePath.startsWith(assetsDir)
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        );
      },
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
