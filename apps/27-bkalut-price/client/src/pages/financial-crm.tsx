import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import type { FinClient, FinTask, FinMessage, FinDocument, FinReminder, FinReport, FinActivityLog, FinGoal } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, CheckSquare, Mail, FileText, Bell, BarChart3, Clock, Plus, Send, Trash2, Users, ChevronLeft, Target,
} from "lucide-react";

type Tab = "tasks" | "messages" | "documents" | "reminders" | "reports" | "goals" | "activity";

export default function FinancialCrmPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/financial-crm/:clientId");
  const [, setLoc] = useLocation();
  const selectedId = params?.clientId ? Number(params.clientId) : null;
  const [tab, setTab] = useState<Tab>("tasks");

  const { data: clients, isLoading: clientsLoading } = useQuery<FinClient[]>({
    queryKey: ["/api/financial/clients"],
  });
  const { data: coaches } = useQuery<any[]>({ queryKey: ["/api/financial/coaches"] });

  const client = useMemo(() => clients?.find((c) => c.id === selectedId) ?? null, [clients, selectedId]);

  const { data: tasks } = useQuery<FinTask[]>({
    queryKey: [`/api/financial/clients/${selectedId}/tasks`],
    enabled: Boolean(selectedId),
  });
  const { data: messages } = useQuery<FinMessage[]>({
    queryKey: [`/api/financial/clients/${selectedId}/messages`],
    enabled: Boolean(selectedId),
  });
  const { data: documents } = useQuery<FinDocument[]>({
    queryKey: [`/api/financial/clients/${selectedId}/documents`],
    enabled: Boolean(selectedId),
  });
  const { data: reminders } = useQuery<FinReminder[]>({
    queryKey: [`/api/financial/clients/${selectedId}/reminders`],
    enabled: Boolean(selectedId),
  });
  const { data: reports } = useQuery<FinReport[]>({
    queryKey: [`/api/financial/clients/${selectedId}/reports`],
    enabled: Boolean(selectedId),
  });
  const { data: goals } = useQuery<FinGoal[]>({
    queryKey: [`/api/financial/clients/${selectedId}/goals`],
    enabled: Boolean(selectedId),
  });
  const { data: activity } = useQuery<FinActivityLog[]>({
    queryKey: [`/api/financial/clients/${selectedId}/activity`],
    enabled: Boolean(selectedId),
  });

  function refreshFor(kind: string) {
    queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${selectedId}/${kind}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/financial/clients/${selectedId}/activity`] });
  }

  // --- Forms state ---
  const [newTask, setNewTask] = useState({ title: "", description: "", dueDate: "", priority: "normal", assigneeId: "" });
  const [newMessage, setNewMessage] = useState({ body: "", channel: "app", senderRole: "admin" });
  const [newDoc, setNewDoc] = useState({ title: "", docType: "consent", status: "pending", url: "", notes: "" });
  const [newReminder, setNewReminder] = useState({ title: "", body: "", dueAt: "", channel: "internal" });
  const [newReport, setNewReport] = useState({ title: "", periodMonth: new Date().toISOString().slice(0, 7), summary: "", status: "draft" });
  const [newGoal, setNewGoal] = useState({ title: "", targetAmount: "", targetDate: "", monthlyContribution: "" });

  const createTask = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/tasks", {
        clientId: selectedId,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate || null,
        priority: newTask.priority,
        assigneeId: newTask.assigneeId ? Number(newTask.assigneeId) : null,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("tasks");
      setNewTask({ title: "", description: "", dueDate: "", priority: "normal", assigneeId: "" });
      toast({ title: "המשימה נוספה" });
    },
    onError: () => toast({ title: "שגיאה ביצירת משימה", variant: "destructive" }),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await apiRequest("PATCH", `/api/financial/tasks/${id}`, { status });
      return r.json();
    },
    onSuccess: () => refreshFor("tasks"),
    onError: () => toast({ title: "שגיאה בעדכון סטטוס המשימה", variant: "destructive" }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/tasks/${id}`),
    onSuccess: () => refreshFor("tasks"),
    onError: () => toast({ title: "שגיאה במחיקת המשימה", variant: "destructive" }),
  });

  const createMessage = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/messages", {
        clientId: selectedId,
        body: newMessage.body,
        senderRole: newMessage.senderRole,
        channel: newMessage.channel,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("messages");
      setNewMessage({ body: "", channel: "app", senderRole: "admin" });
      toast({ title: "ההודעה נשלחה" });
    },
    onError: () => toast({ title: "שגיאה בשליחת ההודעה", variant: "destructive" }),
  });

  const createDoc = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/documents", {
        clientId: selectedId,
        ...newDoc,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("documents");
      setNewDoc({ title: "", docType: "consent", status: "pending", url: "", notes: "" });
      toast({ title: "המסמך נוסף" });
    },
    onError: () => toast({ title: "שגיאה בהוספת המסמך", variant: "destructive" }),
  });

  const updateDocStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await apiRequest("PATCH", `/api/financial/documents/${id}`, { status });
      return r.json();
    },
    onSuccess: () => refreshFor("documents"),
    onError: () => toast({ title: "שגיאה בעדכון סטטוס המסמך", variant: "destructive" }),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/documents/${id}`),
    onSuccess: () => refreshFor("documents"),
    onError: () => toast({ title: "שגיאה במחיקת המסמך", variant: "destructive" }),
  });

  const createReminder = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/reminders", {
        clientId: selectedId,
        ...newReminder,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("reminders");
      setNewReminder({ title: "", body: "", dueAt: "", channel: "internal" });
      toast({ title: "התזכורת נשמרה" });
    },
    onError: () => toast({ title: "שגיאה בשמירת התזכורת", variant: "destructive" }),
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/reminders/${id}`),
    onSuccess: () => refreshFor("reminders"),
    onError: () => toast({ title: "שגיאה במחיקת התזכורת", variant: "destructive" }),
  });

  const createReport = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/reports", {
        clientId: selectedId,
        ...newReport,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("reports");
      setNewReport({ title: "", periodMonth: new Date().toISOString().slice(0, 7), summary: "", status: "draft" });
      toast({ title: "דוח נוצר" });
    },
    onError: () => toast({ title: "שגיאה ביצירת הדוח", variant: "destructive" }),
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/financial/goals", {
        clientId: selectedId,
        title: newGoal.title,
        targetAmount: Number(newGoal.targetAmount) || 0,
        targetDate: newGoal.targetDate || null,
        monthlyContribution: newGoal.monthlyContribution ? Number(newGoal.monthlyContribution) : null,
      });
      return r.json();
    },
    onSuccess: () => {
      refreshFor("goals");
      setNewGoal({ title: "", targetAmount: "", targetDate: "", monthlyContribution: "" });
      toast({ title: "המטרה נוספה" });
    },
    onError: () => toast({ title: "שגיאה ביצירת המטרה", variant: "destructive" }),
  });

  const updateGoalStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await apiRequest("PATCH", `/api/financial/goals/${id}`, { status });
      return r.json();
    },
    onSuccess: () => refreshFor("goals"),
    onError: () => toast({ title: "שגיאה בעדכון סטטוס המטרה", variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/financial/goals/${id}`),
    onSuccess: () => refreshFor("goals"),
    onError: () => toast({ title: "שגיאה במחיקת המטרה", variant: "destructive" }),
  });

  const TABS: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "tasks", label: "משימות", icon: CheckSquare },
    { key: "messages", label: "הודעות", icon: Mail },
    { key: "documents", label: "מסמכים", icon: FileText },
    { key: "reminders", label: "תזכורות", icon: Bell },
    { key: "reports", label: "דוחות חודשיים", icon: BarChart3 },
    { key: "goals", label: "מטרות", icon: Target },
    { key: "activity", label: "פעילות", icon: Clock },
  ];

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5" data-testid="page-financial-crm">
      <aside className="space-y-3">
        <Card className="p-4 border border-card-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="font-bold">CRM פיננסי</h2>
          </div>
          <p className="text-xs text-muted-foreground">בחרו לקוח לפתיחת כרטיס מלא: משימות, הודעות, מסמכים, תזכורות, דוחות וטיימליין פעילות.</p>
        </Card>
        <Card className="p-3 border border-card-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              <Users className="w-4 h-4" />
              לקוחות ({clients?.length ?? 0})
            </h3>
          </div>
          {clientsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-8 w-full rounded-md" />))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
              {(clients ?? []).map((c) => {
                const active = selectedId === c.id;
                const coach = coaches?.find((co) => co.id === (c as any).coachId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setLoc(`/financial-crm/${c.id}`)}
                    className={`text-right px-2.5 py-2 rounded-md text-xs border transition-colors ${
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover-elevate"
                    }`}
                    aria-pressed={active}
                    data-testid={`crm-client-${c.id}`}
                  >
                    <div className="font-semibold flex items-center justify-between gap-2">
                      <span className="truncate">{c.fullName}</span>
                      <ChevronLeft className="w-3 h-3 shrink-0" />
                    </div>
                    <div className={`text-[10px] mt-0.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {c.mode === "business" ? "עסק" : "משק בית"}{coach ? ` · מאמן: ${coach.fullName}` : ""}
                    </div>
                  </button>
                );
              })}
              {clients && clients.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">אין לקוחות עדיין.</p>
              )}
            </div>
          )}
        </Card>
      </aside>

      <main className="space-y-4">
        {!client ? (
          <Card className="p-10 text-center text-sm text-muted-foreground border border-dashed">
            בחרו לקוח מהרשימה כדי לפתוח את כרטיס ה-CRM שלו.
          </Card>
        ) : (
          <>
            <Card className="p-4 border border-card-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">כרטיס לקוח</p>
                  <h1 className="text-xl font-bold">{client.fullName}</h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    {client.mode === "business" ? "עסק" : "משק בית"}
                    {client.phone ? ` · ${client.phone}` : ""}
                    {client.email ? ` · ${client.email}` : ""}
                    {client.monthlyIncome ? ` · הכנסה ${client.monthlyIncome}₪/חודש` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-primary text-base">{tasks?.filter((t) => t.status !== "done" && t.status !== "cancelled").length ?? 0}</div>
                    <div className="text-muted-foreground">משימות פתוחות</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-primary text-base">{documents?.filter((d) => d.status === "pending").length ?? 0}</div>
                    <div className="text-muted-foreground">מסמכים חסרים</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-primary text-base">{reminders?.filter((r) => r.status === "pending").length ?? 0}</div>
                    <div className="text-muted-foreground">תזכורות</div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap gap-1.5 border-b">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 text-sm rounded-t-md border-b-2 transition-colors flex items-center gap-1.5 ${
                      active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover-elevate"
                    }`}
                    aria-pressed={active}
                    data-testid={`crm-tab-${t.key}`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* TASKS */}
            {tab === "tasks" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-tasks-panel">
                <h3 className="text-sm font-bold">משימה חדשה</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input placeholder="כותרת" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} data-testid="input-new-task-title" />
                  <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                </div>
                <Textarea placeholder="תיאור (אופציונלי)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} aria-label="תיאור המשימה" className="min-h-16" />
                <div className="grid md:grid-cols-2 gap-2">
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="low">עדיפות נמוכה</option>
                    <option value="normal">עדיפות רגילה</option>
                    <option value="high">עדיפות גבוהה</option>
                  </select>
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newTask.assigneeId} onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}>
                    <option value="">ללא משויך</option>
                    {(coaches ?? []).map((co) => (
                      <option key={co.id} value={co.id}>מאמן: {co.fullName}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => createTask.mutate()} disabled={!newTask.title || createTask.isPending} data-testid="button-create-task">
                  <Plus className="w-4 h-4 ml-1" />
                  הוספת משימה
                </Button>

                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-bold">משימות פעילות</h3>
                  {(tasks ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין משימות ללקוח זה.</p>
                  ) : (
                    (tasks ?? []).map((t) => (
                      <div key={t.id} className="rounded-md border p-3 flex items-start gap-3" data-testid={`task-row-${t.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                            {t.dueDate && <span>📅 {t.dueDate}</span>}
                            <span>עדיפות: {t.priority}</span>
                            <span>סטטוס: {t.status}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <select value={t.status} onChange={(e) => updateTaskStatus.mutate({ id: t.id, status: e.target.value })} className="text-xs rounded-md border border-input bg-background px-2 py-1">
                            <option value="open">פתוחה</option>
                            <option value="in_progress">בטיפול</option>
                            <option value="done">הושלמה</option>
                            <option value="cancelled">בוטלה</option>
                          </select>
                          <Button size="sm" variant="ghost" onClick={() => deleteTask.mutate(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* MESSAGES */}
            {tab === "messages" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-messages-panel">
                <h3 className="text-sm font-bold">הודעה חדשה</h3>
                <Textarea placeholder="גוף ההודעה" value={newMessage.body} onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })} aria-label="גוף ההודעה" className="min-h-20" data-testid="input-new-message-body" />
                <div className="grid md:grid-cols-2 gap-2">
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newMessage.senderRole} onChange={(e) => setNewMessage({ ...newMessage, senderRole: e.target.value })}>
                    <option value="admin">אדמין</option>
                    <option value="coach">מאמן</option>
                    <option value="client">לקוח</option>
                  </select>
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newMessage.channel} onChange={(e) => setNewMessage({ ...newMessage, channel: e.target.value })}>
                    <option value="app">בתוך האפליקציה</option>
                    <option value="email">מייל</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <Button onClick={() => createMessage.mutate()} disabled={!newMessage.body || createMessage.isPending} data-testid="button-create-message">
                  <Send className="w-4 h-4 ml-1" />
                  שליחה
                </Button>
                <div className="border-t pt-3 space-y-2 max-h-[480px] overflow-y-auto">
                  {(messages ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין הודעות.</p>
                  ) : (
                    (messages ?? []).map((m) => (
                      <div key={m.id} className="rounded-md border p-3" data-testid={`message-row-${m.id}`}>
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>{m.senderRole}{m.senderName ? ` · ${m.senderName}` : ""} · {m.channel}</span>
                          <span>{new Date(m.createdAt).toLocaleString("he-IL")}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{m.body}</p>
                        {!m.readAt && <span className="text-[10px] text-primary mt-1">לא נקרא</span>}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* DOCUMENTS */}
            {tab === "documents" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-documents-panel">
                <h3 className="text-sm font-bold">מסמך חדש</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input placeholder="כותרת" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} data-testid="input-new-doc-title" />
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newDoc.docType} onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value })}>
                    <option value="consent">הסכמה / הצהרה</option>
                    <option value="poa">ייפוי כוח</option>
                    <option value="id">תעודת זהות</option>
                    <option value="bank">פרטי בנק</option>
                    <option value="invoice">חשבונית</option>
                    <option value="report">דוח</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <Input placeholder="קישור URL (אופציונלי)" value={newDoc.url} onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })} />
                <Textarea placeholder="הערות" value={newDoc.notes} onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })} aria-label="הערות למסמך" className="min-h-14" />
                <Button onClick={() => createDoc.mutate()} disabled={!newDoc.title || createDoc.isPending}><Plus className="w-4 h-4 ml-1" /> הוספת מסמך</Button>

                <div className="border-t pt-3 space-y-2">
                  {(documents ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין מסמכים.</p>
                  ) : (
                    (documents ?? []).map((d) => (
                      <div key={d.id} className="rounded-md border p-3 flex items-start gap-3" data-testid={`doc-row-${d.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{d.title}</p>
                          <p className="text-[11px] text-muted-foreground">{d.docType}{d.url ? ` · ` : ""}{safeUrl(d.url) && <a href={safeUrl(d.url)} target="_blank" rel="noreferrer" className="underline text-primary">קישור</a>}</p>
                          {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <select value={d.status} onChange={(e) => updateDocStatus.mutate({ id: d.id, status: e.target.value })} className="text-xs rounded-md border border-input bg-background px-2 py-1">
                            <option value="pending">ממתין</option>
                            <option value="received">התקבל</option>
                            <option value="reviewed">נבדק</option>
                            <option value="rejected">נדחה</option>
                          </select>
                          <Button size="sm" variant="ghost" onClick={() => deleteDoc.mutate(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* REMINDERS */}
            {tab === "reminders" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-reminders-panel">
                <h3 className="text-sm font-bold">תזכורת חדשה</h3>
                <Input placeholder="כותרת" value={newReminder.title} onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })} />
                <Textarea placeholder="גוף (אופציונלי)" value={newReminder.body} onChange={(e) => setNewReminder({ ...newReminder, body: e.target.value })} aria-label="גוף התזכורת" className="min-h-14" />
                <div className="grid md:grid-cols-2 gap-2">
                  <Input type="datetime-local" value={newReminder.dueAt} onChange={(e) => setNewReminder({ ...newReminder, dueAt: e.target.value })} data-testid="input-new-reminder-dueat" />
                  <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={newReminder.channel} onChange={(e) => setNewReminder({ ...newReminder, channel: e.target.value })}>
                    <option value="internal">פנימי</option>
                    <option value="email">מייל</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <Button onClick={() => createReminder.mutate()} disabled={!newReminder.title || !newReminder.dueAt || createReminder.isPending}><Plus className="w-4 h-4 ml-1" /> הוספה</Button>
                <div className="border-t pt-3 space-y-2">
                  {(reminders ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין תזכורות.</p>
                  ) : (
                    (reminders ?? []).map((r) => (
                      <div key={r.id} className="rounded-md border p-3 flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground">{new Date(r.dueAt).toLocaleString("he-IL")} · {r.channel} · {r.status}</p>
                          {r.body && <p className="text-xs mt-1">{r.body}</p>}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteReminder.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* REPORTS */}
            {tab === "reports" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-reports-panel">
                <h3 className="text-sm font-bold">דוח חודשי חדש</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input placeholder="כותרת" value={newReport.title} onChange={(e) => setNewReport({ ...newReport, title: e.target.value })} />
                  <Input type="month" value={newReport.periodMonth} onChange={(e) => setNewReport({ ...newReport, periodMonth: e.target.value })} />
                </div>
                <Textarea placeholder="תקציר" value={newReport.summary} onChange={(e) => setNewReport({ ...newReport, summary: e.target.value })} aria-label="תקציר הדוח" className="min-h-20" />
                <Button onClick={() => createReport.mutate()} disabled={!newReport.title || !newReport.periodMonth || createReport.isPending}><Plus className="w-4 h-4 ml-1" /> יצירת דוח</Button>
                <div className="border-t pt-3 space-y-2">
                  {(reports ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין דוחות.</p>
                  ) : (
                    (reports ?? []).map((r) => (
                      <div key={r.id} className="rounded-md border p-3">
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground">{r.periodMonth} · {r.status}</p>
                        {r.summary && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.summary}</p>}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* GOALS */}
            {tab === "goals" && (
              <Card className="p-4 border border-card-border bg-card space-y-3" data-testid="crm-goals-panel">
                <h3 className="text-sm font-bold">מטרה חדשה</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input placeholder="כותרת" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} data-testid="input-new-goal-title" />
                  <Input type="number" placeholder="סכום יעד (₪)" value={newGoal.targetAmount} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })} />
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <Input type="date" value={newGoal.targetDate} onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })} />
                  <Input type="number" placeholder="הפקדה חודשית (₪, אופציונלי)" value={newGoal.monthlyContribution} onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: e.target.value })} />
                </div>
                <Button onClick={() => createGoal.mutate()} disabled={!newGoal.title || !newGoal.targetAmount || createGoal.isPending} data-testid="button-create-goal">
                  <Plus className="w-4 h-4 ml-1" />
                  הוספת מטרה
                </Button>

                <div className="border-t pt-3 space-y-2">
                  {(goals ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">אין מטרות ללקוח זה.</p>
                  ) : (
                    (goals ?? []).map((g) => (
                      <div key={g.id} className="rounded-md border p-3 flex items-start gap-3" data-testid={`goal-row-${g.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{g.title}</p>
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                            <span>{g.savedAmount}₪ / {g.targetAmount}₪</span>
                            {g.targetDate && <span>📅 {g.targetDate}</span>}
                            {g.monthlyContribution != null && <span>הפקדה: {g.monthlyContribution}₪/חודש</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <select value={g.status} onChange={(e) => updateGoalStatus.mutate({ id: g.id, status: e.target.value })} className="text-xs rounded-md border border-input bg-background px-2 py-1">
                            <option value="active">פעילה</option>
                            <option value="reached">הושגה</option>
                            <option value="paused">מושהית</option>
                          </select>
                          <Button size="sm" variant="ghost" onClick={() => deleteGoal.mutate(g.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* ACTIVITY */}
            {tab === "activity" && (
              <Card className="p-4 border border-card-border bg-card space-y-2" data-testid="crm-activity-panel">
                <h3 className="text-sm font-bold">טיימליין פעילות</h3>
                {(activity ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">אין רשומות פעילות.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                    {(activity ?? []).map((a) => (
                      <div key={a.id} className="text-xs flex items-start gap-2 border-b border-border/60 pb-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-24">{new Date(a.createdAt).toLocaleString("he-IL")}</span>
                        <span className="rounded bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 shrink-0">{a.kind}</span>
                        <span>{a.title}{a.actorRole ? ` · ${a.actorRole}` : ""}{a.detail ? ` — ${a.detail}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
