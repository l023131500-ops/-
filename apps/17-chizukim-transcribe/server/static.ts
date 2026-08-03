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

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
