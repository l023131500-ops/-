/**
 * Financial Management storage layer. Uses the same sqlite handle as the rights
 * storage. All amounts are stored as integers (ILS, no agorot) for simplicity.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  finBudgets,
  finCategories,
  finClients,
  finLeads,
  finOpportunities,
  finRecurring,
  finTips,
  finTransactions,
  finDebts,
  finGoals,
  finAlerts,
  finPlans,
  finNotes,
  finTasks,
  finMessages,
  finDocuments,
  finActivityLog,
  finReminders,
  finReports,
} from "@shared/schema";
import type {
  FinBudget,
  FinCategory,
  FinClient,
  FinLead,
  FinOpportunity,
  FinRecurring,
  FinTip,
  FinTransaction,
  FinDebt,
  FinGoal,
  FinAlert,
  FinPlan,
  FinNote,
  FinTask,
  FinMessage,
  FinDocument,
  FinActivityLog,
  FinReminder,
  FinReport,
} from "@shared/schema";

// Re-open the same sqlite file the main storage uses. better-sqlite3 supports
// multiple handles to the same DB; WAL mode is set there.
const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
export const finDb = drizzle(sqlite);

// ----- Seed defaults -----

const DEFAULT_CATEGORIES: Array<{ name: string; kind: "income" | "expense"; icon?: string; color?: string }> = [
  { name: "שכר ועבודה", kind: "income", icon: "💼", color: "#16a34a" },
  { name: "קצבאות ביטוח לאומי", kind: "income", icon: "🛡️", color: "#0d9488" },
  { name: "מענקים והכנסה נוספת", kind: "income", icon: "✨", color: "#3b82f6" },
  { name: "מזון וקניות יומיומיות", kind: "expense", icon: "🛒", color: "#f97316" },
  { name: "דיור (שכר דירה / משכנתא)", kind: "expense", icon: "🏠", color: "#ef4444" },
  { name: "ארנונה ומים", kind: "expense", icon: "💧", color: "#0ea5e9" },
  { name: "חשמל וגז", kind: "expense", icon: "⚡", color: "#eab308" },
  { name: "תקשורת וסלולר", kind: "expense", icon: "📱", color: "#a855f7" },
  { name: "ביטוחים", kind: "expense", icon: "🛡️", color: "#64748b" },
  { name: "חינוך וגני ילדים", kind: "expense", icon: "🎒", color: "#db2777" },
  { name: "תחבורה ודלק", kind: "expense", icon: "🚗", color: "#6366f1" },
  { name: "בריאות וטיפולים", kind: "expense", icon: "🩺", color: "#dc2626" },
  { name: "חובות והלוואות", kind: "expense", icon: "📉", color: "#991b1b" },
  { name: "חיסכון והשקעות", kind: "expense", icon: "🪙", color: "#0891b2" },
  { name: "צדקה ומעשרות", kind: "expense", icon: "🤲", color: "#65a30d" },
  { name: "ספקים (עסק)", kind: "expense", icon: "🏭", color: "#475569" },
  { name: "מסים ומע\"מ (עסק)", kind: "expense", icon: "🧾", color: "#9a3412" },
];

const DEFAULT_TIPS: Array<Omit<FinTip, "id" | "createdAt">> = [
  { title: "בדיקה חודשית של 5 דקות", body: "פעם בחודש, פתחו את הדשבורד ותעברו על קטגוריה אחת שחרגה. בדרך כלל מספיק שינוי קטן אחד כדי להחזיר את התקציב הביתי לאיזון.", tag: "budget", active: 1 },
  { title: "מע\"מ ומקדמות מס", body: "בעלי עסק קטן: סמנו במערכת תזכורת חודשית/דו-חודשית לפי הגדרת הניכויים, כדי לא להגיע לקנס בגלל איחור של יום אחד.", tag: "tax", active: 1 },
  { title: "להפריד הוצאה חד-פעמית מהתקציב", body: "כשמתקיימת הוצאה גדולה חד-פעמית (חתונה, רכב, ריהוט), בנו לה תקציב נפרד ואל תערבבו עם החודש הרגיל. כך לא מאבדים תמונה ביתית.", tag: "saving", active: 1 },
  { title: "זכויות זה כסף", body: "אם מילאתם במערכת מצב משפחתי, ילדים והכנסה, המערכת תזהה הזדמנויות זכויות חינמיות. בכלל לא חייבים לחכות עד שמשהו נשבר.", tag: "rights", active: 1 },
  { title: "תזכורת לחידוש רישיון", body: "רישיון רכב, רישיון עסק, אישור ניהול ספרים — הוסיפו פעם אחת, המערכת תזכיר אוטומטית בכל שנה.", tag: "business", active: 1 },
  { title: "תקציב מזון בלי להרגיש לחץ", body: "במקום לעקוב על כל קנייה, הציבו תקציב חודשי לקטגוריה אחת ('מזון') ופצלו רק כשמשהו ממש חורג. הקלילות שומרת על העקביות.", tag: "family", active: 1 },
];

(function seedFin() {
  const now = new Date().toISOString();
  const cats = finDb.select().from(finCategories).all();
  if (cats.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      finDb.insert(finCategories).values({
        clientId: null,
        name: cat.name,
        kind: cat.kind,
        color: cat.color || "",
        icon: cat.icon || "",
        isSystem: 1,
        createdAt: now,
      }).run();
    }
  }
  const tips = finDb.select().from(finTips).all();
  if (tips.length === 0) {
    for (const tip of DEFAULT_TIPS) {
      finDb.insert(finTips).values({ ...tip, createdAt: now }).run();
    }
  }
  // Seed at least one demo client so the dashboard isn't empty on first run.
  const clients = finDb.select().from(finClients).all();
  if (clients.length === 0) {
    finDb.insert(finClients).values({
      fullName: "משפחה לדוגמה",
      phone: "050-0000000",
      email: "demo@bkalut.local",
      mode: "household",
      familySize: 5,
      city: "ירושלים",
      monthlyIncome: 14000,
      notes: "רשומת דגמה — ניתן למחוק לאחר טעינת לקוחות אמיתיים.",
      createdAt: now,
      updatedAt: now,
    }).run();
  }
})();

// ----- API -----

// Money/quantity fields are always a non-negative magnitude — sign/direction
// comes from the sibling "kind" column (income vs. expense), so a negative
// value here would silently invert monthlySummary()'s income/expense totals
// and budget-overrun alerts. Bad/missing input coerces to 0 (or null for the
// nullable client fields) rather than being rejected, matching the existing
// silent-coercion style in this file.
function nonNegInt(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function nonNegIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const finStorage = {
  // Clients
  listClients(): FinClient[] {
    return finDb.select().from(finClients).all();
  },
  getClient(id: number): FinClient | undefined {
    return finDb.select().from(finClients).where(eq(finClients.id, id)).get();
  },
  createClient(input: Partial<FinClient>): FinClient {
    const now = new Date().toISOString();
    return finDb.insert(finClients).values({
      fullName: input.fullName || "לקוח חדש",
      phone: input.phone || "",
      email: input.email || "",
      mode: (input.mode as string) || "household",
      familySize: nonNegIntOrNull(input.familySize),
      city: input.city || "",
      monthlyIncome: nonNegIntOrNull(input.monthlyIncome),
      coachId: input.coachId ?? null,
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  },
  updateClient(id: number, patch: Partial<FinClient>): FinClient | undefined {
    const existing = this.getClient(id);
    if (!existing) return undefined;
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["fullName", "phone", "email", "mode", "familySize", "city", "monthlyIncome", "coachId", "notes"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.familySize !== undefined) values.familySize = nonNegIntOrNull(values.familySize);
    if (values.monthlyIncome !== undefined) values.monthlyIncome = nonNegIntOrNull(values.monthlyIncome);
    finDb.update(finClients).set(values).where(eq(finClients.id, id)).run();
    return this.getClient(id);
  },
  deleteClient(id: number): void {
    finDb.delete(finClients).where(eq(finClients.id, id)).run();
    finDb.delete(finTransactions).where(eq(finTransactions.clientId, id)).run();
    finDb.delete(finBudgets).where(eq(finBudgets.clientId, id)).run();
    finDb.delete(finRecurring).where(eq(finRecurring.clientId, id)).run();
    finDb.delete(finOpportunities).where(eq(finOpportunities.clientId, id)).run();
  },

  // Categories
  listCategories(clientId?: number | null): FinCategory[] {
    const all = finDb.select().from(finCategories).all();
    return all.filter((c) => c.clientId === null || (clientId != null && c.clientId === clientId));
  },
  createCategory(input: Partial<FinCategory>): FinCategory {
    const now = new Date().toISOString();
    return finDb.insert(finCategories).values({
      clientId: input.clientId ?? null,
      name: input.name || "קטגוריה חדשה",
      kind: (input.kind as string) || "expense",
      color: input.color || "",
      icon: input.icon || "",
      isSystem: 0,
      createdAt: now,
    }).returning().get();
  },
  updateCategory(id: number, patch: Partial<FinCategory>): FinCategory | undefined {
    const existing = finDb.select().from(finCategories).where(eq(finCategories.id, id)).get();
    if (!existing) return undefined;
    const values: any = {};
    for (const k of ["clientId", "name", "kind", "color", "icon"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    finDb.update(finCategories).set(values).where(eq(finCategories.id, id)).run();
    return finDb.select().from(finCategories).where(eq(finCategories.id, id)).get();
  },
  deleteCategory(id: number): void {
    finDb.delete(finCategories).where(eq(finCategories.id, id)).run();
  },

  // Transactions
  listTransactions(clientId: number, opts?: { from?: string; to?: string }): FinTransaction[] {
    let q = finDb.select().from(finTransactions).where(eq(finTransactions.clientId, clientId));
    const rows = q.all();
    return rows.filter((r) => {
      if (opts?.from && r.occurredOn < opts.from) return false;
      if (opts?.to && r.occurredOn > opts.to) return false;
      return true;
    }).sort((a, b) => (b.occurredOn > a.occurredOn ? 1 : b.occurredOn < a.occurredOn ? -1 : b.id - a.id));
  },
  createTransaction(input: Partial<FinTransaction>): FinTransaction {
    const now = new Date().toISOString();
    return finDb.insert(finTransactions).values({
      clientId: Number(input.clientId),
      categoryId: input.categoryId ?? null,
      kind: (input.kind as string) || "expense",
      amount: nonNegInt(input.amount),
      description: input.description || "",
      occurredOn: input.occurredOn || now.slice(0, 10),
      source: input.source || "manual",
      createdAt: now,
    }).returning().get();
  },
  updateTransaction(id: number, patch: Partial<FinTransaction>): FinTransaction | undefined {
    const values: any = {};
    for (const k of ["categoryId", "kind", "amount", "description", "occurredOn"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.amount !== undefined) values.amount = nonNegInt(values.amount);
    finDb.update(finTransactions).set(values).where(eq(finTransactions.id, id)).run();
    return finDb.select().from(finTransactions).where(eq(finTransactions.id, id)).get();
  },
  deleteTransaction(id: number): void {
    finDb.delete(finTransactions).where(eq(finTransactions.id, id)).run();
  },

  // Budgets
  listBudgets(clientId: number): FinBudget[] {
    return finDb.select().from(finBudgets).where(eq(finBudgets.clientId, clientId)).all();
  },
  createBudget(input: Partial<FinBudget>): FinBudget {
    const now = new Date().toISOString();
    return finDb.insert(finBudgets).values({
      clientId: Number(input.clientId),
      categoryId: Number(input.categoryId),
      monthlyLimit: nonNegInt(input.monthlyLimit),
      note: input.note || "",
      createdAt: now,
    }).returning().get();
  },
  updateBudget(id: number, patch: Partial<FinBudget>): FinBudget | undefined {
    const values: any = {};
    for (const k of ["monthlyLimit", "note", "categoryId"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.monthlyLimit !== undefined) values.monthlyLimit = nonNegInt(values.monthlyLimit);
    finDb.update(finBudgets).set(values).where(eq(finBudgets.id, id)).run();
    return finDb.select().from(finBudgets).where(eq(finBudgets.id, id)).get();
  },
  deleteBudget(id: number): void {
    finDb.delete(finBudgets).where(eq(finBudgets.id, id)).run();
  },

  // Recurring tasks/reminders
  listRecurring(clientId: number): FinRecurring[] {
    return finDb.select().from(finRecurring).where(eq(finRecurring.clientId, clientId)).all();
  },
  createRecurring(input: Partial<FinRecurring>): FinRecurring {
    const now = new Date().toISOString();
    return finDb.insert(finRecurring).values({
      clientId: Number(input.clientId),
      title: input.title || "תזכורת",
      amount: nonNegIntOrNull(input.amount),
      kind: (input.kind as string) || "reminder",
      categoryId: input.categoryId ?? null,
      cadence: (input.cadence as string) || "monthly",
      nextDate: input.nextDate || now.slice(0, 10),
      active: input.active ?? 1,
      description: input.description || "",
      createdAt: now,
    }).returning().get();
  },
  updateRecurring(id: number, patch: Partial<FinRecurring>): FinRecurring | undefined {
    const values: any = {};
    for (const k of ["title", "amount", "kind", "categoryId", "cadence", "nextDate", "active", "description"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.amount !== undefined) values.amount = nonNegIntOrNull(values.amount);
    finDb.update(finRecurring).set(values).where(eq(finRecurring.id, id)).run();
    return finDb.select().from(finRecurring).where(eq(finRecurring.id, id)).get();
  },
  deleteRecurring(id: number): void {
    finDb.delete(finRecurring).where(eq(finRecurring.id, id)).run();
  },

  // Opportunities (rights/savings)
  listOpportunities(clientId?: number): FinOpportunity[] {
    const all = finDb.select().from(finOpportunities).all();
    return clientId == null ? all : all.filter((o) => o.clientId === clientId);
  },
  createOpportunity(input: Partial<FinOpportunity>): FinOpportunity {
    const now = new Date().toISOString();
    return finDb.insert(finOpportunities).values({
      clientId: input.clientId ?? null,
      title: input.title || "הזדמנות",
      topic: input.topic || "",
      category: input.category || "",
      rightId: input.rightId ?? null,
      estimatedYearlyValue: input.estimatedYearlyValue ?? null,
      status: (input.status as string) || "new",
      recommendation: input.recommendation || "",
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  },
  updateOpportunity(id: number, patch: Partial<FinOpportunity>): FinOpportunity | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "topic", "category", "rightId", "estimatedYearlyValue", "status", "recommendation"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    finDb.update(finOpportunities).set(values).where(eq(finOpportunities.id, id)).run();
    return finDb.select().from(finOpportunities).where(eq(finOpportunities.id, id)).get();
  },
  deleteOpportunity(id: number): void {
    finDb.delete(finOpportunities).where(eq(finOpportunities.id, id)).run();
  },

  // Leads
  listLeads(): FinLead[] {
    return finDb.select().from(finLeads).all().sort((a, b) => b.id - a.id);
  },
  getLead(id: number): FinLead | undefined {
    return finDb.select().from(finLeads).where(eq(finLeads.id, id)).get();
  },
  createLead(input: Partial<FinLead>): FinLead {
    const now = new Date().toISOString();
    return finDb.insert(finLeads).values({
      fullName: input.fullName || "",
      phone: input.phone || "",
      email: input.email || "",
      mode: input.mode || "household",
      message: input.message || "",
      source: input.source || "financial_marketing",
      status: "new",
      webhookStatus: "pending",
      webhookResponse: "",
      webhookSentAt: "",
      createdAt: now,
    }).returning().get();
  },
  updateLeadWebhook(id: number, status: string, response: string): void {
    finDb.update(finLeads).set({
      webhookStatus: status,
      webhookResponse: response.slice(0, 2000),
      webhookSentAt: new Date().toISOString(),
    }).where(eq(finLeads.id, id)).run();
  },
  updateLeadStatus(id: number, status: string): FinLead | undefined {
    finDb.update(finLeads).set({ status }).where(eq(finLeads.id, id)).run();
    return this.getLead(id);
  },

  // Tips
  listTips(): FinTip[] {
    return finDb.select().from(finTips).all();
  },
  createTip(input: Partial<FinTip>): FinTip {
    const now = new Date().toISOString();
    return finDb.insert(finTips).values({
      title: input.title || "טיפ",
      body: input.body || "",
      tag: input.tag || "",
      active: input.active ?? 1,
      createdAt: now,
    }).returning().get();
  },
  updateTip(id: number, patch: Partial<FinTip>): FinTip | undefined {
    const values: any = {};
    for (const k of ["title", "body", "tag", "active"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    finDb.update(finTips).set(values).where(eq(finTips.id, id)).run();
    return finDb.select().from(finTips).where(eq(finTips.id, id)).get();
  },
  deleteTip(id: number): void {
    finDb.delete(finTips).where(eq(finTips.id, id)).run();
  },

  // ----- Debts -----
  listDebts(clientId: number): FinDebt[] {
    return finDb.select().from(finDebts).where(eq(finDebts.clientId, clientId)).all();
  },
  createDebt(input: Partial<FinDebt>): FinDebt {
    const now = new Date().toISOString();
    return finDb.insert(finDebts).values({
      clientId: Number(input.clientId),
      creditor: input.creditor || "",
      kind: (input.kind as string) || "loan",
      originalAmount: input.originalAmount ?? null,
      currentBalance: Math.round(Number(input.currentBalance) || 0),
      monthlyPayment: input.monthlyPayment ?? null,
      interestRate: input.interestRate ?? null,
      startDate: input.startDate || "",
      endDate: input.endDate || "",
      status: (input.status as string) || "active",
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  },
  updateDebt(id: number, patch: Partial<FinDebt>): FinDebt | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["creditor", "kind", "originalAmount", "currentBalance", "monthlyPayment", "interestRate", "startDate", "endDate", "status", "notes"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.currentBalance !== undefined) values.currentBalance = nonNegInt(values.currentBalance);
    finDb.update(finDebts).set(values).where(eq(finDebts.id, id)).run();
    return finDb.select().from(finDebts).where(eq(finDebts.id, id)).get();
  },
  deleteDebt(id: number): void {
    finDb.delete(finDebts).where(eq(finDebts.id, id)).run();
  },

  // ----- Goals -----
  listGoals(clientId: number): FinGoal[] {
    return finDb.select().from(finGoals).where(eq(finGoals.clientId, clientId)).all();
  },
  createGoal(input: Partial<FinGoal>): FinGoal {
    const now = new Date().toISOString();
    return finDb.insert(finGoals).values({
      clientId: Number(input.clientId),
      title: input.title || "מטרה חדשה",
      targetAmount: Math.round(Number(input.targetAmount) || 0),
      savedAmount: Math.round(Number(input.savedAmount) || 0),
      targetDate: input.targetDate || "",
      monthlyContribution: input.monthlyContribution ?? null,
      category: input.category || "",
      status: (input.status as string) || "active",
      notes: input.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  },
  updateGoal(id: number, patch: Partial<FinGoal>): FinGoal | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "targetAmount", "savedAmount", "targetDate", "monthlyContribution", "category", "status", "notes"] as const) {
      if ((patch as any)[k] !== undefined) values[k] = (patch as any)[k];
    }
    if (values.targetAmount !== undefined) values.targetAmount = nonNegInt(values.targetAmount);
    if (values.savedAmount !== undefined) values.savedAmount = nonNegInt(values.savedAmount);
    finDb.update(finGoals).set(values).where(eq(finGoals.id, id)).run();
    return finDb.select().from(finGoals).where(eq(finGoals.id, id)).get();
  },
  deleteGoal(id: number): void {
    finDb.delete(finGoals).where(eq(finGoals.id, id)).run();
  },

  // ----- Alerts -----
  listAlerts(clientId: number): FinAlert[] {
    return finDb.select().from(finAlerts).where(eq(finAlerts.clientId, clientId)).all().sort((a, b) => b.id - a.id);
  },
  createAlert(input: Partial<FinAlert>): FinAlert {
    const now = new Date().toISOString();
    return finDb.insert(finAlerts).values({
      clientId: Number(input.clientId),
      level: (input.level as string) || "info",
      title: input.title || "התראה",
      body: input.body || "",
      source: input.source || "manual",
      acknowledged: input.acknowledged ?? 0,
      createdAt: now,
    }).returning().get();
  },
  acknowledgeAlert(id: number) {
    finDb.update(finAlerts).set({ acknowledged: 1 }).where(eq(finAlerts.id, id)).run();
    return finDb.select().from(finAlerts).where(eq(finAlerts.id, id)).get();
  },
  deleteAlert(id: number): void {
    finDb.delete(finAlerts).where(eq(finAlerts.id, id)).run();
  },

  // ----- Plans -----
  listPlans(clientId: number): FinPlan[] {
    return finDb.select().from(finPlans).where(eq(finPlans.clientId, clientId)).all();
  },
  createPlan(input: Partial<FinPlan>): FinPlan {
    const now = new Date().toISOString();
    return finDb.insert(finPlans).values({
      clientId: Number(input.clientId),
      title: input.title || "תכנית עבודה",
      summary: input.summary || "",
      stepsJson: (input as any).stepsJson || "[]",
      status: (input.status as string) || "active",
      premium: input.premium ?? 0,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
  },
  updatePlan(id: number, patch: any): FinPlan | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "summary", "stepsJson", "status", "premium"]) {
      if (patch[k] !== undefined) values[k] = patch[k];
    }
    finDb.update(finPlans).set(values).where(eq(finPlans.id, id)).run();
    return finDb.select().from(finPlans).where(eq(finPlans.id, id)).get();
  },
  deletePlan(id: number): void {
    finDb.delete(finPlans).where(eq(finPlans.id, id)).run();
  },

  // ----- Notes -----
  listNotes(clientId: number, visibleToUser = false): FinNote[] {
    const rows = finDb.select().from(finNotes).where(eq(finNotes.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    if (visibleToUser) return rows.filter((r) => r.visibility !== "admin_only");
    return rows;
  },
  createNote(input: Partial<FinNote>): FinNote {
    const now = new Date().toISOString();
    return finDb.insert(finNotes).values({
      clientId: Number(input.clientId),
      authorRole: (input.authorRole as string) || "admin",
      title: input.title || "",
      body: input.body || "",
      visibility: (input.visibility as string) || "both",
      createdAt: now,
    }).returning().get();
  },
  deleteNote(id: number): void {
    finDb.delete(finNotes).where(eq(finNotes.id, id)).run();
  },

  // ----- Auto-generate alerts based on budgets/transactions/recurring/debts -----
  recomputeAlerts(clientId: number, ym?: string) {
    const month = ym || new Date().toISOString().slice(0, 7);
    const summary = this.monthlySummary(clientId, month);
    const budgets = this.listBudgets(clientId);
    const cats = this.listCategories(clientId);
    const generated: Array<Partial<FinAlert>> = [];
    for (const b of budgets) {
      const used = summary.byCategory.find((c) => c.categoryId === b.categoryId)?.total || 0;
      if (used > b.monthlyLimit) {
        const catName = cats.find((c) => c.id === b.categoryId)?.name || `קטגוריה ${b.categoryId}`;
        generated.push({
          clientId,
          level: used > b.monthlyLimit * 1.25 ? "critical" : "warning",
          title: `חריגה מתקציב — ${catName}`,
          body: `הוצאות החודש בקטגוריה זו עברו את המגבלה המוגדרת (בערל של ${used}₪ מתוך ${b.monthlyLimit}₪).`,
          source: "budget_overrun",
        });
      }
    }
    // Upcoming recurring within 7 days
    const today = new Date().toISOString().slice(0, 10);
    const inSevenDays = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    for (const r of this.listRecurring(clientId)) {
      if (r.active && r.nextDate >= today && r.nextDate <= inSevenDays) {
        generated.push({
          clientId,
          level: "info",
          title: `תזכורת — ${r.title}`,
          body: `מועד יעד הבא: ${r.nextDate}${r.amount ? ` (${r.amount}₪)` : ""}`,
          source: "recurring_due",
        });
      }
    }
    // Debts payments overdue
    for (const d of this.listDebts(clientId)) {
      if (d.status === "active" && d.endDate && d.endDate < today) {
        generated.push({
          clientId,
          level: "critical",
          title: `הלוואה לסגירה — ${d.creditor}`,
          body: `יש יתרת חוב לטיפול דחוף — יתרה נוכחית: ${d.currentBalance}₪.`,
          source: "debt_due",
        });
      }
    }
    // Insert all (skip duplicates by title for this month)
    const existing = this.listAlerts(clientId);
    const existingKeys = new Set(existing.map((a) => `${a.source}|${a.title}`));
    const inserted: FinAlert[] = [];
    for (const a of generated) {
      const key = `${a.source}|${a.title}`;
      if (existingKeys.has(key)) continue;
      inserted.push(this.createAlert(a));
    }
    return inserted;
  },

  // ----- Export (JSON-as-CSV-like rows for a single client) -----
  exportClientJson(clientId: number) {
    const client = this.getClient(clientId);
    if (!client) return null;
    return {
      exportVersion: "bkalut-fin-export-v1",
      exportedAt: new Date().toISOString(),
      client,
      categories: this.listCategories(clientId),
      transactions: this.listTransactions(clientId),
      budgets: this.listBudgets(clientId),
      recurring: this.listRecurring(clientId),
      opportunities: this.listOpportunities(clientId),
      debts: this.listDebts(clientId),
      goals: this.listGoals(clientId),
      alerts: this.listAlerts(clientId),
      plans: this.listPlans(clientId),
      notes: this.listNotes(clientId),
      monthly: this.monthlySummary(clientId, new Date().toISOString().slice(0, 7)),
    };
  },

  // ===== CRM: Tasks =====
  listTasks(clientId?: number): FinTask[] {
    if (clientId) return finDb.select().from(finTasks).where(eq(finTasks.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    return finDb.select().from(finTasks).all().sort((a, b) => b.id - a.id);
  },
  getTask(id: number): FinTask | undefined {
    return finDb.select().from(finTasks).where(eq(finTasks.id, id)).get();
  },
  createTask(input: Partial<FinTask> & { clientId: number; title: string }): FinTask {
    const now = new Date().toISOString();
    const row = finDb.insert(finTasks).values({
      clientId: input.clientId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      status: input.status ?? "open",
      priority: input.priority ?? "normal",
      assigneeId: input.assigneeId ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    finStorage.logActivity({
      clientId: row.clientId,
      kind: "task",
      refId: row.id,
      title: `משימה נוצרה: ${row.title}`,
      detail: row.description ?? "",
      actorRole: "admin",
      actorName: row.createdBy ?? "",
    });
    return row;
  },
  updateTask(id: number, patch: Partial<FinTask>): FinTask | undefined {
    const exists = finStorage.getTask(id);
    if (!exists) return undefined;
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "description", "dueDate", "status", "priority", "assigneeId"] as const) {
      if ((patch as any)[k] !== undefined) (values as any)[k] = (patch as any)[k];
    }
    finDb.update(finTasks).set(values).where(eq(finTasks.id, id)).run();
    const updated = finStorage.getTask(id);
    if (updated && patch.status && patch.status !== exists.status) {
      finStorage.logActivity({
        clientId: updated.clientId,
        kind: "task",
        refId: id,
        title: `סטטוס משימה עודכן: ${updated.title} → ${updated.status}`,
        actorRole: "admin",
      });
    }
    return updated;
  },
  deleteTask(id: number): void {
    finDb.delete(finTasks).where(eq(finTasks.id, id)).run();
  },

  // ===== CRM: Messages =====
  listMessages(clientId?: number): FinMessage[] {
    if (clientId) return finDb.select().from(finMessages).where(eq(finMessages.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    return finDb.select().from(finMessages).all().sort((a, b) => b.id - a.id);
  },
  createMessage(input: Partial<FinMessage> & { clientId: number; senderRole: string; body: string }): FinMessage {
    const now = new Date().toISOString();
    const row = finDb.insert(finMessages).values({
      clientId: input.clientId,
      senderRole: input.senderRole,
      senderName: input.senderName ?? null,
      body: input.body,
      channel: input.channel ?? "app",
      readAt: input.readAt ?? null,
      createdAt: now,
    }).returning().get();
    finStorage.logActivity({
      clientId: row.clientId,
      kind: "message",
      refId: row.id,
      title: `הודעה חדשה (${row.senderRole})`,
      detail: row.body.slice(0, 200),
      actorRole: row.senderRole,
      actorName: row.senderName ?? "",
    });
    return row;
  },
  markMessageRead(id: number): FinMessage | undefined {
    finDb.update(finMessages).set({ readAt: new Date().toISOString() }).where(eq(finMessages.id, id)).run();
    return finDb.select().from(finMessages).where(eq(finMessages.id, id)).get();
  },
  deleteMessage(id: number): void {
    finDb.delete(finMessages).where(eq(finMessages.id, id)).run();
  },

  // ===== CRM: Documents =====
  listDocuments(clientId?: number): FinDocument[] {
    if (clientId) return finDb.select().from(finDocuments).where(eq(finDocuments.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    return finDb.select().from(finDocuments).all().sort((a, b) => b.id - a.id);
  },
  createDocument(input: Partial<FinDocument> & { clientId: number; title: string }): FinDocument {
    const now = new Date().toISOString();
    const row = finDb.insert(finDocuments).values({
      clientId: input.clientId,
      title: input.title,
      docType: input.docType ?? "other",
      status: input.status ?? "pending",
      url: input.url ?? null,
      storageKey: input.storageKey ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      notes: input.notes ?? null,
      uploadedBy: input.uploadedBy ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    finStorage.logActivity({
      clientId: row.clientId,
      kind: "document",
      refId: row.id,
      title: `מסמך נוסף: ${row.title} (${row.docType})`,
      detail: row.notes ?? "",
      actorRole: "admin",
      actorName: row.uploadedBy ?? "",
    });
    return row;
  },
  updateDocument(id: number, patch: Partial<FinDocument>): FinDocument | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "docType", "status", "url", "storageKey", "mimeType", "sizeBytes", "notes"] as const) {
      if ((patch as any)[k] !== undefined) (values as any)[k] = (patch as any)[k];
    }
    finDb.update(finDocuments).set(values).where(eq(finDocuments.id, id)).run();
    return finDb.select().from(finDocuments).where(eq(finDocuments.id, id)).get();
  },
  deleteDocument(id: number): void {
    finDb.delete(finDocuments).where(eq(finDocuments.id, id)).run();
  },

  // ===== CRM: Activity log =====
  listActivity(clientId?: number, limit = 200): FinActivityLog[] {
    const rows = clientId
      ? finDb.select().from(finActivityLog).where(eq(finActivityLog.clientId, clientId)).all()
      : finDb.select().from(finActivityLog).all();
    return rows.sort((a, b) => b.id - a.id).slice(0, limit);
  },
  logActivity(input: Partial<FinActivityLog> & { clientId: number; kind: string; title: string }): FinActivityLog {
    return finDb.insert(finActivityLog).values({
      clientId: input.clientId,
      kind: input.kind,
      refId: input.refId ?? null,
      title: input.title,
      detail: input.detail ?? null,
      actorRole: input.actorRole ?? null,
      actorName: input.actorName ?? null,
      createdAt: new Date().toISOString(),
    }).returning().get();
  },

  // ===== CRM: Reminders =====
  listReminders(clientId?: number): FinReminder[] {
    if (clientId) return finDb.select().from(finReminders).where(eq(finReminders.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    return finDb.select().from(finReminders).all().sort((a, b) => b.id - a.id);
  },
  createReminder(input: Partial<FinReminder> & { clientId: number; title: string; dueAt: string }): FinReminder {
    const row = finDb.insert(finReminders).values({
      clientId: input.clientId,
      relatedKind: input.relatedKind ?? null,
      relatedId: input.relatedId ?? null,
      title: input.title,
      body: input.body ?? null,
      dueAt: input.dueAt,
      channel: input.channel ?? "internal",
      status: input.status ?? "pending",
      sentAt: input.sentAt ?? null,
      createdAt: new Date().toISOString(),
    }).returning().get();
    finStorage.logActivity({
      clientId: row.clientId,
      kind: "reminder",
      refId: row.id,
      title: `תזכורת נוצרה: ${row.title}`,
      detail: `מועד: ${row.dueAt}`,
      actorRole: "admin",
    });
    return row;
  },
  updateReminder(id: number, patch: Partial<FinReminder>): FinReminder | undefined {
    const values: any = {};
    for (const k of ["title", "body", "dueAt", "channel", "status", "sentAt", "relatedKind", "relatedId"] as const) {
      if ((patch as any)[k] !== undefined) (values as any)[k] = (patch as any)[k];
    }
    finDb.update(finReminders).set(values).where(eq(finReminders.id, id)).run();
    return finDb.select().from(finReminders).where(eq(finReminders.id, id)).get();
  },
  deleteReminder(id: number): void {
    finDb.delete(finReminders).where(eq(finReminders.id, id)).run();
  },

  // ===== CRM: Monthly reports =====
  listReports(clientId?: number): FinReport[] {
    if (clientId) return finDb.select().from(finReports).where(eq(finReports.clientId, clientId)).all().sort((a, b) => b.id - a.id);
    return finDb.select().from(finReports).all().sort((a, b) => b.id - a.id);
  },
  createReport(input: Partial<FinReport> & { clientId: number; periodMonth: string; title: string }): FinReport {
    const now = new Date().toISOString();
    const row = finDb.insert(finReports).values({
      clientId: input.clientId,
      periodMonth: input.periodMonth,
      title: input.title,
      status: input.status ?? "draft",
      summary: input.summary ?? null,
      metricsJson: input.metricsJson ?? "{}",
      sentAt: input.sentAt ?? null,
      url: input.url ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning().get();
    finStorage.logActivity({
      clientId: row.clientId,
      kind: "report",
      refId: row.id,
      title: `דוח חודשי נוצר: ${row.title} (${row.periodMonth})`,
      actorRole: "admin",
    });
    return row;
  },
  updateReport(id: number, patch: Partial<FinReport>): FinReport | undefined {
    const values: any = { updatedAt: new Date().toISOString() };
    for (const k of ["title", "status", "summary", "metricsJson", "sentAt", "url", "periodMonth"] as const) {
      if ((patch as any)[k] !== undefined) (values as any)[k] = (patch as any)[k];
    }
    finDb.update(finReports).set(values).where(eq(finReports.id, id)).run();
    return finDb.select().from(finReports).where(eq(finReports.id, id)).get();
  },
  deleteReport(id: number): void {
    finDb.delete(finReports).where(eq(finReports.id, id)).run();
  },

  // ===== Aggregate: full list across all clients =====
  listAllPlans(clientId?: number): FinPlan[] {
    if (clientId) return finDb.select().from(finPlans).where(eq(finPlans.clientId, clientId)).all();
    return finDb.select().from(finPlans).all();
  },

  // Dashboard summary
  monthlySummary(clientId: number, ym: string) {
    const from = `${ym}-01`;
    const [y, m] = ym.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const to = `${next}-01`;
    const rows = finDb.select().from(finTransactions).where(eq(finTransactions.clientId, clientId)).all();
    const inMonth = rows.filter((r) => r.occurredOn >= from && r.occurredOn < to);
    let income = 0, expense = 0;
    const byCategory = new Map<number, { kind: string; total: number }>();
    for (const r of inMonth) {
      if (r.kind === "income") income += r.amount;
      else expense += r.amount;
      if (r.kind !== "income") {
        const cid = r.categoryId ?? 0;
        const cur = byCategory.get(cid) || { kind: r.kind, total: 0 };
        cur.total += r.amount;
        byCategory.set(cid, cur);
      }
    }
    return {
      income,
      expense,
      net: income - expense,
      txCount: inMonth.length,
      byCategory: Array.from(byCategory.entries()).map(([categoryId, v]) => ({ categoryId, ...v })),
    };
  },
};
