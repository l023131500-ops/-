// Serverless entry point for Vercel
// Same as index.ts but exports the app instead of calling listen()
import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Bootstrap routes and static files, then export
let ready: Promise<void> | null = null;

function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await registerRoutes(httpServer, app);

      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });

      serveStatic(app);
    })();
  }
  return ready;
}

// When deployed under a path prefix (more30.com/chizukim), every request still
// arrives with that prefix attached. Express routes are declared without it, so
// strip it here rather than rewriting every route. Unset -> no-op, which keeps
// the original root-mounted deployment behaving exactly as before.
const BASE_PATH = (process.env.APP_BASE_PATH || "").replace(/\/+$/, "");

function stripBasePath(url: string): string {
  if (!BASE_PATH || !url.startsWith(BASE_PATH)) return url;
  const rest = url.slice(BASE_PATH.length);
  // Only strip on a real segment boundary, so "/chizukimXYZ" is left alone.
  if (rest !== "" && !rest.startsWith("/") && !rest.startsWith("?")) return url;
  return rest.startsWith("?") ? "/" + rest : rest || "/";
}

// Vercel serverless handler
export default async function handler(req: Request, res: Response) {
  await ensureReady();
  if (BASE_PATH && req.url) req.url = stripBasePath(req.url);
  app(req as any, res as any);
}
