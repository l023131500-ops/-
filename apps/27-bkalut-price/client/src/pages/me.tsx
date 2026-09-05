/**
 * Personal financial dashboard for an authenticated user.
 * Shows their own client's data only (transactions, budgets, recurring
 * reminders, debts, goals, documents, alerts, plans, notes, opportunities).
 * Allows them to add transactions, ack alerts, request premium upgrade.
 */
import { useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUserAuth } from "@/lib/user-auth";
import { localDateStr, safeUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Wallet, TrendingUp, TrendingDown, Bell, Sparkles, LogOut, BadgeCheck,
  Target, Banknote, ListChecks, FileDown, Lightbulb, AlertTriangle, BarChart3, FileText, Repeat,
} from "lucide-react";

function ils(n: number | null | undefined) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(v);
}

interface DashboardPayload {
  noClient?: boolean;
  month: string;
  summary: { income: number; expense: number; net: number; txCount: number; byCategory: Array<{ categoryId: number; kind: string; total: number }> };
  categories: Array<{ id: number; name: string; kind: string; icon?: string }>;
  transactions: Array<{ id: number; categoryId: number | null; kind: string; amount: number; description?: string; occurredOn: string; source?: string | null }>;
  budgets: Array<{ id: number; categoryId: number; monthlyLimit: number; note?: string }>;
  recurring: Array<{ id: number; title: string; amount?: number | null; cadence: string; nextDate: string; kind: string; description?: string | null; active?: number }>;
  debts: Array<{ id: number; creditor: string; kind: string; originalAmount?: number | null; currentBalance: number; monthlyPayment?: number | null; interestRate?: number | null; startDate?: string | null; endDate?: string | null; status: string; notes?: string | null }>;
  goals: Array<{ id: number; title: string; targetAmount: number; savedAmount: number; targetDate?: string; monthlyContribution?: number | null; category?: string | null; status: string }>;
  documents: Array<{ id: number; title: string; docType: string; status: string; url?: string | null; notes?: string | null; createdAt: string }>;
  alerts: Array<{ id: number; level: string; title: string; body?: string; source?: string }>;
  plans: Array<{ id: number; title: string; summary?: string; status: string; premium: number; stepsJson: string }>;
  notes: Array<{ id: number; title?: string; body: string; authorRole: string; createdAt: string }>;
  opportunities: Array<{ id: number; title: string; status: string; estimatedYearlyValue?: number | null; recommendation?: string; topic?: string; category?: string }>;
  tips: Array<{ id: number; title: string; body: string; tag?: string }>;
  reports: Array<{ id: number; periodMonth: string; title: string; status: string; summary?: string | null; url?: string | null; sentAt?: string | null }>;
  premiumActive: boolean;
}

export default function MePage() {
  const { user, isAuthed, logout } = useUserAuth();
  const [, navigate] = useLocation();
  if (!isAuthed) {
    navigate("/user-login");
    return null;
  }

  const dashboardQuery = useQuery<DashboardPayload>({
    queryKey: ["/api/me/financial/dashboard"],
  });
  const premiumQuery = useQuery<Array<{ id: number; status: string; message: string; createdAt: string; adminNote: string }>>({
    queryKey: ["/api/user/premium-requests"],
  });

  return (
    <div dir="rtl" className="space-y-6" data-testid="page-me">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">הדשבורד האישי שלך</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-greeting">
            שלום, {user?.fullName}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Badge variant={user?.plan === "premium" ? "default" : "secondary"} className="text-[11px]">
              מסלול {user?.plan === "premium" ? "פרימיום" : "בסיסי"}
              {user?.plan === "premium" && <BadgeCheck className="w-3 h-3 mr-1" />}
            </Badge>
            {user?.email && <span dir="ltr">{user?.email}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/user-login"); }} data-testid="button-logout">
          <LogOut className="w-4 h-4 ml-1" />
          יציאה
        </Button>
      </header>

      {dashboardQuery.isLoading && (
        <Card className="p-6 text-sm text-muted-foreground">טוען את הדשבורד...</Card>
      )}
      {dashboardQuery.data?.noClient && (
        <Card className="p-6 text-sm text-foreground/80">
          לא הוגדר עדיין לקוח פיננסי לחשבון הזה. צוות בקלות בודק את ההפעלה. בכל מקרה ניתן ליצור קשר בטלפון
          02-3131500 או במייל.
        </Card>
      )}
      {dashboardQuery.data && !dashboardQuery.data.noClient && (
        <DashboardContent
          data={dashboardQuery.data}
          premiumRequests={premiumQuery.data ?? []}
          premiumActive={user?.plan === "premium"}
        />
      )}
    </div>
  );
}

function DashboardContent({ data, premiumRequests, premiumActive }: { data: DashboardPayload; premiumRequests: any[]; premiumActive: boolean }) {
  const [tab, setTab] = useState<string>("overview");
  const { toast } = useToast();

  const newTxMutation = useMutation({
    mutationFn: async (body: any) => (await apiRequest("POST", "/api/me/financial/transactions", body)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/me/financial/dashboard"] }),
    onError: () => toast({ title: "הוספת התנועה נכשלה", variant: "destructive" }),
  });
  const ackAlert = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/me/financial/alerts/${id}/ack`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/me/financial/dashboard"] }),
    onError: () => toast({ title: "סימון ההתראה נכשל", variant: "destructive" }),
  });
  const requestPremium = useMutation({
    mutationFn: async (message: string) => (await apiRequest("POST", "/api/user/premium-requests", { message })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/premium-requests"] });
    },
    onError: () => toast({ title: "שליחת הבקשה נכשלה", variant: "destructive" }),
  });

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap gap-2">
        <TabsTrigger value="overview">סקירה</TabsTrigger>
        <TabsTrigger value="transactions">הוצאות והכנסות</TabsTrigger>
        <TabsTrigger value="budgets">תקציב</TabsTrigger>
        <TabsTrigger value="recurring">תזכורות</TabsTrigger>
        <TabsTrigger value="debts">חובות</TabsTrigger>
        <TabsTrigger value="goals">מטרות</TabsTrigger>
        <TabsTrigger value="documents">מסמכים</TabsTrigger>
        <TabsTrigger value="reports">דוחות חודשיים</TabsTrigger>
        <TabsTrigger value="plans">תכניות צוות</TabsTrigger>
        <TabsTrigger value="opportunities">זכויות</TabsTrigger>
        <TabsTrigger value="alerts">התראות</TabsTrigger>
        <TabsTrigger value="notes">פתקים</TabsTrigger>
        <TabsTrigger value="premium">פרימיום</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid md:grid-cols-3 gap-3">
          <Card className="p-5 space-y-2">
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><span className="text-xs text-muted-foreground">הכנסות החודש</span></div>
            <div className="text-2xl font-bold" data-testid="kpi-income">{ils(data.summary.income)}</div>
          </Card>
          <Card className="p-5 space-y-2">
            <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-rose-600" /><span className="text-xs text-muted-foreground">הוצאות החודש</span></div>
            <div className="text-2xl font-bold" data-testid="kpi-expense">{ils(data.summary.expense)}</div>
          </Card>
          <Card className="p-5 space-y-2">
            <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">יתרה חודשית</span></div>
            <div className={`text-2xl font-bold ${data.summary.net >= 0 ? "text-emerald-700" : "text-rose-700"}`} data-testid="kpi-net">{ils(data.summary.net)}</div>
          </Card>
        </div>
        <Card className="p-5 mt-3 space-y-2">
          <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4" /> טיפים החודש</h3>
          {data.tips.length === 0 ? <p className="text-sm text-muted-foreground">אין טיפים פעילים כרגע.</p> : (
            <ul className="text-sm space-y-2">
              {data.tips.map((t) => (
                <li key={t.id} className="border-r-2 border-primary pr-3"><strong>{t.title}</strong> <span className="text-muted-foreground">— {t.body}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="transactions">
        <TransactionsTab data={data} onCreate={(b) => newTxMutation.mutate(b)} />
      </TabsContent>
      <TabsContent value="budgets">
        <BudgetsTab data={data} />
      </TabsContent>
      <TabsContent value="recurring">
        <RecurringTab data={data} />
      </TabsContent>
      <TabsContent value="debts">
        <DebtsTab data={data} />
      </TabsContent>
      <TabsContent value="goals">
        <GoalsTab data={data} />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentsTab data={data} />
      </TabsContent>
      <TabsContent value="reports">
        <ReportsTab data={data} />
      </TabsContent>
      <TabsContent value="plans">
        <PlansTab data={data} premiumActive={premiumActive} />
      </TabsContent>
      <TabsContent value="opportunities">
        <OpportunitiesTab data={data} />
      </TabsContent>
      <TabsContent value="alerts">
        <AlertsTab data={data} onAck={(id) => ackAlert.mutate(id)} />
      </TabsContent>
      <TabsContent value="notes">
        <NotesTab data={data} />
      </TabsContent>
      <TabsContent value="premium">
        <PremiumTab requests={premiumRequests} active={premiumActive} onRequest={(m) => requestPremium.mutate(m)} pending={requestPremium.isPending} />
      </TabsContent>
    </Tabs>
  );
}

function categoryName(data: DashboardPayload, id: number | null) {
  if (id == null) return "ללא קטגוריה";
  return data.categories.find((c) => c.id === id)?.name || `קטגוריה ${id}`;
}

const txSourceLabel: Record<string, string> = { recurring: "אוטומטי", import: "ייבוא", manual: "הוזן ע״י הצוות" };

function TransactionsTab({ data, onCreate }: { data: DashboardPayload; onCreate: (b: any) => void }) {
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState<string>(localDateStr());
  const filteredCats = data.categories.filter((c) => c.kind === kind);

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold">הוסף הוצאה / הכנסה</h3>
        <div className="grid md:grid-cols-5 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="border rounded-md px-2 py-1.5 bg-background">
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </select>
          <Input type="number" placeholder="סכום ₪" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)} className="border rounded-md px-2 py-1.5 bg-background">
            <option value="">קטגוריה</option>
            {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
          <Input placeholder="תיאור" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!amount) return;
            onCreate({ kind, amount: Number(amount), categoryId, description, occurredOn });
            setAmount(""); setDescription("");
          }}
        >
          הוסף
        </Button>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-right"><tr><th className="py-2 px-3">תאריך</th><th className="py-2 px-3">קטגוריה</th><th className="py-2 px-3">סוג</th><th className="py-2 px-3">סכום</th><th className="py-2 px-3">תיאור</th></tr></thead>
          <tbody>
            {data.transactions.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">אין תנועות לחודש הזה.</td></tr>}
            {data.transactions.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="py-2 px-3">{t.occurredOn}</td>
                <td className="py-2 px-3">{categoryName(data, t.categoryId)}</td>
                <td className="py-2 px-3">{t.kind === "income" ? "הכנסה" : "הוצאה"}</td>
                <td className={`py-2 px-3 font-medium ${t.kind === "income" ? "text-emerald-700" : "text-rose-700"}`}>{ils(t.amount)}</td>
                <td className="py-2 px-3 text-muted-foreground">
                  {t.description}
                  {t.source && t.source !== "user" && (
                    <Badge variant="outline" className="text-[10px] mr-2">{txSourceLabel[t.source] ?? t.source}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BudgetsTab({ data }: { data: DashboardPayload }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-right"><tr><th className="py-2 px-3">קטגוריה</th><th className="py-2 px-3">תקרה חודשית</th><th className="py-2 px-3">בוצע החודש</th><th className="py-2 px-3">שימוש</th></tr></thead>
        <tbody>
          {data.budgets.length === 0 ? <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">אין תקציבים מוגדרים.</td></tr> :
            data.budgets.map((b) => {
              const used = data.summary.byCategory.find((c) => c.categoryId === b.categoryId)?.total || 0;
              const ratio = Math.min(100, Math.round((used / Math.max(b.monthlyLimit, 1)) * 100));
              return (
                <tr key={b.id} className="border-t border-border">
                  <td className="py-2 px-3">
                    {categoryName(data, b.categoryId)}
                    {b.note && <div className="text-xs text-muted-foreground">{b.note}</div>}
                  </td>
                  <td className="py-2 px-3">{ils(b.monthlyLimit)}</td>
                  <td className="py-2 px-3">{ils(used)}</td>
                  <td className="py-2 px-3 w-1/3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${ratio >= 100 ? "bg-rose-500" : ratio >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <div className="text-[11px] mt-1 text-muted-foreground">{ratio}%</div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </Card>
  );
}

const recurringKindLabel: Record<string, string> = { reminder: "תזכורת כללית", bill: "חשבון/חיוב", tax: "תשלום מס", task: "משימה משרדית" };
const recurringCadenceLabel: Record<string, string> = { monthly: "חודשי", bimonthly: "דו־חודשי", quarterly: "רבעוני", yearly: "שנתי", once: "חד פעמי" };

function RecurringTab({ data }: { data: DashboardPayload }) {
  const active = data.recurring.filter((r) => r.active !== 0);
  return (
    <div className="space-y-3">
      {active.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין תזכורות או משימות חוזרות פעילות.</Card>}
      {active.map((r) => (
        <Card key={r.id} className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><Repeat className="w-4 h-4" /> {r.title}</h4>
            {r.amount ? <span className="text-sm font-medium tabular-nums">{ils(r.amount)}</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">תאריך בא: {r.nextDate} · {recurringCadenceLabel[r.cadence] ?? r.cadence} · {recurringKindLabel[r.kind] ?? r.kind}</p>
          {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
        </Card>
      ))}
    </div>
  );
}

function DebtsTab({ data }: { data: DashboardPayload }) {
  const total = data.debts.reduce((s, d) => s + d.currentBalance, 0);
  return (
    <div className="space-y-3">
      <Card className="p-4 flex items-center gap-3"><Banknote className="w-5 h-5 text-rose-600" /><div><div className="text-xs text-muted-foreground">סך כל החובות הפעילים</div><div className="text-xl font-bold">{ils(total)}</div></div></Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-right"><tr><th className="py-2 px-3">נושה</th><th className="py-2 px-3">סוג</th><th className="py-2 px-3">סכום מקורי</th><th className="py-2 px-3">יתרה</th><th className="py-2 px-3">תשלום חודשי</th><th className="py-2 px-3">ריבית</th><th className="py-2 px-3">תאריך התחלה</th><th className="py-2 px-3">תאריך סיום</th><th className="py-2 px-3">סטטוס</th></tr></thead>
          <tbody>
            {data.debts.length === 0 ? <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">אין חובות רשומים.</td></tr> :
              data.debts.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2 px-3">
                    {d.creditor}
                    {d.notes && <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={d.notes}>{d.notes}</div>}
                  </td>
                  <td className="py-2 px-3">{d.kind}</td>
                  <td className="py-2 px-3">{d.originalAmount != null ? ils(d.originalAmount) : "—"}</td>
                  <td className="py-2 px-3 font-medium">{ils(d.currentBalance)}</td>
                  <td className="py-2 px-3">{d.monthlyPayment ? ils(d.monthlyPayment) : "—"}</td>
                  <td className="py-2 px-3">{d.interestRate != null ? `${(d.interestRate / 100).toFixed(2)}%` : "—"}</td>
                  <td className="py-2 px-3">{d.startDate || "—"}</td>
                  <td className="py-2 px-3">{d.endDate || "—"}</td>
                  <td className="py-2 px-3">{d.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function GoalsTab({ data }: { data: DashboardPayload }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {data.goals.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין מטרות עדיין. בקשו מצוות בקלות להוסיף מטרה ביעדים אישיים.</Card>}
      {data.goals.map((g) => {
        const ratio = Math.min(100, Math.round((g.savedAmount / Math.max(g.targetAmount, 1)) * 100));
        return (
          <Card key={g.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> {g.title}</h4>
              <Badge variant="outline" className="text-[11px]">{g.status}</Badge>
            </div>
            <div className="text-sm">{ils(g.savedAmount)} / {ils(g.targetAmount)} ({ratio}%)</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
            </div>
            {g.targetDate && <div className="text-xs text-muted-foreground">יעד: {g.targetDate}</div>}
            {g.monthlyContribution != null && <div className="text-xs text-muted-foreground">הפקדה חודשית: {ils(g.monthlyContribution)}</div>}
            {g.category && <div className="text-xs text-muted-foreground">קטגוריה: {g.category}</div>}
          </Card>
        );
      })}
    </div>
  );
}

const docTypeLabel: Record<string, string> = { consent: "הסכמה / הצהרה", poa: "ייפוי כוח", id: "תעודת זהות", bank: "פרטי בנק", invoice: "חשבונית", report: "דוח", other: "אחר" };
const docStatusLabel: Record<string, string> = { pending: "ממתין", received: "התקבל", reviewed: "נבדק", rejected: "נדחה" };

function DocumentsTab({ data }: { data: DashboardPayload }) {
  return (
    <div className="space-y-3">
      {data.documents.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין מסמכים רשומים.</Card>}
      {data.documents.map((d) => (
        <Card key={d.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> {d.title}</h4>
            <Badge variant={d.status === "rejected" ? "destructive" : d.status === "reviewed" || d.status === "received" ? "default" : "secondary"} className="text-[11px]">{docStatusLabel[d.status] ?? d.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{docTypeLabel[d.docType] ?? d.docType}</p>
          <p className="text-[11px] text-muted-foreground" dir="ltr">{d.createdAt.slice(0, 10)}</p>
          {d.notes && <p className="text-sm text-muted-foreground">{d.notes}</p>}
          {safeUrl(d.url) && (
            <a href={safeUrl(d.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <FileDown className="w-4 h-4" /> צפייה במסמך
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}

function ReportsTab({ data }: { data: DashboardPayload }) {
  const statusLabel: Record<string, string> = { sent: "נשלח", archived: "בארכיון" };
  return (
    <div className="space-y-3">
      {data.reports.length === 0 && <Card className="p-6 text-muted-foreground text-sm">עדיין לא נשלחו דוחות חודשיים.</Card>}
      {data.reports.map((r) => (
        <Card key={r.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {r.title}</h4>
            <Badge variant="outline" className="text-[11px]">{statusLabel[r.status] ?? r.status}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">תקופה: {r.periodMonth}{r.sentAt && <span> · נשלח בתאריך {r.sentAt.slice(0, 10)}</span>}</div>
          {r.summary && <p className="text-sm whitespace-pre-wrap">{r.summary}</p>}
          {safeUrl(r.url) && (
            <a href={safeUrl(r.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <FileDown className="w-4 h-4" /> צפייה בדוח המלא
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}

function PlansTab({ data, premiumActive }: { data: DashboardPayload; premiumActive: boolean }) {
  return (
    <div className="space-y-3">
      {data.plans.length === 0 && <Card className="p-6 text-muted-foreground text-sm">לא הוגדרו תכניות עבודה.</Card>}
      {data.plans.map((p) => {
        const steps: Array<{ step: string; due?: string; done?: boolean }> = (() => { try { return JSON.parse(p.stepsJson || "[]"); } catch { return []; } })();
        return (
          <Card key={p.id} className={`p-4 space-y-2 ${p.premium && !premiumActive ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4" /> {p.title}</h4>
              {p.premium ? <Badge variant="default" className="text-[11px]">פרימיום</Badge> : <Badge variant="outline" className="text-[11px]">סטנדרט</Badge>}
            </div>
            {p.summary && <p className="text-sm text-muted-foreground">{p.summary}</p>}
            <ul className="text-sm space-y-1">
              {steps.map((s, i) => (
                <li key={i} className={s.done ? "line-through text-muted-foreground" : ""}>
                  {s.done ? "✓" : "▢"} {s.step} {s.due && <span className="text-xs text-muted-foreground">({s.due})</span>}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function OpportunitiesTab({ data }: { data: DashboardPayload }) {
  return (
    <div className="space-y-3">
      {data.opportunities.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין הזדמנויות זכויות פתוחות כרגע.</Card>}
      {data.opportunities.map((o) => (
        <Card key={o.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{o.title}</h4>
            <Badge variant="outline" className="text-[11px]">{o.status}</Badge>
          </div>
          {(o.category || o.topic) && (
            <p className="text-xs text-muted-foreground">{[o.category, o.topic].filter(Boolean).join(" · ")}</p>
          )}
          {o.recommendation && <p className="text-sm text-muted-foreground">{o.recommendation}</p>}
          {o.estimatedYearlyValue && <p className="text-xs text-emerald-700">פוטנציאל שנתי: {ils(o.estimatedYearlyValue)}</p>}
        </Card>
      ))}
    </div>
  );
}

function AlertsTab({ data, onAck }: { data: DashboardPayload; onAck: (id: number) => void }) {
  return (
    <div className="space-y-2">
      {data.alerts.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין התראות פתוחות.</Card>}
      {data.alerts.map((a) => (
        <Card key={a.id} className={`p-4 flex items-start gap-3 ${a.level === "critical" ? "border-rose-300 bg-rose-50/40" : a.level === "warning" ? "border-amber-300 bg-amber-50/40" : ""}`}>
          {a.level === "critical" ? <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5" /> : <Bell className="w-4 h-4 mt-0.5 text-amber-600" />}
          <div className="flex-1">
            <div className="font-medium text-sm">{a.title}</div>
            {a.body && <div className="text-sm text-muted-foreground">{a.body}</div>}
            {a.source && <div className="text-[11px] text-muted-foreground mt-1">מקור: {a.source}</div>}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onAck(a.id)}>סומן</Button>
        </Card>
      ))}
    </div>
  );
}

function NotesTab({ data }: { data: DashboardPayload }) {
  return (
    <div className="space-y-2">
      {data.notes.length === 0 && <Card className="p-6 text-muted-foreground text-sm">אין פתקים.</Card>}
      {data.notes.map((n) => (
        <Card key={n.id} className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{n.authorRole === "admin" ? "צוות בקלות" : "אישי"}</span>
            <span dir="ltr">{n.createdAt.slice(0, 10)}</span>
          </div>
          {n.title && <h5 className="font-medium">{n.title}</h5>}
          <p className="text-sm whitespace-pre-wrap">{n.body}</p>
        </Card>
      ))}
    </div>
  );
}

function PremiumTab({ requests, active, onRequest, pending }: { requests: any[]; active: boolean; onRequest: (m: string) => void; pending: boolean }) {
  const [message, setMessage] = useState("");
  const lastPending = requests.find((r) => r.status === "pending");
  return (
    <div className="space-y-3">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{active ? "החשבון שלך פרימיום פעיל" : "שדרוג לחשבון פרימיום"}</h3>
        </div>
        {active ? (
          <p className="text-sm text-muted-foreground">המסלול פעיל. כל התכניות הפרימיום פתוחות לצפייה בלשונית "תכניות צוות".</p>
        ) : lastPending ? (
          <p className="text-sm text-amber-700">בקשתך נמצאת בבדיקה אצל הצוות. נחזור אליך בהקדם.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">המסלול הפרימיום פותח תכניות מורחבות, ליווי אישי, ניתוח עומק וסיוע מתקדם במיצוי זכויות. שלח/י בקשה והצוות יחזור אליך.</p>
            <Textarea placeholder="כתבו לנו מה הייתם רוצים לקבל בפרימיום" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="בקשה למסלול פרימיום" />
            <Button size="sm" disabled={pending} onClick={() => { onRequest(message); setMessage(""); }}>שליחת בקשה</Button>
          </>
        )}
      </Card>
      <Card className="p-5 space-y-2">
        <h4 className="font-medium">היסטוריית בקשות</h4>
        {requests.length === 0 && <p className="text-sm text-muted-foreground">אין בקשות.</p>}
        {requests.map((r) => (
          <div key={r.id} className="border-t pt-2 text-sm">
            <div className="flex items-center justify-between">
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="text-[11px]">{r.status}</Badge>
              <span className="text-xs text-muted-foreground" dir="ltr">{r.createdAt.slice(0, 10)}</span>
            </div>
            {r.message && <p className="text-foreground/80 mt-1">{r.message}</p>}
            {r.adminNote && <p className="text-muted-foreground mt-1">תגובת צוות: {r.adminNote}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}
