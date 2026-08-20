import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listTopics, upsertTopic, deleteTopic, type Topic,
} from "@/lib/topics.functions";
import {
  listCategories, upsertCategory, deleteCategory, type Category, type CategoryType,
} from "@/lib/categories.functions";
import {
  listProfessionals, upsertProfessional, deleteProfessional, type Professional,
} from "@/lib/professionals.functions";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentManagerPage,
});

function ContentManagerPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">ניהול תוכן ונושאים</h1>
        <p className="text-muted-foreground mt-1">
          ארגון נושאים ואנשי מקצוע לפי קטגוריות. הנתונים מועברים ל-n8n דרך תור השליחה.
        </p>
      </div>

      <Tabs defaultValue="topics" dir="rtl">
        <TabsList>
          <TabsTrigger value="topics">נושאים</TabsTrigger>
          <TabsTrigger value="professionals">אנשי מקצוע</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="mt-4">
          <TopicsTab />
        </TabsContent>
        <TabsContent value="professionals" className="mt-4">
          <ProfessionalsTab />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Categories ----------

function CategoriesTab() {
  const qc = useQueryClient();
  const list = useServerFn(listCategories);
  const up = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const q = useQuery({ queryKey: ["categories"], queryFn: () => list() });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ id?: string; name: string; type: CategoryType }>({
    name: "", type: "topic",
  });

  const save = useMutation({
    mutationFn: (d: typeof draft) => up({ data: d }),
    onSuccess: () => {
      toast.success("נשמר");
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>קטגוריות</CardTitle>
          <CardDescription>קטגוריות לסיווג נושאים ואנשי מקצוע.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setDraft({ name: "", type: "topic" }); setOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" /> חדש
        </Button>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <Skeleton className="h-32 w-full" /> : (q.data ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין קטגוריות.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">סוג</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(q.data ?? []).map((c: Category) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={c.type === "topic" ? "default" : "outline"}>
                      {c.type === "topic" ? "נושא" : "איש מקצוע"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => { setDraft({ id: c.id, name: c.name, type: c.type }); setOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => { if (confirm(`למחוק "${c.name}"?`)) remove.mutate(c.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "עריכת קטגוריה" : "קטגוריה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>סוג</Label>
              <Select value={draft.type} onValueChange={(v: CategoryType) => setDraft({ ...draft, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topic">נושא</SelectItem>
                  <SelectItem value="professional">איש מקצוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}><X className="ml-2 h-4 w-4" />ביטול</Button>
            <Button onClick={() => save.mutate(draft)} disabled={!draft.name || save.isPending}>
              <Save className="ml-2 h-4 w-4" />שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Topics ----------

type TopicDraft = {
  id?: string;
  name: string;
  client_subject: string;
  client_html_body: string;
  notify_partner: boolean;
  category_id: string | null;
  response_template_html: string;
};
const emptyTopic = (): TopicDraft => ({
  name: "", client_subject: "", client_html_body: "",
  notify_partner: false, category_id: null, response_template_html: "",
});

function TopicsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listTopics);
  const listCats = useServerFn(listCategories);
  const up = useServerFn(upsertTopic);
  const del = useServerFn(deleteTopic);
  const q = useQuery({ queryKey: ["topics"], queryFn: () => list() });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TopicDraft>(emptyTopic());

  const topicCats = useMemo(
    () => (cats.data ?? []).filter((c) => c.type === "topic"),
    [cats.data]
  );

  const grouped = useMemo(() => {
    const g = new Map<string, Topic[]>();
    for (const t of q.data ?? []) {
      const k = t.category_name ?? "ללא קטגוריה";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(t);
    }
    return Array.from(g.entries());
  }, [q.data]);

  const save = useMutation({
    mutationFn: (d: TopicDraft) => up({
      data: {
        id: d.id, name: d.name, client_subject: d.client_subject,
        client_html_body: d.client_html_body, notify_partner: d.notify_partner,
        category_id: d.category_id, response_template_html: d.response_template_html || null,
      },
    }),
    onSuccess: () => {
      toast.success("נשמר");
      qc.invalidateQueries({ queryKey: ["topics"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>נושאים</CardTitle>
          <CardDescription>תבניות נושאים, מקובצות לפי קטגוריה. כולל תבנית תגובה ללקוח.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setDraft(emptyTopic()); setOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />נושא חדש
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {q.isLoading ? <Skeleton className="h-48 w-full" /> : grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין נושאים.</p>
        ) : grouped.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{cat}</h4>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">נושא ההודעה</TableHead>
                  <TableHead className="text-right">יידוע שותף</TableHead>
                  <TableHead className="text-right">תבנית תגובה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.client_subject}</TableCell>
                    <TableCell>{t.notify_partner ? <Badge>פעיל</Badge> : <Badge variant="outline">כבוי</Badge>}</TableCell>
                    <TableCell>{t.response_template_html ? <Badge>מוגדר</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setDraft({
                            id: t.id, name: t.name, client_subject: t.client_subject,
                            client_html_body: t.client_html_body, notify_partner: t.notify_partner,
                            category_id: t.category_id, response_template_html: t.response_template_html ?? "",
                          });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { if (confirm(`למחוק "${t.name}"?`)) remove.mutate(t.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "עריכת נושא" : "נושא חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם הנושא</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={draft.category_id ?? "__none"}
                onValueChange={(v) => setDraft({ ...draft, category_id: v === "__none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">ללא</SelectItem>
                  {topicCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>נושא ההודעה ללקוח</Label>
              <Input value={draft.client_subject}
                onChange={(e) => setDraft({ ...draft, client_subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>גוף ההודעה (HTML)</Label>
              <Textarea rows={8} dir="auto" className="font-mono text-xs"
                value={draft.client_html_body}
                onChange={(e) => setDraft({ ...draft, client_html_body: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>תבנית תגובה ללקוח (HTML, אופציונלי)</Label>
              <Textarea rows={6} dir="auto" className="font-mono text-xs"
                placeholder="תבנית שתישלח כ-template_body ל-n8n"
                value={draft.response_template_html}
                onChange={(e) => setDraft({ ...draft, response_template_html: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>שליחת יידוע לשותף המוקצה</Label>
                <p className="text-xs text-muted-foreground">דגל המועבר ל-n8n.</p>
              </div>
              <Switch checked={draft.notify_partner}
                onCheckedChange={(v) => setDraft({ ...draft, notify_partner: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}><X className="ml-2 h-4 w-4" />ביטול</Button>
            <Button onClick={() => save.mutate(draft)}
              disabled={save.isPending || !draft.name || !draft.client_subject || !draft.client_html_body}>
              <Save className="ml-2 h-4 w-4" />שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Professionals ----------

type ProDraft = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  category_id: string | null;
};
const emptyPro = (): ProDraft => ({ name: "", email: "", phone: "", notes: "", category_id: null });

function ProfessionalsTab() {
  const qc = useQueryClient();
  const list = useServerFn(listProfessionals);
  const listCats = useServerFn(listCategories);
  const up = useServerFn(upsertProfessional);
  const del = useServerFn(deleteProfessional);
  const q = useQuery({ queryKey: ["professionals"], queryFn: () => list() });
  const cats = useQuery({ queryKey: ["categories"], queryFn: () => listCats() });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProDraft>(emptyPro());

  const proCats = useMemo(
    () => (cats.data ?? []).filter((c) => c.type === "professional"),
    [cats.data]
  );
  const grouped = useMemo(() => {
    const g = new Map<string, Professional[]>();
    for (const p of q.data ?? []) {
      const k = p.category_name ?? "ללא קטגוריה";
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(p);
    }
    return Array.from(g.entries());
  }, [q.data]);

  const save = useMutation({
    mutationFn: (d: ProDraft) => up({
      data: {
        id: d.id, name: d.name,
        email: d.email ? d.email : null,
        contact_info: { phone: d.phone || undefined, notes: d.notes || undefined },
        category_id: d.category_id,
      },
    }),
    onSuccess: () => {
      toast.success("נשמר");
      qc.invalidateQueries({ queryKey: ["professionals"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("נמחק");
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "שגיאה"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>אנשי מקצוע</CardTitle>
          <CardDescription>אנשי קשר מקצועיים, מקובצים לפי קטגוריה.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setDraft(emptyPro()); setOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" />חדש
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {q.isLoading ? <Skeleton className="h-48 w-full" /> : grouped.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">אין אנשי מקצוע.</p>
        ) : grouped.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">{cat}</h4>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" dir="ltr">{(p.contact_info as any)?.phone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setDraft({
                            id: p.id, name: p.name, email: p.email ?? "",
                            phone: (p.contact_info as any)?.phone ?? "",
                            notes: (p.contact_info as any)?.notes ?? "",
                            category_id: p.category_id,
                          });
                          setOpen(true);
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => { if (confirm(`למחוק "${p.name}"?`)) remove.mutate(p.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "עריכת איש מקצוע" : "איש מקצוע חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={draft.category_id ?? "__none"}
                onValueChange={(v) => setDraft({ ...draft, category_id: v === "__none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">ללא</SelectItem>
                  {proCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input type="email" value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>טלפון</Label>
                <Input value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>הערות / פרטי קשר נוספים</Label>
              <Textarea rows={3} value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}><X className="ml-2 h-4 w-4" />ביטול</Button>
            <Button onClick={() => save.mutate(draft)} disabled={!draft.name || save.isPending}>
              <Save className="ml-2 h-4 w-4" />שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
