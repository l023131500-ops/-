/**
 * Ad-studio API for the more30.com/studio deployment.
 *
 * The origin app (apps/26-modaot-studio) runs `registerRoutes` on a long-lived
 * Express server. Here the same `registerRoutes` — copied verbatim — is mounted
 * on an Express instance inside a single Vercel Function, so every route keeps
 * its exact path and response shape.
 *
 * Two things differ from the origin, both forced by serverless:
 *   - storage is Supabase instead of local SQLite (see _lib/server/storage.ts)
 *   - built-in templates are seeded lazily on first request instead of at boot
 */
import "./_lib/env";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createServer, type Server } from "node:http";
import { registerRoutes } from "./_lib/server/routes";
import { storage } from "./_lib/server/storage";
import { TEMPLATE_DEFS } from "./_lib/shared/templates";
import { getFormat } from "./_lib/shared/formats";

let appPromise: Promise<express.Express> | null = null;

async function seedIfEmpty(): Promise<void> {
  const existing = await storage.listTemplates();
  if (existing.some((t) => t.builtin === 1)) return;
  for (const def of TEMPLATE_DEFS) {
    const fmt = getFormat(def.format);
    const doc = def.build(fmt.width, fmt.height);
    await storage.createTemplate({
      category: def.category,
      style: def.style,
      format: def.format,
      name: def.name,
      width: doc.width,
      height: doc.height,
      layersJson: JSON.stringify({ background: doc.background, layers: doc.layers }),
      builtin: 1,
    });
  }
}

async function buildApp(): Promise<express.Express> {
  const app = express();
  // 25mb matches the origin — logo vectorization posts base64 image payloads.
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: false, limit: "25mb" }));

  // The portal proxies /studio/api/*; vercel.json passes the matched suffix as
  // __path. Rewrite the URL back to what registerRoutes expects before routing.
  app.use((req, _res, next) => {
    const url = new URL(req.url ?? "/", "http://local");
    const p = url.searchParams.get("__path");
    if (p) {
      url.searchParams.delete("__path");
      const qs = url.searchParams.toString();
      req.url = `/api/${p}${qs ? `?${qs}` : ""}`;
    }
    next();
  });

  // registerRoutes takes an http.Server (the origin uses it for websockets);
  // nothing listens here, it is only passed through.
  const httpServer: Server = createServer();
  await registerRoutes(httpServer, app);

  try {
    await seedIfEmpty();
  } catch (err) {
    // A seed failure must not take the whole API down — catalog routes read
    // from @shared and keep working regardless.
    console.error("[studio-api] template seed skipped:", (err as Error).message);
  }

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!appPromise) appPromise = buildApp();
    const app = await appPromise;
    (app as unknown as (rq: VercelRequest, rs: VercelResponse) => void)(req, res);
  } catch (err) {
    appPromise = null; // let the next request retry a failed cold start
    const message = err instanceof Error ? err.message : String(err);
    console.error("[studio-api] boot failed:", message);
    res.status(500).json({ ok: false, error: "studio API failed to start", detail: message });
  }
}
