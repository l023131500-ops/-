// ---------------------------------------------------------------------------
// בונה את אפליקציית ה-Express (ללא listen) — משותף לסביבה מקומית ול-Vercel serverless.
// ---------------------------------------------------------------------------
import express, { Response, NextFunction } from "express";
import type { Request, Express } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

let appPromise: Promise<Express> | null = null;

export async function buildApp(): Promise<Express> {
  const app = express();
  const httpServer = createServer(app);

  // בפריסה תחת נתיב (more30.com/kupot) הבקשות מגיעות כ-/kupot/api/... בעוד
  // registerRoutes מגדיר /api/... — מסירים את הקידומת לפני הניתוב. ריק בברירת
  // מחדל, כך שההרצה בשורש הדומיין לא משתנה.
  const PREFIX = (process.env.API_PATH_PREFIX || "").replace(/\/$/, "");
  if (PREFIX) {
    app.use((req, _res, next) => {
      if (req.url === PREFIX) req.url = "/";
      else if (req.url.startsWith(PREFIX + "/")) req.url = req.url.slice(PREFIX.length);
      next();
    });
  }

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    // eslint-disable-next-line no-console
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
}

// גרסה ממוזטת (cached) — חיונית ל-serverless כדי לא לבנות מחדש בכל בקשה.
export function getApp(): Promise<Express> {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}
