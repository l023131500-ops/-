import type { Express, Request, Response, NextFunction } from "express";
import { requireAdmin, type AuthedRequest } from "./auth";
import { finStorage } from "./fin-storage";
import { storage } from "./storage";
import { loadAll } from "./data-loader";
import { dispatchWebhook } from "./webhook-bus";

export interface UserRequest extends Request {
  appUser?: any;
  appUserSession?: any;
}

// req.query.month becomes an array if the client sends ?month= twice; monthlySummary()
// splits it on "-" expecting a single "YYYY-MM" string, so an array silently produces NaN.
function monthQueryParam(req: Request): string {
  const raw = req.query.month;
  const single = Array.isArray(raw) ? raw[0] : raw;
  return String(single || new Date().toISOString().slice(0, 7));
}

// Same array-vs-string pitfall as monthQueryParam: a repeated ?from=/?to= produces an
// array, and String(array) silently joins it into a comma-separated value that still
// looks like a valid ISO date string but breaks the "<"/">" comparisons in
// listTransactions() instead of throwing.
function singleQueryParam(req: Request, key: string): string | undefined {
  const raw = req.query[key];
  const single = Array.isArray(raw) ? raw[0] : raw;
  return single ? String(single) : undefined;
}

// Same array pitfall as above, but for the numeric ?clientId= filter: a repeated
// ?clientId= produces an array, and Number(array) on more than one element is NaN.
// listCategories()/listOpportunities() then compare `c.clientId === NaN`, which is
// always false, so the filter silently collapses to "no client match" instead of
// throwing or falling back to "all clients" — categories/opportunities the caller
// should see quietly disappear from the response.
export function clientIdQueryParam(req: Request): number | undefined {
  const raw = req.query.clientId;
  const single = Array.isArray(raw) ? raw[0] : raw;
  return single ? Number(single) : undefined;
}

async function requireUser(req: UserRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: "דרושה התחברות" });
  const session = await storage.getUserSession(token);
  if (!session) return res.status(401).json({ message: "ההתחברות פגה — התחברו מחדש" });
  req.appUserSession = session;
  req.appUser = session.user;
  next();
}

function ensureUserOwns(req: UserRequest, clientId: number): boolean {
  return Boolean(req.appUser && req.appUser.finClientId && Number(req.appUser.finClientId) === Number(clientId));
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function registerFinancialRoutes(app: Express) {
  // ----- Coaches / mentors (subset of app_users with role='coach') -----
  // List, basic CRUD via the existing app_users admin endpoints, and a
  // dedicated "assign coach to a financial client" helper. Coaches share the
  // same login pipeline as other users so credentials delivery, premium plan
  // and product access work unchanged.
  app.get("/api/financial/coaches", requireAdmin, async (_req, res) => {
    const list = await storage.listAppUsers();
    const coaches = list
      .filter((u) => u.role === "coach")
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        username: u.username,
        status: u.status,
        plan: u.plan,
        productAccess: safeJsonArray(u.productAccessJson),
        clientCount: finStorage.listClients().filter((c) => (c as any).coachId === u.id).length,
        notes: u.notes,
      }));
    res.json(coaches);
  });

  app.patch("/api/financial/clients/:id/assign-coach", requireAdmin, async (req, res) => {
    const clientId = Number(req.params.id);
    const coachIdRaw = req.body?.coachId;
    const coachId = coachIdRaw === null || coachIdRaw === undefined || coachIdRaw === ""
      ? null
      : Number(coachIdRaw);
    if (coachId !== null) {
      const coach = await storage.getAppUser(coachId);
      if (!coach || coach.role !== "coach") {
        return res.status(400).json({ message: "המאמן לא נמצא או שאינו בעל תפקיד מאמן" });
      }
    }
    const updated = finStorage.updateClient(clientId, { coachId } as any);
    if (!updated) return res.status(404).json({ message: "not found" });
    res.json(updated);
  });

  // ----- Public lead intake (used by financial marketing site and the in-app contact form) -----
  app.post("/api/financial/leads", async (req, res) => {
    const body = req.body ?? {};
    const fullName = String(body.fullName || body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!fullName || !phone) {
      return res.status(400).json({ message: "שם מלא וטלפון הם שדות חובה" });
    }
    const lead = finStorage.createLead({
      fullName,
      phone,
      email: String(body.email || "").trim(),
      mode: String(body.mode || "household"),
      message: String(body.message || ""),
      source: String(body.source || "financial_marketing"),
    });
    // Build the full payload per spec
    const payload = {
      source: "bkalut_financial_lead",
      origin: {
        site: "financial-marketing",
        page: String(body.page || "/"),
        form: String(body.formName || "financial-lead"),
        leadKind: "financial",
      },
      submittedAt: new Date().toISOString(),
      leadId: lead.id,
      requestType: String(body.requestType || "info"),
      module: String(body.module || "general"),
      topic: body.topic ? String(body.topic) : "",
      questionnaireAnswers: body.answers ?? {},
      requiredDocuments: body.documents ?? {},
      score: Number(body.score || 0),
      potentialLevel: body.potentialLevel || "",
      selectedPath: body.selectedPath || "",
      status: "new",
      assignedAdmin: null,
      assignedUser: null,
      legalAccepted: body.legalAccepted ?? null,
      lead: { ...lead },
    };
    const result = await dispatchWebhook({
      source: "financial_lead",
      configKey: "webhook_financial_lead",
      relatedKind: "lead",
      relatedId: lead.id,
      payload,
    });
    finStorage.updateLeadWebhook(
      lead.id,
      result.ok ? "sent" : "failed",
      `HTTP ${result.status}: ${result.responseText}`,
    );
    res.json({
      ok: true,
      leadId: lead.id,
      webhook: { ok: result.ok, status: result.status, endpointUrl: result.endpointUrl, logId: result.logId },
    });
  });

  // ----- Admin lead management -----
  app.get("/api/financial/leads", requireAdmin, async (_req, res) => {
    res.json(finStorage.listLeads());
  });
  app.patch("/api/financial/leads/:id", requireAdmin, async (req, res) => {
    const lead = finStorage.updateLeadStatus(Number(req.params.id), String(req.body?.status || "new"));
    if (!lead) return res.status(404).json({ message: "not found" });
    res.json(lead);
  });

  // ----- Clients -----
  app.get("/api/financial/clients", requireAdmin, async (_req, res) => {
    res.json(finStorage.listClients());
  });
  app.get("/api/financial/clients/:id", requireAdmin, async (req, res) => {
    const client = finStorage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "not found" });
    res.json(client);
  });
  app.post("/api/financial/clients", requireAdmin, async (req, res) => {
    res.json(finStorage.createClient(req.body ?? {}));
  });
  app.patch("/api/financial/clients/:id", requireAdmin, async (req, res) => {
    const c = finStorage.updateClient(Number(req.params.id), req.body ?? {});
    if (!c) return res.status(404).json({ message: "not found" });
    res.json(c);
  });
  app.delete("/api/financial/clients/:id", requireAdmin, async (req, res) => {
    finStorage.deleteClient(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Categories -----
  app.get("/api/financial/categories", async (req, res) => {
    const clientId = clientIdQueryParam(req);
    res.json(finStorage.listCategories(clientId ?? null));
  });
  app.post("/api/financial/categories", requireAdmin, async (req, res) => {
    res.json(finStorage.createCategory(req.body ?? {}));
  });
  app.patch("/api/financial/categories/:id", requireAdmin, async (req, res) => {
    const c = finStorage.updateCategory(Number(req.params.id), req.body ?? {});
    if (!c) return res.status(404).json({ message: "not found" });
    res.json(c);
  });
  app.delete("/api/financial/categories/:id", requireAdmin, async (req, res) => {
    finStorage.deleteCategory(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Transactions -----
  app.get("/api/financial/clients/:clientId/transactions", requireAdmin, async (req, res) => {
    const from = singleQueryParam(req, "from");
    const to = singleQueryParam(req, "to");
    res.json(finStorage.listTransactions(Number(req.params.clientId), { from, to }));
  });
  app.post("/api/financial/transactions", requireAdmin, async (req, res) => {
    res.json(finStorage.createTransaction(req.body ?? {}));
  });
  app.patch("/api/financial/transactions/:id", requireAdmin, async (req, res) => {
    const t = finStorage.updateTransaction(Number(req.params.id), req.body ?? {});
    if (!t) return res.status(404).json({ message: "not found" });
    res.json(t);
  });
  app.delete("/api/financial/transactions/:id", requireAdmin, async (req, res) => {
    finStorage.deleteTransaction(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Budgets -----
  app.get("/api/financial/clients/:clientId/budgets", requireAdmin, async (req, res) => {
    res.json(finStorage.listBudgets(Number(req.params.clientId)));
  });
  app.post("/api/financial/budgets", requireAdmin, async (req, res) => {
    res.json(finStorage.createBudget(req.body ?? {}));
  });
  app.patch("/api/financial/budgets/:id", requireAdmin, async (req, res) => {
    const b = finStorage.updateBudget(Number(req.params.id), req.body ?? {});
    if (!b) return res.status(404).json({ message: "not found" });
    res.json(b);
  });
  app.delete("/api/financial/budgets/:id", requireAdmin, async (req, res) => {
    finStorage.deleteBudget(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Recurring -----
  app.get("/api/financial/clients/:clientId/recurring", requireAdmin, async (req, res) => {
    res.json(finStorage.listRecurring(Number(req.params.clientId)));
  });
  app.post("/api/financial/recurring", requireAdmin, async (req, res) => {
    res.json(finStorage.createRecurring(req.body ?? {}));
  });
  app.patch("/api/financial/recurring/:id", requireAdmin, async (req, res) => {
    const r = finStorage.updateRecurring(Number(req.params.id), req.body ?? {});
    if (!r) return res.status(404).json({ message: "not found" });
    res.json(r);
  });
  app.delete("/api/financial/recurring/:id", requireAdmin, async (req, res) => {
    finStorage.deleteRecurring(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Opportunities -----
  app.get("/api/financial/opportunities", requireAdmin, async (req, res) => {
    const clientId = clientIdQueryParam(req);
    res.json(finStorage.listOpportunities(clientId));
  });
  app.post("/api/financial/opportunities", requireAdmin, async (req, res) => {
    res.json(finStorage.createOpportunity(req.body ?? {}));
  });
  app.patch("/api/financial/opportunities/:id", requireAdmin, async (req, res) => {
    const o = finStorage.updateOpportunity(Number(req.params.id), req.body ?? {});
    if (!o) return res.status(404).json({ message: "not found" });
    res.json(o);
  });
  app.delete("/api/financial/opportunities/:id", requireAdmin, async (req, res) => {
    finStorage.deleteOpportunity(Number(req.params.id));
    res.json({ ok: true });
  });

  // Auto-suggest opportunities based on client profile (family size, mode, income)
  app.post("/api/financial/clients/:clientId/suggest-opportunities", requireAdmin, async (req, res) => {
    const id = Number(req.params.clientId);
    const client = finStorage.getClient(id);
    if (!client) return res.status(404).json({ message: "not found" });
    const { rights } = loadAll();
    const candidates: Array<{ title: string; topic: string; category: string; rightId: number; recommendation: string }> = [];
    const lowIncome = (client.monthlyIncome ?? 0) > 0 && (client.monthlyIncome ?? 0) < 9000;
    const largeFamily = (client.familySize ?? 0) >= 5;
    for (const r of rights) {
      if (r.category && largeFamily && /משפחות\s+(?:עם\s+)?ילדים|ילדים\s+מרובי|הבטחת\s+הכנסה/.test(r.eligibility + r.audience + r.topic)) {
        candidates.push({ title: `אפשרות זכאות: ${r.topic}`, topic: r.topic, category: r.category, rightId: r.id, recommendation: `הלקוח מתאים פוטנציאלית לקטגוריה ${r.category} (משפחה גדולה).` });
      }
      if (r.category && lowIncome && /הכנסה\s+נמוכ|מענק\s+עבודה|מס\s+הכנסה\s+שלילי/.test(r.eligibility + r.topic)) {
        candidates.push({ title: `אפשרות זכאות: ${r.topic}`, topic: r.topic, category: r.category, rightId: r.id, recommendation: `הכנסה נמוכה לפי הפרופיל — כדאי לבחון זכאות.` });
      }
      if (client.mode === "business" && /עסק|עוסק\s+פטור|עוסק\s+מורשה|מע"ם|מקדמ/.test(r.audience + r.eligibility + r.topic)) {
        candidates.push({ title: `הזדמנות עסקית: ${r.topic}`, topic: r.topic, category: r.category, rightId: r.id, recommendation: `רלוונטי לבעלי עסק לפי פרופיל הלקוח.` });
      }
    }
    const seen = new Set<number>();
    const created: any[] = [];
    for (const cand of candidates.slice(0, 12)) {
      if (seen.has(cand.rightId)) continue;
      seen.add(cand.rightId);
      const opp = finStorage.createOpportunity({ clientId: id, ...cand });
      created.push(opp);
    }
    res.json({ ok: true, createdCount: created.length, created });
  });

  // ----- Tips -----
  app.get("/api/financial/tips", async (_req, res) => {
    res.json(finStorage.listTips().filter((t) => t.active));
  });
  app.get("/api/financial/admin/tips", requireAdmin, async (_req, res) => {
    res.json(finStorage.listTips());
  });
  app.post("/api/financial/tips", requireAdmin, async (req, res) => {
    res.json(finStorage.createTip(req.body ?? {}));
  });
  app.patch("/api/financial/tips/:id", requireAdmin, async (req, res) => {
    const t = finStorage.updateTip(Number(req.params.id), req.body ?? {});
    if (!t) return res.status(404).json({ message: "not found" });
    res.json(t);
  });
  app.delete("/api/financial/tips/:id", requireAdmin, async (req, res) => {
    finStorage.deleteTip(Number(req.params.id));
    res.json({ ok: true });
  });

  // ----- Dashboard summary -----
  app.get("/api/financial/clients/:clientId/summary", requireAdmin, async (req, res) => {
    const ym = monthQueryParam(req);
    res.json({
      month: ym,
      summary: finStorage.monthlySummary(Number(req.params.clientId), ym),
      budgets: finStorage.listBudgets(Number(req.params.clientId)),
      categories: finStorage.listCategories(Number(req.params.clientId)),
      recurring: finStorage.listRecurring(Number(req.params.clientId)),
    });
  });

  // Aggregate counts for the home page of the financial app
  app.get("/api/financial/overview", requireAdmin, async (_req, res) => {
    const clients = finStorage.listClients();
    const tips = finStorage.listTips();
    const opps = finStorage.listOpportunities();
    const leads = finStorage.listLeads();
    res.json({
      clientsCount: clients.length,
      tipsCount: tips.filter((t) => t.active).length,
      opportunitiesCount: opps.length,
      leadsCount: leads.length,
      newLeadsCount: leads.filter((l) => l.status === "new").length,
      recent: {
        clients: clients.slice(-5).reverse(),
        leads: leads.slice(0, 5),
        opportunities: opps.slice(0, 5),
      },
    });
  });

  // ===== Admin: debts =====
  app.get("/api/financial/clients/:clientId/debts", requireAdmin, async (req, res) => {
    res.json(finStorage.listDebts(Number(req.params.clientId)));
  });
  app.post("/api/financial/debts", requireAdmin, async (req, res) => {
    res.json(finStorage.createDebt(req.body ?? {}));
  });
  app.patch("/api/financial/debts/:id", requireAdmin, async (req, res) => {
    const d = finStorage.updateDebt(Number(req.params.id), req.body ?? {});
    if (!d) return res.status(404).json({ message: "not found" });
    res.json(d);
  });
  app.delete("/api/financial/debts/:id", requireAdmin, async (req, res) => {
    finStorage.deleteDebt(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== Admin: goals =====
  app.get("/api/financial/clients/:clientId/goals", requireAdmin, async (req, res) => {
    res.json(finStorage.listGoals(Number(req.params.clientId)));
  });
  app.post("/api/financial/goals", requireAdmin, async (req, res) => {
    res.json(finStorage.createGoal(req.body ?? {}));
  });
  app.patch("/api/financial/goals/:id", requireAdmin, async (req, res) => {
    const g = finStorage.updateGoal(Number(req.params.id), req.body ?? {});
    if (!g) return res.status(404).json({ message: "not found" });
    res.json(g);
  });
  app.delete("/api/financial/goals/:id", requireAdmin, async (req, res) => {
    finStorage.deleteGoal(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== Admin: alerts =====
  app.get("/api/financial/clients/:clientId/alerts", requireAdmin, async (req, res) => {
    res.json(finStorage.listAlerts(Number(req.params.clientId)));
  });
  app.post("/api/financial/alerts", requireAdmin, async (req, res) => {
    res.json(finStorage.createAlert(req.body ?? {}));
  });
  app.post("/api/financial/alerts/:id/ack", requireAdmin, async (req, res) => {
    res.json(finStorage.acknowledgeAlert(Number(req.params.id)));
  });
  app.delete("/api/financial/alerts/:id", requireAdmin, async (req, res) => {
    finStorage.deleteAlert(Number(req.params.id));
    res.json({ ok: true });
  });
  app.post("/api/financial/clients/:clientId/recompute-alerts", requireAdmin, async (req, res) => {
    res.json(finStorage.recomputeAlerts(Number(req.params.clientId), req.body?.month));
  });

  // ===== Admin: plans =====
  app.get("/api/financial/clients/:clientId/plans", requireAdmin, async (req, res) => {
    res.json(finStorage.listPlans(Number(req.params.clientId)));
  });
  app.post("/api/financial/plans", requireAdmin, async (req, res) => {
    res.json(finStorage.createPlan(req.body ?? {}));
  });
  app.patch("/api/financial/plans/:id", requireAdmin, async (req, res) => {
    const p = finStorage.updatePlan(Number(req.params.id), req.body ?? {});
    if (!p) return res.status(404).json({ message: "not found" });
    res.json(p);
  });
  app.delete("/api/financial/plans/:id", requireAdmin, async (req, res) => {
    finStorage.deletePlan(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== Admin: notes =====
  app.get("/api/financial/clients/:clientId/notes", requireAdmin, async (req, res) => {
    res.json(finStorage.listNotes(Number(req.params.clientId), false));
  });
  app.post("/api/financial/notes", requireAdmin, async (req, res) => {
    res.json(finStorage.createNote(req.body ?? {}));
  });
  app.delete("/api/financial/notes/:id", requireAdmin, async (req, res) => {
    finStorage.deleteNote(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== CRM: Tasks =====
  app.get("/api/financial/clients/:clientId/tasks", requireAdmin, async (req, res) => {
    res.json(finStorage.listTasks(Number(req.params.clientId)));
  });
  app.get("/api/financial/tasks", requireAdmin, async (req, res) => {
    const clientId = clientIdQueryParam(req);
    res.json(finStorage.listTasks(clientId));
  });
  app.post("/api/financial/tasks", requireAdmin, async (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    if (!body.clientId || !body.title) return res.status(400).json({ message: "clientId ו-title חובה" });
    res.json(finStorage.createTask({
      clientId: Number(body.clientId),
      title: String(body.title),
      description: body.description ?? null,
      dueDate: body.dueDate ?? null,
      status: body.status ?? "open",
      priority: body.priority ?? "normal",
      assigneeId: body.assigneeId ? Number(body.assigneeId) : null,
      createdBy: req.adminSession?.identity ?? "",
    }));
  });
  app.patch("/api/financial/tasks/:id", requireAdmin, async (req, res) => {
    const t = finStorage.updateTask(Number(req.params.id), req.body ?? {});
    if (!t) return res.status(404).json({ message: "not found" });
    res.json(t);
  });
  app.delete("/api/financial/tasks/:id", requireAdmin, async (req, res) => {
    finStorage.deleteTask(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== CRM: Messages =====
  app.get("/api/financial/clients/:clientId/messages", requireAdmin, async (req, res) => {
    res.json(finStorage.listMessages(Number(req.params.clientId)));
  });
  app.post("/api/financial/messages", requireAdmin, async (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    if (!body.clientId || !body.body) return res.status(400).json({ message: "clientId ו-body חובה" });
    res.json(finStorage.createMessage({
      clientId: Number(body.clientId),
      senderRole: String(body.senderRole || "admin"),
      senderName: body.senderName ?? req.adminSession?.identity ?? "",
      body: String(body.body),
      channel: body.channel ?? "app",
    }));
  });
  app.post("/api/financial/messages/:id/read", requireAdmin, async (req, res) => {
    res.json(finStorage.markMessageRead(Number(req.params.id)));
  });
  app.delete("/api/financial/messages/:id", requireAdmin, async (req, res) => {
    finStorage.deleteMessage(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== CRM: Documents =====
  app.get("/api/financial/clients/:clientId/documents", requireAdmin, async (req, res) => {
    res.json(finStorage.listDocuments(Number(req.params.clientId)));
  });
  app.post("/api/financial/documents", requireAdmin, async (req: AuthedRequest, res) => {
    const body = req.body ?? {};
    if (!body.clientId || !body.title) return res.status(400).json({ message: "clientId ו-title חובה" });
    res.json(finStorage.createDocument({
      clientId: Number(body.clientId),
      title: String(body.title),
      docType: body.docType ?? "other",
      status: body.status ?? "pending",
      url: body.url ?? null,
      storageKey: body.storageKey ?? null,
      mimeType: body.mimeType ?? null,
      sizeBytes: body.sizeBytes ?? null,
      notes: body.notes ?? null,
      uploadedBy: req.adminSession?.identity ?? "",
    }));
  });
  app.patch("/api/financial/documents/:id", requireAdmin, async (req, res) => {
    const d = finStorage.updateDocument(Number(req.params.id), req.body ?? {});
    if (!d) return res.status(404).json({ message: "not found" });
    res.json(d);
  });
  app.delete("/api/financial/documents/:id", requireAdmin, async (req, res) => {
    finStorage.deleteDocument(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== CRM: Reminders =====
  app.get("/api/financial/clients/:clientId/reminders", requireAdmin, async (req, res) => {
    res.json(finStorage.listReminders(Number(req.params.clientId)));
  });
  app.post("/api/financial/reminders", requireAdmin, async (req, res) => {
    const body = req.body ?? {};
    if (!body.clientId || !body.title || !body.dueAt) {
      return res.status(400).json({ message: "clientId, title, dueAt — חובה" });
    }
    res.json(finStorage.createReminder({
      clientId: Number(body.clientId),
      title: String(body.title),
      body: body.body ?? null,
      dueAt: String(body.dueAt),
      channel: body.channel ?? "internal",
      relatedKind: body.relatedKind ?? null,
      relatedId: body.relatedId ? Number(body.relatedId) : null,
    }));
  });
  app.patch("/api/financial/reminders/:id", requireAdmin, async (req, res) => {
    const r = finStorage.updateReminder(Number(req.params.id), req.body ?? {});
    if (!r) return res.status(404).json({ message: "not found" });
    res.json(r);
  });
  app.delete("/api/financial/reminders/:id", requireAdmin, async (req, res) => {
    finStorage.deleteReminder(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== CRM: Activity =====
  app.get("/api/financial/clients/:clientId/activity", requireAdmin, async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 1000);
    res.json(finStorage.listActivity(Number(req.params.clientId), limit));
  });

  // ===== CRM: Reports =====
  app.get("/api/financial/clients/:clientId/reports", requireAdmin, async (req, res) => {
    res.json(finStorage.listReports(Number(req.params.clientId)));
  });
  app.post("/api/financial/reports", requireAdmin, async (req, res) => {
    const body = req.body ?? {};
    if (!body.clientId || !body.title || !body.periodMonth) {
      return res.status(400).json({ message: "clientId, title, periodMonth — חובה" });
    }
    res.json(finStorage.createReport({
      clientId: Number(body.clientId),
      periodMonth: String(body.periodMonth),
      title: String(body.title),
      status: body.status ?? "draft",
      summary: body.summary ?? null,
      metricsJson: body.metricsJson ?? "{}",
      url: body.url ?? null,
    }));
  });
  app.patch("/api/financial/reports/:id", requireAdmin, async (req, res) => {
    const r = finStorage.updateReport(Number(req.params.id), req.body ?? {});
    if (!r) return res.status(404).json({ message: "not found" });
    res.json(r);
  });
  app.delete("/api/financial/reports/:id", requireAdmin, async (req, res) => {
    finStorage.deleteReport(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== Coach: dashboard for assigned clients only =====
  app.get("/api/me/financial/coach-dashboard", requireUser, async (req: UserRequest, res) => {
    const user = req.appUser!;
    if (user.role !== "coach" && user.role !== "admin") {
      return res.status(403).json({ message: "מאמן בלבד" });
    }
    const allClients = finStorage.listClients();
    const myClients = user.role === "admin"
      ? allClients
      : allClients.filter((c) => (c as any).coachId === user.id);
    res.json({
      role: user.role,
      clientsCount: myClients.length,
      clients: myClients.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        mode: c.mode,
        familySize: c.familySize,
        monthlyIncome: c.monthlyIncome,
        tasksOpen: finStorage.listTasks(c.id).filter((t) => t.status === "open" || t.status === "in_progress").length,
        documentsPending: finStorage.listDocuments(c.id).filter((d) => d.status === "pending").length,
        unreadMessages: finStorage.listMessages(c.id).filter((m) => !m.readAt && m.senderRole === "client").length,
      })),
    });
  });

  app.get("/api/me/financial/coach/clients/:id", requireUser, async (req: UserRequest, res) => {
    const user = req.appUser!;
    const clientId = Number(req.params.id);
    const client = finStorage.getClient(clientId);
    if (!client) return res.status(404).json({ message: "not found" });
    if (user.role !== "admin" && (client as any).coachId !== user.id) {
      return res.status(403).json({ message: "אין הרשאה ללקוח זה" });
    }
    res.json({
      client,
      tasks: finStorage.listTasks(clientId),
      messages: finStorage.listMessages(clientId).slice(0, 100),
      documents: finStorage.listDocuments(clientId),
      reminders: finStorage.listReminders(clientId),
      plans: finStorage.listPlans(clientId),
      activity: finStorage.listActivity(clientId, 100),
      reports: finStorage.listReports(clientId),
    });
  });

  // ===== Admin: export -----
  app.get("/api/financial/clients/:clientId/export", requireAdmin, async (req, res) => {
    const data = finStorage.exportClientJson(Number(req.params.clientId));
    if (!data) return res.status(404).json({ message: "not found" });
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="client-${req.params.clientId}-export.json"`);
    res.send(JSON.stringify(data, null, 2));
  });

  // ===== USER-side (financial client) endpoints =====
  // The authenticated user only sees their own fin_client data.
  app.get("/api/me/financial/profile", requireUser, async (req: UserRequest, res) => {
    const user = req.appUser!;
    const finClientId = user.finClientId ? Number(user.finClientId) : null;
    const client = finClientId ? finStorage.getClient(finClientId) : null;
    res.json({ user, client });
  });

  app.get("/api/me/financial/dashboard", requireUser, async (req: UserRequest, res) => {
    const user = req.appUser!;
    if (!user.finClientId) return res.json({ noClient: true });
    const clientId = Number(user.finClientId);
    const month = monthQueryParam(req);
    // refresh alerts inline
    finStorage.recomputeAlerts(clientId, month);
    res.json({
      month,
      summary: finStorage.monthlySummary(clientId, month),
      categories: finStorage.listCategories(clientId),
      transactions: finStorage.listTransactions(clientId).slice(0, 100),
      budgets: finStorage.listBudgets(clientId),
      recurring: finStorage.listRecurring(clientId),
      debts: finStorage.listDebts(clientId),
      goals: finStorage.listGoals(clientId),
      alerts: finStorage.listAlerts(clientId).filter((a) => !a.acknowledged),
      plans: finStorage.listPlans(clientId).filter((p) => !p.premium || user.plan === "premium"),
      notes: finStorage.listNotes(clientId, /*visibleToUser*/ true),
      opportunities: finStorage.listOpportunities(clientId),
      tips: finStorage.listTips().filter((t) => t.active).slice(0, 6),
      premiumActive: user.plan === "premium",
    });
  });

  app.post("/api/me/financial/transactions", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    if (!clientId) return res.status(400).json({ message: "המשתמש לא משויך ללקוח פיננסי" });
    const t = finStorage.createTransaction({ ...req.body, clientId, source: "user" });
    res.json(t);
  });
  app.patch("/api/me/financial/transactions/:id", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    const tx = finStorage.listTransactions(clientId).find((t) => t.id === Number(req.params.id));
    if (!tx) return res.status(404).json({ message: "not found" });
    const updated = finStorage.updateTransaction(tx.id, req.body ?? {});
    res.json(updated);
  });
  app.delete("/api/me/financial/transactions/:id", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    const tx = finStorage.listTransactions(clientId).find((t) => t.id === Number(req.params.id));
    if (!tx) return res.status(404).json({ message: "not found" });
    finStorage.deleteTransaction(tx.id);
    res.json({ ok: true });
  });

  app.post("/api/me/financial/goals", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    if (!clientId) return res.status(400).json({ message: "no client" });
    res.json(finStorage.createGoal({ ...req.body, clientId }));
  });
  app.post("/api/me/financial/notes", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    if (!clientId) return res.status(400).json({ message: "no client" });
    res.json(finStorage.createNote({
      clientId,
      authorRole: "user",
      title: req.body?.title,
      body: req.body?.body,
      visibility: "both",
    }));
  });

  app.post("/api/me/financial/alerts/:id/ack", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    const alerts = finStorage.listAlerts(clientId);
    const found = alerts.find((a) => a.id === Number(req.params.id));
    if (!found) return res.status(404).json({ message: "not found" });
    res.json(finStorage.acknowledgeAlert(found.id));
  });

  app.get("/api/me/financial/export", requireUser, async (req: UserRequest, res) => {
    const clientId = Number(req.appUser!.finClientId);
    if (!clientId) return res.status(400).json({ message: "no client" });
    const data = finStorage.exportClientJson(clientId);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="my-financial-export.json"`);
    res.send(JSON.stringify(data, null, 2));
  });
}
