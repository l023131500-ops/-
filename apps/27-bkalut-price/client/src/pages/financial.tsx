/**
 * Active Financial Management module — runs inside the bklot-app shell as an admin-gated
 * mini-app. Provides: client list, monthly dashboard, transactions, budgets, recurring
 * reminders, opportunities and leads — all backed by real /api/financial/* routes.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdminAuth } from "@/lib/admin-auth";
import { localDateStr } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Users, TrendingDown, TrendingUp, AlertTriangle, Bell, Lightbulb, Mail,
  Plus, Trash2, RefreshCcw, ShieldCheck, Banknote, Calendar, ListChecks, Inbox, FileText,
  Sparkles, LogIn, UserCog,
} from "lucide-react";
import { Link } from "wouter";

type Tab = "overview" | "clients" | "transactions" | "budgets" | "recurring" | "opportunities" | "coaches" | "leads" | "tips";

interface FinClient { id: number; fullName: string; phone?: string; email?: string; mode: string; familySize?: number | null; city?: string; monthlyIncome?: number | null; coachId?: number | null; notes?: string }
interface FinCoach { id: number; fullName: string; email?: string; phone?: string; username?: string | null; status: string; plan: string; productAccess: string[]; clientCount: number; notes?: string }
interface FinCategory { id: number; clientId: number | null; name: string; kind: string; color?: string; icon?: string; isSystem: number }
interface FinTransaction { id: number; clientId: number; categoryId: number | null; kind: string; amount: number; description?: string; occurredOn: string; source?: string }
interface FinBudget { id: number; clientId: number; categoryId: number; monthlyLimit: number; note?: string }
interface FinRecurring { id: number; clientId: number; title: string; amount?: number | null; kind: string; categoryId?: number | null; cadence: string; nextDate: string; active: number; description?: string }
interface FinOpportunity { id: number; clientId: number | null; title: string; topic?: string; category?: string; rightId?: number | null; estimatedYearlyValue?: number | null; status: string; recommendation?: string }
interface FinLead { id: number; fullName: string; phone: string; email?: string; mode?: string; message?: string; source?: string; status: string; webhookStatus: string; webhookResponse?: string | null; webhookSentAt?: string | null; createdAt: string }
interface FinTip { id: number; title: string; body: string; tag?: string; active: number }

function ils(n: number | null | undefined) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

function currentMonth() { return new Date().toISOString().slice(0, 7); }

export default function FinancialPage() {
  const { isAuthed } = useAdminAuth();
  if (!isAuthed) return <FinancialMarketingFallback />;
  return <FinancialApp />;
}

function FinancialMarketingFallback() {
  return (
    <div dir="rtl" className="space-y-8" data-testid="page-financial-marketing">
      <Card className="p-8 border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-[hsl(190_55%_96%)] space-y-5">
        <Badge variant="secondary">מערכת ניהול פיננסי · בקלות</Badge>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">חשבון אחד. שתי חוויות. שליטה אמיתית על הכסף של המשפחה והעסק.</h1>
        <p className="text-foreground/80 leading-relaxed max-w-3xl">
          הזנת הוצאות בעברית חופשית, תקציב חי, תזכורות לתשלומי בירוקרטיה, איתור הזדמנויות זכויות בתוך נתוני הלקוח — ודשבורד ברור גם ללקוח וגם לצוות בקלות.
          המערכת פעילה, לא דף שיווקי. הכניסה מאובטחת מאחורי משתמש אדמין.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" data-testid="cta-login-financial">
            <Link href="/login"><LogIn className="w-4 h-4 ml-2" /> כניסה למערכת</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features">מה כולל המוצר</a>
          </Button>
        </div>
      </Card>

      <section id="features" className="grid md:grid-cols-3 gap-4">
        {[
          { icon: Wallet, title: "תקציב חי לבית ולעסק", desc: "ניהול תקציב חודשי לכל קטגוריה, התראות חריגה בזמן אמת ודשבורד נקי לסקירת המצב." },
          { icon: Banknote, title: "הוצאות והכנסות", desc: "הזנה ידנית, תיוג לפי קטגוריות, תיעוד מקור (מזומן/אשראי/העברה) ופילוח חודשי." },
          { icon: Bell, title: "תזכורות בירוקרטיות", desc: "מע\"מ, ביטוח לאומי, חידושי רישיון, תרומות — לוח שנה אחד עם תזכורות חוזרות." },
          { icon: Sparkles, title: "הזדמנויות זכויות", desc: "המערכת מצליבה את פרופיל הלקוח (משפחה גדולה, הכנסה נמוכה, בעלי עסק) עם מאגר הזכויות." },
          { icon: Lightbulb, title: "טיפים והמלצות", desc: "ארגז עצות פיננסיות חכמות לשני מצבי שימוש - ביתי ועסקי, נשלטים על־ידי הצוות." },
          { icon: ShieldCheck, title: "הפרדת לקוח/אדמין", desc: "תצוגה פנימית מלאה לצוות בקלות + הצגה ידידותית ללקוח כאשר הוא משתף את הקישור שלו." },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="p-5 space-y-3">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </Card>
        ))}
      </section>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">הפנייה מאתר השיווק</h2>
        <p className="text-sm text-muted-foreground">
          הטופס הפומבי באתר השיווק הפיננסי שולח לכאן את הלידים. כל ליד נשמר בבסיס הנתונים ונשלח לוובהוק שמוגדר על־ידי האדמין (ברירת מחדל - וובהוק n8n הראשי).
        </p>
        <p className="text-sm">
          לקבלת גישה לדשבורד החי, התחברו עם משתמש האדמין דרך <Link href="/login" className="text-primary underline">עמוד הכניסה</Link>.
        </p>
      </Card>
    </div>
  );
}

function FinancialApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const { data: overview } = useQuery<any>({ queryKey: ["/api/financial/overview"] });
  const { data: clients = [] } = useQuery<FinClient[]>({ queryKey: ["/api/financial/clients"] });

  // Default-select first client when list arrives
  if (selectedClientId === null && clients.length > 0) {
    setSelectedClientId(clients[0].id);
  }
  const activeClient = clients.find((c) => c.id === selectedClientId) ?? null;

  const TABS: Array<{ key: Tab; label: string; icon: any }> = [
    { key: "overview", label: "סקירה", icon: Wallet },
    { key: "clients", label: "לקוחות", icon: Users },
    { key: "transactions", label: "תנועות", icon: TrendingDown },
    { key: "budgets", label: "תקציב", icon: TrendingUp },
    { key: "recurring", label: "תזכורות", icon: Bell },
    { key: "opportunities", label: "הזדמנויות", icon: Sparkles },
    { key: "coaches", label: "מאמנים", icon: UserCog },
    { key: "leads", label: "פניות", icon: Inbox },
    { key: "tips", label: "טיפים", icon: Lightbulb },
  ];

  return (
    <div dir="rtl" className="space-y-5" data-testid="page-financial-app">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">פעיל · ניהול פיננסי</Badge>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">המערכת הפיננסית של בקלות</h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול תקציב, הוצאות, תזכורות, הזדמנויות זכויות ופניות מאתר השיווק - הכל במקום אחד, גם לתצוגת לקוח וגם לאדמין.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">לקוח פעיל:</span>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
            data-testid="select-active-client"
          >
            {clients.length === 0 && <option value="">אין לקוחות עדיין</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName} · {c.mode === "business" ? "עסק" : "משק בית"}</option>
            ))}
          </select>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border" data-testid="nav-financial-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors ${tab === key ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(key)}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab overview={overview} client={activeClient} />}
      {tab === "clients" && <ClientsTab clients={clients} activeId={selectedClientId} onSelect={setSelectedClientId} />}
      {tab === "transactions" && activeClient && <TransactionsTab client={activeClient} />}
      {tab === "budgets" && activeClient && <BudgetsTab client={activeClient} />}
      {tab === "recurring" && activeClient && <RecurringTab client={activeClient} />}
      {tab === "opportunities" && <OpportunitiesTab client={activeClient} />}
      {tab === "coaches" && <CoachesTab clients={clients} activeClient={activeClient} />}
      {tab === "leads" && <LeadsTab />}
      {tab === "tips" && <TipsTab />}
      {(tab === "transactions" || tab === "budgets" || tab === "recurring") && !activeClient && (
        <Card className="p-6 text-sm text-muted-foreground">בחרו לקוח פעיל בראש המסך כדי לראות את הנתונים.</Card>
      )}
    </div>
  );
}

// ----------------- Overview -----------------

function OverviewTab({ overview, client }: { overview: any; client: FinClient | null }) {
  const month = currentMonth();
  const { data: summary } = useQuery<any>({
    queryKey: ["/api/financial/clients", client?.id, "summary", month],
    enabled: !!client,
  });
  const { data: tips = [] } = useQuery<FinTip[]>({ queryKey: ["/api/financial/tips"] });
  const s = summary?.summary;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="לקוחות במערכת" value={overview?.clientsCount ?? "—"} />
        <Kpi icon={Inbox} label="פניות חדשות" value={overview?.newLeadsCount ?? "—"} />
        <Kpi icon={Sparkles} label="הזדמנויות זכויות" value={overview?.opportunitiesCount ?? "—"} />
        <Kpi icon={Lightbulb} label="טיפים פעילים" value={overview?.tipsCount ?? "—"} />
      </div>

      {client && (
        <Card className="p-5 space-y-3" data-testid="card-monthly-summary">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">תקציר חודשי — {client.fullName}</h2>
              <p className="text-xs text-muted-foreground">חודש: {month}</p>
            </div>
            <Badge variant={client.mode === "business" ? "default" : "secondary"}>{client.mode === "business" ? "מצב עסקי" : "משק בית"}</Badge>
          </div>
          <Separator />
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="הכנסות חודש" value={ils(s?.income)} positive />
            <Stat label="הוצאות חודש" value={ils(s?.expense)} />
            <Stat label="נטו" value={ils(s?.net)} positive={(s?.net ?? 0) >= 0} />
          </div>
          {summary?.budgets?.length > 0 && (
            <div className="mt-3 space-y-2">
              <h3 className="font-semibold text-sm">סטטוס תקציב</h3>
              {summary.budgets.map((b: FinBudget) => {
                const cat = (summary.categories as FinCategory[]).find((c) => c.id === b.categoryId);
                const spent = (s?.byCategory ?? []).find((row: any) => row.categoryId === b.categoryId)?.total ?? 0;
                const pct = b.monthlyLimit > 0 ? Math.min(100, Math.round((spent / b.monthlyLimit) * 100)) : 0;
                const over = spent > b.monthlyLimit;
                return (
                  <div key={b.id} className="rounded border border-border bg-muted/20 p-3">
                    <div className="flex justify-between text-sm">
                      <span>{cat?.icon} {cat?.name ?? `קטגוריה ${b.categoryId}`}</span>
                      <span className={over ? "text-destructive font-semibold" : ""}>
                        {ils(spent)} / {ils(b.monthlyLimit)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
                      <div className={`h-full transition-all ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> טיפים פעילים</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {tips.map((t) => (
            <div key={t.id} className="rounded border border-border bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{t.title}</p>
                {t.tag && <Badge variant="outline" className="text-[10px]">{t.tag}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-prewrap">{t.body}</p>
            </div>
          ))}
          {tips.length === 0 && <p className="text-sm text-muted-foreground">אין טיפים פעילים. הוסיפו בלשונית "טיפים".</p>}
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <Icon className="w-6 h-6 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
function Stat({ label, value, positive }: { label: string; value: any; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${positive === true ? "text-emerald-600" : positive === false ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}

// ----------------- Clients -----------------

function ClientsTab({ clients, activeId, onSelect }: { clients: FinClient[]; activeId: number | null; onSelect: (id: number) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<FinClient>>({ fullName: "", phone: "", email: "", mode: "household", familySize: 4, monthlyIncome: 0 });
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/financial/clients", form)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/financial/clients"] }); setForm({ fullName: "", phone: "", email: "", mode: "household" }); toast({ title: "לקוח נוסף" }); },
    onError: () => toast({ title: "הוספת הלקוח נכשלה", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/financial/clients"] }),
    onError: () => toast({ title: "מחיקת הלקוח נכשלה", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">הוספת לקוח חדש</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="שם מלא" value={form.fullName || ""} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} data-testid="input-client-name" />
          <Input placeholder="טלפון" value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} data-testid="input-client-phone" />
          <Input placeholder="מייל" type="email" value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.mode || "household"} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
            <option value="household">משק בית</option>
            <option value="business">עסק קטן</option>
          </select>
          <Input type="number" min={1} placeholder="גודל משפחה" value={form.familySize ?? ""} onChange={(e) => setForm((f) => ({ ...f, familySize: e.target.value ? Number(e.target.value) : null }))} />
          <Input type="number" placeholder="הכנסה חודשית משוערת" value={form.monthlyIncome ?? ""} onChange={(e) => setForm((f) => ({ ...f, monthlyIncome: e.target.value ? Number(e.target.value) : null }))} />
        </div>
        <Button onClick={() => create.mutate()} disabled={!form.fullName || create.isPending} data-testid="button-create-client">
          <Plus className="w-4 h-4 ml-1" /> {create.isPending ? "מוסיף..." : "הוספת לקוח"}
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">לקוחות במערכת</h3>
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className={`flex items-center justify-between rounded-lg border p-3 ${activeId === c.id ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}>
              <button type="button" className="text-right flex-1" onClick={() => onSelect(c.id)} aria-pressed={activeId === c.id} data-testid={`client-row-${c.id}`}>
                <p className="font-semibold">{c.fullName} <Badge variant="outline" className="text-[10px] mr-2">{c.mode === "business" ? "עסק" : "משק בית"}</Badge></p>
                <p className="text-xs text-muted-foreground"><span dir="ltr">{c.phone}</span> · {c.email || "—"} · {c.city || ""}{c.monthlyIncome ? ` · הכנסה ${ils(c.monthlyIncome)}/חודש` : ""}</p>
              </button>
              <Button variant="ghost" size="sm" onClick={() => { if (!confirm(`למחוק את הלקוח "${c.fullName}"? כל התנועות, התקציבים והתזכורות שלו יימחקו יחד איתו.`)) return; del.mutate(c.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-muted-foreground">אין לקוחות. הוסיפו אחד מלמעלה.</p>}
        </div>
      </Card>
    </div>
  );
}

// ----------------- Transactions -----------------

function TransactionsTab({ client }: { client: FinClient }) {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinTransaction[]>({ queryKey: [`/api/financial/clients/${client.id}/transactions`] });
  const { data: cats = [] } = useQuery<FinCategory[]>({ queryKey: ["/api/financial/categories"] });
  const [form, setForm] = useState({ kind: "expense", amount: "", categoryId: "", description: "", occurredOn: localDateStr() });
  const amountValid = Number.isFinite(Number(form.amount)) && Number(form.amount) > 0;
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/financial/transactions", { ...form, amount: Number(form.amount), categoryId: form.categoryId ? Number(form.categoryId) : null, clientId: client.id })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/transactions`] }); setForm((f) => ({ ...f, amount: "", description: "" })); },
    onError: () => toast({ title: "הוספת התנועה נכשלה", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/transactions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/transactions`] }),
    onError: () => toast({ title: "מחיקת התנועה נכשלה", variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">הוספת תנועה</h3>
        <div className="grid md:grid-cols-5 gap-3">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </select>
          <Input type="number" placeholder="סכום ₪" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} data-testid="input-tx-amount" />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">קטגוריה</option>
            {cats.filter((c) => c.kind === form.kind).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <Input type="date" value={form.occurredOn} onChange={(e) => setForm((f) => ({ ...f, occurredOn: e.target.value }))} />
          <Input placeholder="הערה (לא חובה)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <Button onClick={() => create.mutate()} disabled={!amountValid || create.isPending} data-testid="button-create-tx">
          <Plus className="w-4 h-4 ml-1" /> הוספה
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">תנועות אחרונות</h3>
        <div className="space-y-1">
          {list.map((t) => {
            const cat = cats.find((c) => c.id === t.categoryId);
            return (
              <div key={t.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t.occurredOn}</span>
                  <span className="mr-3">{cat?.icon} {cat?.name || "ללא קטגוריה"}</span>
                  <span className="mr-3 text-muted-foreground">{t.description}</span>
                  {t.source === "user" && <Badge variant="outline" className="text-[10px] mr-2">דווח ע״י הלקוח</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold tabular-nums ${t.kind === "income" ? "text-emerald-600" : "text-foreground"}`}>{t.kind === "income" ? "+" : "-"}{ils(t.amount)}</span>
                  <Button size="sm" variant="ghost" onClick={() => { if (!confirm("למחוק את התנועה? לא ניתן לשחזר.")) return; del.mutate(t.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <p className="text-sm text-muted-foreground">אין תנועות חודש זה. הוסיפו תנועה ראשונה.</p>}
        </div>
      </Card>
    </div>
  );
}

// ----------------- Budgets -----------------

function BudgetsTab({ client }: { client: FinClient }) {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinBudget[]>({ queryKey: [`/api/financial/clients/${client.id}/budgets`] });
  const { data: cats = [] } = useQuery<FinCategory[]>({ queryKey: ["/api/financial/categories"] });
  const [form, setForm] = useState({ categoryId: "", monthlyLimit: "", note: "" });
  const monthlyLimitValid = Number.isFinite(Number(form.monthlyLimit)) && Number(form.monthlyLimit) > 0;
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/financial/budgets", { clientId: client.id, categoryId: Number(form.categoryId), monthlyLimit: Number(form.monthlyLimit), note: form.note })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/budgets`] }); setForm({ categoryId: "", monthlyLimit: "", note: "" }); },
    onError: () => toast({ title: "הגדרת התקציב נכשלה", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/budgets`] }),
    onError: () => toast({ title: "מחיקת התקציב נכשלה", variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">הגדרת תקציב חודשי</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">קטגוריה</option>
            {cats.filter((c) => c.kind === "expense").map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <Input type="number" placeholder="תקציב חודשי ₪" value={form.monthlyLimit} onChange={(e) => setForm((f) => ({ ...f, monthlyLimit: e.target.value }))} />
          <Input placeholder="הערה" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <Button onClick={() => create.mutate()} disabled={!form.categoryId || !monthlyLimitValid || create.isPending}><Plus className="w-4 h-4 ml-1" /> {create.isPending ? "מוסיף..." : "הוספה"}</Button>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">תקציבים פעילים</h3>
        <div className="space-y-2">
          {list.map((b) => {
            const cat = cats.find((c) => c.id === b.categoryId);
            return (
              <div key={b.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                <span>{cat?.icon} {cat?.name || `קטגוריה ${b.categoryId}`} {b.note && <span className="text-muted-foreground">· {b.note}</span>}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{ils(b.monthlyLimit)}</span>
                  <Button size="sm" variant="ghost" onClick={() => { if (!confirm("למחוק את התקציב?")) return; del.mutate(b.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && <p className="text-sm text-muted-foreground">לא הוגדרו תקציבים.</p>}
        </div>
      </Card>
    </div>
  );
}

// ----------------- Recurring / Reminders -----------------

function RecurringTab({ client }: { client: FinClient }) {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinRecurring[]>({ queryKey: [`/api/financial/clients/${client.id}/recurring`] });
  const { data: cats = [] } = useQuery<FinCategory[]>({ queryKey: ["/api/financial/categories"] });
  const [form, setForm] = useState({ title: "", amount: "", kind: "reminder", cadence: "monthly", nextDate: localDateStr(), description: "" });
  const amountValid = form.amount.trim() === "" || (Number.isFinite(Number(form.amount)) && Number(form.amount) > 0);
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/financial/recurring", { ...form, amount: form.amount ? Number(form.amount) : null, clientId: client.id })).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/recurring`] }); setForm({ title: "", amount: "", kind: "reminder", cadence: "monthly", nextDate: localDateStr(), description: "" }); },
    onError: () => toast({ title: "הוספת התזכורת נכשלה", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/recurring/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/recurring`] }),
    onError: () => toast({ title: "מחיקת התזכורת נכשלה", variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => apiRequest("PATCH", `/api/financial/recurring/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${client.id}/recurring`] }),
    onError: () => toast({ title: "עדכון התזכורת נכשל", variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">תזכורת או משימה חוזרת</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder={'כותרת — לדוגמה: תשלום מע"מ דו-חודשי'} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input type="number" placeholder="סכום (לא חובה)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Input type="date" value={form.nextDate} onChange={(e) => setForm((f) => ({ ...f, nextDate: e.target.value }))} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            <option value="reminder">תזכורת כללית</option>
            <option value="bill">חשבון/חיוב</option>
            <option value="tax">תשלום מס</option>
            <option value="task">משימה משרדית</option>
          </select>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.cadence} onChange={(e) => setForm((f) => ({ ...f, cadence: e.target.value }))}>
            <option value="monthly">חודשי</option>
            <option value="bimonthly">דו־חודשי</option>
            <option value="quarterly">רבעוני</option>
            <option value="yearly">שנתי</option>
            <option value="once">חד פעמי</option>
          </select>
          <Input placeholder="פירוט" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <Button onClick={() => create.mutate()} disabled={!form.title || !form.nextDate || !amountValid || create.isPending}><Plus className="w-4 h-4 ml-1" /> {create.isPending ? "מוסיף..." : "הוספה"}</Button>
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold mb-3">תזכורות פעילות</h3>
        <div className="space-y-2">
          {list.map((r) => {
            const cat = cats.find((c) => c.id === r.categoryId);
            return (
            <div key={r.id} className={`flex items-center justify-between border-b border-border py-2 text-sm ${!r.active ? "opacity-50" : ""}`}>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">תאריך בא: {r.nextDate} · {r.cadence} · {r.kind}</p>
                {cat && <p className="text-xs text-muted-foreground mt-0.5">{cat.icon} {cat.name}</p>}
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                {r.amount ? <span className="tabular-nums">{ils(r.amount)}</span> : null}
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={Boolean(r.active)} onChange={(e) => update.mutate({ id: r.id, patch: { active: e.target.checked ? 1 : 0 } })} />
                  פעיל
                </label>
                <Button size="sm" variant="ghost" onClick={() => { if (!confirm(`למחוק את התזכורת "${r.title}"?`)) return; del.mutate(r.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
            );
          })}
          {list.length === 0 && <p className="text-sm text-muted-foreground">אין תזכורות עדיין.</p>}
        </div>
      </Card>
    </div>
  );
}

// ----------------- Opportunities -----------------

function OpportunitiesTab({ client }: { client: FinClient | null }) {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinOpportunity[]>({ queryKey: ["/api/financial/opportunities", client?.id ?? null] });
  const suggest = useMutation({
    mutationFn: async () => {
      if (!client) return {};
      return (await apiRequest("POST", `/api/financial/clients/${client.id}/suggest-opportunities`, {})).json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/financial/opportunities"] }),
    onError: () => toast({ title: "חיפוש ההזדמנויות נכשל", variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/financial/opportunities/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/financial/opportunities"] }); toast({ title: "הסטטוס עודכן" }); },
    onError: () => toast({ title: "עדכון הסטטוס נכשל", variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card className="p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">הזדמנויות זכויות וחסכונות</h3>
          <p className="text-sm text-muted-foreground">המערכת מצליבה את פרופיל הלקוח עם מאגר הזכויות בבקלות ומציעה כיוונים לבירור.</p>
        </div>
        <Button onClick={() => suggest.mutate()} disabled={!client || suggest.isPending} data-testid="button-suggest-opps">
          <RefreshCcw className="w-4 h-4 ml-1" /> {suggest.isPending ? "מחפש..." : "חפש הזדמנויות ללקוח"}
        </Button>
      </Card>
      <Card className="p-5">
        <div className="space-y-2">
          {list.map((o) => (
            <div key={o.id} className="rounded border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{o.title}</p>
                  <p className="text-xs text-muted-foreground">{o.category} · {o.topic}</p>
                  {!!o.estimatedYearlyValue && <p className="text-xs text-emerald-700">פוטנציאל שנתי: {ils(o.estimatedYearlyValue)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === "done" ? "default" : "secondary"}>{statusLabel(o.status)}</Badge>
                  <select className="rounded-md border border-input bg-background px-2 py-1 text-xs" value={o.status} disabled={update.isPending} onChange={(e) => update.mutate({ id: o.id, status: e.target.value })}>
                    <option value="new">חדש</option>
                    <option value="in_progress">בטיפול</option>
                    <option value="done">הושלם</option>
                    <option value="dismissed">לא רלוונטי</option>
                  </select>
                  {o.rightId && (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/rights/${o.rightId}`}>פתח את הזכות</Link>
                    </Button>
                  )}
                </div>
              </div>
              {o.recommendation && <p className="text-xs mt-2 leading-relaxed">{o.recommendation}</p>}
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">אין הזדמנויות. בחרו לקוח והפעילו "חפש הזדמנויות ללקוח".</p>}
        </div>
      </Card>
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "new") return "חדש";
  if (s === "in_progress") return "בטיפול";
  if (s === "done") return "הושלם";
  if (s === "dismissed") return "לא רלוונטי";
  return s;
}

// ----------------- Coaches -----------------

function CoachesTab({ clients, activeClient }: { clients: FinClient[]; activeClient: FinClient | null }) {
  const { toast } = useToast();
  const { data: coaches = [] } = useQuery<FinCoach[]>({ queryKey: ["/api/financial/coaches"] });

  const assign = useMutation({
    mutationFn: async ({ clientId, coachId }: { clientId: number; coachId: number | null }) =>
      apiRequest("PATCH", `/api/financial/clients/${clientId}/assign-coach`, { coachId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/coaches"] });
      toast({ title: "הקצאת מאמן עודכנה" });
    },
    onError: () => toast({ title: "הקצאת המאמן נכשלה", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-2">
        <h3 className="font-semibold flex items-center gap-2">
          <UserCog className="w-4 h-4 text-primary" /> מאמנים פעילים במערכת
        </h3>
        <p className="text-sm text-muted-foreground">
          מאמנים נוצרים ומנוהלים דרך
          {" "}
          <Link href="/users" className="text-primary underline">משתמשי המערכת</Link>
          {" "}
          עם תפקיד "מאמן". כאן ניתן לראות עומס לקוחות ולשייך לקוח פיננסי למאמן.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">רשימת מאמנים</h3>
        <div className="space-y-2">
          {coaches.map((c) => (
            <div key={c.id} className="rounded border border-border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">{c.fullName} <Badge variant="outline" className="text-[10px] mr-2">{c.status === "active" ? "פעיל" : c.status}</Badge></p>
                  <p className="text-xs text-muted-foreground">
                    {c.email || "ללא מייל"} · <span dir="ltr">{c.phone || "—"}</span> · {c.clientCount} לקוחות
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{c.plan}</Badge>
              </div>
              {c.notes && <p className="text-xs text-muted-foreground mt-2">{c.notes}</p>}
            </div>
          ))}
          {coaches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              לא נמצאו מאמנים. הוסיפו משתמש חדש עם תפקיד "מאמן" במסך
              {" "}
              <Link href="/users" className="text-primary underline">משתמשים</Link>.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">שיוך לקוח למאמן</h3>
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className={`flex items-center justify-between border-b border-border py-2 text-sm ${activeClient?.id === c.id ? "bg-primary/5" : ""}`}>
              <div>
                <p className="font-semibold">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">{c.email || "—"} · {c.mode === "business" ? "עסק" : "משק בית"}</p>
              </div>
              <select
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                value={c.coachId ?? ""}
                onChange={(e) => assign.mutate({ clientId: c.id, coachId: e.target.value ? Number(e.target.value) : null })}
                data-testid={`select-coach-${c.id}`}
              >
                <option value="">ללא מאמן</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>{coach.fullName}</option>
                ))}
              </select>
            </div>
          ))}
          {clients.length === 0 && <p className="text-sm text-muted-foreground">אין לקוחות פיננסיים עדיין.</p>}
        </div>
      </Card>
    </div>
  );
}

// ----------------- Leads -----------------

function LeadsTab() {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinLead[]>({ queryKey: ["/api/financial/leads"] });
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/financial/leads/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/financial/leads"] }); toast({ title: "סטטוס הפנייה עודכן" }); },
    onError: () => toast({ title: "עדכון הפנייה נכשל", variant: "destructive" }),
  });
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Inbox className="w-4 h-4 text-primary" /> פניות מאתר השיווק הפיננסי</h3>
      <div className="space-y-2">
        {list.map((l) => (
          <div key={l.id} className="rounded border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <p className="font-semibold">{l.fullName} · <span dir="ltr">{l.phone}</span></p>
                <p className="text-xs text-muted-foreground">{l.email || "—"} · {l.mode === "business" ? "עסק" : "משק בית"}{l.source ? ` · מקור: ${l.source}` : ""} · {l.createdAt.slice(0, 16).replace("T", " ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={l.webhookStatus === "sent" ? "default" : l.webhookStatus === "failed" ? "destructive" : "outline"}>וובהוק: {l.webhookStatus}</Badge>
                {l.webhookSentAt && <span className="text-xs text-muted-foreground">נשלח ב-{l.webhookSentAt.slice(0, 16).replace("T", " ")}</span>}
                {l.webhookStatus === "failed" && l.webhookResponse && <span className="text-xs text-destructive" title={l.webhookResponse}>{l.webhookResponse}</span>}
                <select className="rounded-md border border-input bg-background px-2 py-1 text-xs" value={l.status} disabled={update.isPending} onChange={(e) => update.mutate({ id: l.id, status: e.target.value })}>
                  <option value="new">חדש</option>
                  <option value="contacted">יצרנו קשר</option>
                  <option value="converted">הומר ללקוח</option>
                  <option value="discarded">לא רלוונטי</option>
                </select>
              </div>
            </div>
            {l.message && <p className="text-sm mt-2 leading-relaxed">{l.message}</p>}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">אין פניות מאתר השיווק עדיין.</p>}
      </div>
    </Card>
  );
}

// ----------------- Tips -----------------

function TipsTab() {
  const { toast } = useToast();
  const { data: list = [] } = useQuery<FinTip[]>({ queryKey: ["/api/financial/admin/tips"] });
  const [form, setForm] = useState({ title: "", body: "", tag: "saving", active: 1 });
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/financial/tips", form)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/financial/admin/tips"] }); setForm({ title: "", body: "", tag: "saving", active: 1 }); },
    onError: () => toast({ title: "הוספת הטיפ נכשלה", variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => apiRequest("PATCH", `/api/financial/tips/${id}`, patch),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/financial/admin/tips"] }); toast({ title: "הטיפ עודכן" }); },
    onError: () => toast({ title: "עדכון הטיפ נכשל", variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/tips/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/financial/admin/tips"] }),
    onError: () => toast({ title: "מחיקת הטיפ נכשלה", variant: "destructive" }),
  });
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h3 className="font-semibold">טיפ חדש</h3>
        <Input placeholder="כותרת" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea placeholder="גוף הטיפ" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} aria-label="גוף הטיפ" className="min-h-24" />
        <div className="flex gap-3">
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}>
            <option value="saving">חיסכון</option>
            <option value="budget">תקציב</option>
            <option value="tax">מס</option>
            <option value="rights">זכויות</option>
            <option value="business">עסקי</option>
            <option value="family">משפחה</option>
          </select>
          <Button onClick={() => create.mutate()} disabled={!form.title || !form.body || create.isPending}><Plus className="w-4 h-4 ml-1" /> {create.isPending ? "מוסיף..." : "הוספה"}</Button>
        </div>
      </Card>
      <Card className="p-5">
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="rounded border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{t.title} <Badge variant="outline" className="text-[10px] mr-2">{t.tag}</Badge></p>
                <div className="flex items-center gap-2">
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" checked={Boolean(t.active)} onChange={(e) => update.mutate({ id: t.id, patch: { active: e.target.checked ? 1 : 0 } })} />
                    פעיל
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => { if (!confirm(`למחוק את הטיפ "${t.title}"?`)) return; del.mutate(t.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 whitespace-prewrap">{t.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
