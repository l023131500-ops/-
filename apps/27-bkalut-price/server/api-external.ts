/**
 * External / automation API.
 *
 * These endpoints expose management + site data to trusted automations (n8n,
 * Make, custom scripts) over a token guarded by admin settings.
 *
 * Auth model:
 *   - Settings stored in automation_configs.key="automation_api" as configJson:
 *       { requireToken: boolean, tokenHash: "<sha256 hex>", tokenPrefix: "<first 6 chars>" }
 *   - If requireToken === false the endpoints are open (admin opt-in only).
 *   - Otherwise the caller must supply the raw token via `Authorization: Bearer X`
 *     or `?token=X`. We compare sha256(provided) to tokenHash using
 *     timing-safe equality.
 *
 * The plain token is NEVER written to disk: it's returned ONCE when the admin
 * generates/sets it via the admin UI and must be saved by the admin.
 */
import type { Express, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { storage } from "./storage";
import { loadAll } from "./data-loader";
import * as paramsTopics from "./params-topics";
import * as potential from "./potential-scanner";
import { finStorage } from "./fin-storage";

const AUTOMATION_API_KEY = "automation_api";

export interface ApiSettings {
  requireToken: boolean;
  tokenHash: string;
  tokenPrefix: string;
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(String(input || ""), "utf8").digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function loadApiSettings(): Promise<ApiSettings> {
  const cfg = await storage.getAutomationConfig(AUTOMATION_API_KEY);
  if (!cfg) {
    return { requireToken: true, tokenHash: "", tokenPrefix: "" };
  }
  try {
    const j = cfg.configJson ? JSON.parse(cfg.configJson) : {};
    return {
      requireToken: j.requireToken === undefined ? true : Boolean(j.requireToken),
      tokenHash: typeof j.tokenHash === "string" ? j.tokenHash : "",
      tokenPrefix: typeof j.tokenPrefix === "string" ? j.tokenPrefix : "",
    };
  } catch {
    return { requireToken: true, tokenHash: "", tokenPrefix: "" };
  }
}

export async function saveApiSettings(patch: Partial<ApiSettings>): Promise<ApiSettings> {
  const current = await loadApiSettings();
  const next: ApiSettings = {
    requireToken: patch.requireToken !== undefined ? patch.requireToken : current.requireToken,
    tokenHash: patch.tokenHash !== undefined ? patch.tokenHash : current.tokenHash,
    tokenPrefix: patch.tokenPrefix !== undefined ? patch.tokenPrefix : current.tokenPrefix,
  };
  await storage.updateAutomationConfig(AUTOMATION_API_KEY, {
    enabled: true,
    config: next as unknown as Record<string, unknown>,
    label: "API חיצוני / אוטומציות",
    description: "טוקן ויכולת לקבוע אם הגישה ל-/api/external/* מצריכה טוקן.",
  });
  return next;
}

/**
 * Generate a fresh token, store its hash, and return the plain token to the
 * admin. The plain token is intentionally never persisted.
 */
export async function rotateApiToken(): Promise<{ token: string; settings: ApiSettings }> {
  const token = `bk_${crypto.randomBytes(24).toString("base64url")}`;
  const tokenHash = sha256Hex(token);
  const tokenPrefix = token.slice(0, 8);
  const settings = await saveApiSettings({ tokenHash, tokenPrefix });
  return { token, settings };
}

export async function clearApiToken(): Promise<ApiSettings> {
  return saveApiSettings({ tokenHash: "", tokenPrefix: "" });
}

function extractToken(req: Request): string {
  const header = req.header("authorization");
  if (header) {
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
  }
  const q = req.query?.token;
  if (typeof q === "string" && q) return q.trim();
  const xh = req.header("x-api-token");
  if (xh) return xh.trim();
  return "";
}

export function requireApiToken(loader: () => Promise<ApiSettings>) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const settings = await loader();
    if (!settings.requireToken) return next();
    const provided = extractToken(req);
    if (!provided) {
      return res.status(401).json({ ok: false, message: "missing API token" });
    }
    if (!settings.tokenHash) {
      return res.status(401).json({ ok: false, message: "API token not configured by admin" });
    }
    const providedHash = sha256Hex(provided);
    if (!timingSafeEqualHex(providedHash, settings.tokenHash)) {
      return res.status(401).json({ ok: false, message: "invalid API token" });
    }
    return next();
  };
}

function publicRight(r: any) {
  return {
    id: r.id,
    category: r.category || "",
    subCategory: r.subCategory || "",
    topic: r.topic || "",
    audience: r.audience || "",
    whatReceived: r.whatReceived || "",
    publicSiteText: r.publicSiteText || "",
    serviceUrl: r.serviceUrl || "",
  };
}

function publicOrg(o: any) {
  const { internalNotes, ...rest } = o;
  return rest;
}

export function registerExternalApi(app: Express) {
  const gate = requireApiToken(loadApiSettings);

  // ----- documentation root -----
  app.get("/api/external", (_req, res) => {
    res.json({
      ok: true,
      product: "bkalut-app external API",
      version: "v1",
      auth: {
        header: "Authorization: Bearer <TOKEN>",
        query: "?token=<TOKEN>",
        note: "Disable via admin if you want anonymous read access.",
      },
      endpoints: [
        { path: "/api/external/health", method: "GET", desc: "Connectivity + auth probe." },
        { path: "/api/external/rights/public", method: "GET", desc: "Basic, sanitized rights catalog." },
        { path: "/api/external/rights", method: "GET", desc: "Full rights data (admin-equivalent)." },
        { path: "/api/external/rights/:id", method: "GET", desc: "Full single right." },
        { path: "/api/external/orgs", method: "GET", desc: "Organizations catalog." },
        { path: "/api/external/meta", method: "GET", desc: "Counts + categories." },
        { path: "/api/external/params-topics", method: "GET", desc: "Admin params/topics KB." },
        { path: "/api/external/potential/submissions", method: "GET", desc: "Potential-scanner submissions." },
        { path: "/api/external/potential/links", method: "GET", desc: "Potential-scanner shareable links." },
        { path: "/api/external/service-submissions", method: "GET", desc: "Service form submissions." },
        { path: "/api/external/inbound-leads", method: "GET", desc: "Inbound leads." },
        { path: "/api/external/clients", method: "GET", desc: "Rights leads / clients." },
        { path: "/api/external/financial/clients", method: "GET", desc: "Financial CRM clients." },
        { path: "/api/external/financial/leads", method: "GET", desc: "Financial leads." },
        { path: "/api/external/financial/tasks", method: "GET", desc: "Financial CRM tasks." },
        { path: "/api/external/financial/messages", method: "GET", desc: "Financial CRM messages." },
        { path: "/api/external/financial/documents", method: "GET", desc: "Financial CRM documents." },
        { path: "/api/external/financial/plans", method: "GET", desc: "Financial CRM plans." },
        { path: "/api/external/financial/activity", method: "GET", desc: "Financial CRM activity log." },
        { path: "/api/external/financial/reminders", method: "GET", desc: "Financial CRM reminders." },
        { path: "/api/external/financial/reports", method: "GET", desc: "Financial CRM monthly reports." },
      ],
    });
  });

  // ----- health -----
  app.get("/api/external/health", gate, async (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // ----- catalog: rights / orgs / meta -----
  app.get("/api/external/rights/public", gate, (_req, res) => {
    res.json(loadAll().rights.map(publicRight));
  });

  app.get("/api/external/rights", gate, (_req, res) => {
    res.json(loadAll().rights);
  });

  app.get("/api/external/rights/:id", gate, (req, res) => {
    const id = Number(req.params.id);
    const row = loadAll().rights.find((r) => r.id === id);
    if (!row) return res.status(404).json({ ok: false, message: "not found" });
    res.json(row);
  });

  app.get("/api/external/orgs", gate, (_req, res) => {
    res.json(loadAll().orgs.map(publicOrg));
  });

  app.get("/api/external/meta", gate, (_req, res) => {
    res.json(loadAll().meta);
  });

  // ----- params/topics knowledge base -----
  app.get("/api/external/params-topics", gate, (_req, res) => {
    res.json(paramsTopics.listAll());
  });

  // ----- potential scanner -----
  app.get("/api/external/potential/links", gate, (_req, res) => {
    res.json(potential.listLinks());
  });

  app.get("/api/external/potential/submissions", gate, (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(potential.listSubmissions(limit));
  });

  // ----- service submissions / inbound leads / clients -----
  app.get("/api/external/service-submissions", gate, async (_req, res) => {
    res.json(await storage.listServiceSubmissionRows());
  });

  app.get("/api/external/inbound-leads", gate, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(await storage.listInboundLeads(limit));
  });

  app.get("/api/external/clients", gate, async (_req, res) => {
    res.json(await storage.listClients());
  });

  // ----- financial CRM -----
  app.get("/api/external/financial/clients", gate, async (_req, res) => {
    res.json(finStorage.listClients());
  });

  app.get("/api/external/financial/leads", gate, async (_req, res) => {
    res.json(finStorage.listLeads());
  });

  app.get("/api/external/financial/tasks", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listTasks(clientId));
  });

  app.get("/api/external/financial/messages", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listMessages(clientId));
  });

  app.get("/api/external/financial/documents", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listDocuments(clientId));
  });

  app.get("/api/external/financial/plans", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listAllPlans(clientId));
  });

  app.get("/api/external/financial/activity", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(finStorage.listActivity(clientId, limit));
  });

  app.get("/api/external/financial/reminders", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listReminders(clientId));
  });

  app.get("/api/external/financial/reports", gate, async (req, res) => {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(finStorage.listReports(clientId));
  });
}
