import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  // In the published production sandbox, static assets are served from S3 and
  // the local `public` directory may be absent. In that case we must NOT throw
  // (that would crash the backend and make every /api route return 404 from the
  // proxy). We only wire up static serving when the directory actually exists.
  if (!fs.existsSync(distPath)) {
    console.warn(
      `[static] build directory not found at ${distPath}; skipping local static serving (assets served externally).`,
    );
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
