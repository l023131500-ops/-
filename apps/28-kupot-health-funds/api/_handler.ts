// Vercel serverless entry — מנתב את כל בקשות /api/* לאפליקציית ה-Express.
// נבנה כ-bundle עצמאי דרך script/build-vercel-fn.ts אל api/index.js.
import type { IncomingMessage, ServerResponse } from "node:http";
import { getApp } from "../server/app";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  try {
    const app = await getApp();
    // Express נקרא כ-request listener רגיל
    (app as any)(req, res);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Serverless handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ message: "Internal Server Error" }));
    }
  }
}
