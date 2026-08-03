import "dotenv/config";
// ---------------------------------------------------------------------------
// הפניית כל קריאות fetch דרך פרוקסי ה-HTTPS של הפלטפורמה (מזריק את מפתחות ה-custom-cred).
// שני מנגנוני הזרקה אפשריים:
//   1) bash / dev  -> HTTPS_PROXY=https://x:<token>@agent-proxy.perplexity.ai כבר מוגדר.
//   2) start_server / publish -> מוזרקים CUSTOM_CRED_<HOST>_TOKEN בלבד. בונים מהם HTTPS_PROXY.
// חיוני: undici (fetch הגלובלי של Node) מתעלם מ-HTTPS_PROXY אלא אם מגדירים ProxyAgent ידנית,
// ובנוסף צריך את תעודת ה-CA של הפרוקסי כדי לסמוך על ה-MITM.
// ---------------------------------------------------------------------------
// פרוקסי לפי host: proxyFetch בונה dispatcher נפרד לכל מפתח custom-cred (כל טוקן מאמת רק את ה-host שלו).
import { proxyStatus } from "./proxyFetch";
console.log(proxyStatus());
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { ensureTables, seedTemplates } from "./seed";
import { createServer } from "node:http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "25mb", // דרוש למטעני base64 של לוגו (וקטוריזציה/שמירת תמונות)
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "25mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  ensureTables();
  await seedTemplates().catch((e) => console.error("[seed] failed", e));
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
