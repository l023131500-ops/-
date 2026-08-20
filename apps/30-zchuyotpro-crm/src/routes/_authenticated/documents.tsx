import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload, Download, Trash2, FileText, Image as ImageIcon, FileSpreadsheet,
  FileAudio, File as FileIcon, Loader2, PenLine, Sparkles, Eye, CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meProfileQuery } from "@/features/clients/queries";
import { formatDateHe } from "@/lib/format";
import { triggerN8nWebhook } from "@/lib/n8n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "מסמכים | זכויות פרו" }] }),
  component: Page,
});

type DocRow = {
  id: string; tenant_id: string; client_id: string | null;
  file_name: string; file_type: string | null; storage_path: string;
  file_size_bytes: number | null; processing_status: string;
  analysis_result: unknown; requires_signature: boolean;
  signature_status: string | null; signed_at: string | null;
  created_at: string;
};

const FILE_TAGS = {
  pay_stub: "תלוש שכר",
  id_card: "תעודת זהות",
  contract: "חוזה",
  medical: "מסמך רפואי",
  bank: "דף חשבון",
  other: "אחר",
} as const;

function iconForMime(mime: string | null, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return { Icon: ImageIcon, color: "text-purple-600 bg-purple-100 dark:bg-purple-950" };
  if (mime?.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(ext)) return { Icon: FileAudio, color: "text-orange-600 bg-orange-100 dark:bg-orange-950" };
  if (ext === "pdf" || mime === "application/pdf") return { Icon: FileText, color: "text-red-600 bg-red-100 dark:bg-red-950" };
  if (["xls", "xlsx", "csv"].includes(ext)) return { Icon: FileSpreadsheet, color: "text-green-600 bg-green-100 dark:bg-green-950" };
  if (["doc", "docx"].includes(ext)) return { Icon: FileText, color: "text-blue-600 bg-blue-100 dark:bg-blue-950" };
  return { Icon: FileIcon, color: "text-muted-foreground bg-muted" };
}

function sigBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
    pending: { label: "ממתין לחתימה", cls: "bg-yellow-100 text-yellow-900", Icon: Clock },
    signed: { label: "נחתם", cls: "bg-green-100 text-green-900", Icon: CheckCircle2 },
    declined: { label: "נדחה", cls: "bg-red-100 text-red-900", Icon: XCircle },
    rejected: { label: "נדחה", cls: "bg-red-100 text-red-900", Icon: XCircle },
  };
  const v = map[status];
  if (!v) return null;
  return <Badge className={cn("border-0 gap-1", v.cls)} variant="secondary"><v.Icon className="h-3 w-3" />{v.label}</Badge>;
}

function processingBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "ממתין", cls: "bg-muted text-muted-foreground" },
    processing: { label: "בעיבוד", cls: "bg-blue-100 text-blue-900" },
    completed: { label: "הושלם", cls: "bg-green-100 text-green-900" },
    failed: { label: "נכשל", cls: "bg-red-100 text-red-900" },
  };
  const v = map[status] ?? map.pending;
  return <Badge variant="secondary" className={cn("border-0", v.cls)}>{v.label}</Badge>;
}

function Page() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meProfileQuery());

  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sigFilter, setSigFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Upload dialog state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingClient, setPendingClient] = useState<string>("none");
  const [pendingTag, setPendingTag] = useState<string>("other");
  const [pendingSig, setPendingSig] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [analysisDoc, setAnalysisDoc] = useState<DocRow | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["doc-center-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, first_name, last_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()])), [clients]);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["doc-center"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const filtered = useMemo(() => docs.filter((d) => {
    if (clientFilter !== "all" && d.client_id !== clientFilter) return false;
    if (typeFilter !== "all" && d.file_type !== typeFilter) return false;
    if (sigFilter === "yes" && !d.requires_signature) return false;
    if (sigFilter === "no" && d.requires_signature) return false;
    if (search && !d.file_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [docs, clientFilter, typeFilter, sigFilter, search]);

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setPendingFile(list[0]);
    setPendingClient("none");
    setPendingTag("other");
    setPendingSig(false);
  }

  const doUpload = useMutation({
    mutationFn: async () => {
      if (!pendingFile || !me) throw new Error("חסר קובץ");
      setUploading(true);
      const cid = pendingClient !== "none" ? pendingClient : null;
      const folder = cid ?? "unassigned";
      const path = `${me.tenant_id}/${folder}/${crypto.randomUUID()}-${pendingFile.name}`;
      const { error: upErr } = await supabase.storage.from("client-documents").upload(path, pendingFile);
      if (upErr) throw upErr;
      const { data: doc, error } = await supabase.from("documents").insert({
        tenant_id: me.tenant_id,
        client_id: cid,
        file_name: pendingFile.name,
        file_type: pendingTag,
        file_size_bytes: pendingFile.size,
        storage_path: path,
        uploaded_by: me.id,
        requires_signature: pendingSig,
        signature_status: pendingSig ? "pending" : null,
      }).select("*").single();
      if (error) throw error;
      const inserted = doc as DocRow;
      if (inserted.file_type === "pay_stub" && inserted.client_id) {
        void triggerN8nWebhook("analyze-document", {
          documentId: inserted.id,
          clientId: inserted.client_id,
          storagePath: inserted.storage_path,
          tenantId: inserted.tenant_id,
        });
      }
      return inserted;
    },
    onSuccess: () => { toast.success("הקובץ הועלה"); setPendingFile(null); qc.invalidateQueries({ queryKey: ["doc-center"] }); },
    onError: (e: Error) => toast.error("שגיאת העלאה", { description: e.message }),
    onSettled: () => setUploading(false),
  });

  const del = useMutation({
    mutationFn: async (d: DocRow) => {
      await supabase.storage.from("client-documents").remove([d.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); qc.invalidateQueries({ queryKey: ["doc-center"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function preview(d: DocRow) {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  async function download(d: DocRow) {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = d.file_name;
    a.click();
  }

  const sendForSignature = useMutation({
    mutationFn: async (d: DocRow) => {
      const r = await fetch("/api/public/notify-signature", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: d.id }),
      });
      if (!r.ok) throw new Error("נכשל שליחת בקשת חתימה");
    },
    onSuccess: () => { toast.success("נשלח לחתימה"); qc.invalidateQueries({ queryKey: ["doc-center"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const analyze = useMutation({
    mutationFn: async (d: DocRow) => {
      const r = await fetch("/api/public/analyze-paystub", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: d.id }),
      });
      const out = (await r.json().catch(() => null)) as { ok: boolean; dispatched: boolean; error?: string } | null;
      if (!r.ok) throw new Error(out?.error || "נכשל ניתוח");
      return out!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-center"] });
      toast.info("הניתוח נשלח, התוצאות יעודכנו כשיתקבלו");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">מסמכים</h2>
        <p className="text-muted-foreground text-sm mt-1">מרכז ניהול מסמכים לכל הלקוחות</p>
      </div>

      <Card
        className={cn("border-2 border-dashed transition-colors", dragOver ? "border-primary bg-primary/5" : "border-border")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <CardContent className="p-8 text-center space-y-2">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <div className="text-sm">גרור קובץ לכאן או</div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>בחר קובץ</Button>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap items-center">
        <Input className="w-48" placeholder="חיפוש שם קובץ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{clientMap.get(c.id)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(FILE_TAGS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sigFilter} onValueChange={setSigFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="yes">דורש חתימה</SelectItem>
            <SelectItem value="no">ללא חתימה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading && <div className="col-span-full text-center py-12"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}
        {!isLoading && filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">אין מסמכים</div>}
        {filtered.map((d) => {
          const { Icon, color } = iconForMime(d.file_type, d.file_name);
          return (
            <Card key={d.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.file_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.client_id ? clientMap.get(d.client_id) ?? "—" : "לא משויך"}</div>
                    <div className="text-xs text-muted-foreground">{formatDateHe(d.created_at)} · {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(0)} KB` : "—"}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {d.file_type && (FILE_TAGS as Record<string, string>)[d.file_type] && (
                    <Badge variant="outline">{(FILE_TAGS as Record<string, string>)[d.file_type]}</Badge>
                  )}
                  {processingBadge(d.processing_status)}
                  {d.requires_signature && sigBadge(d.signature_status)}
                </div>
                <div className="flex gap-1 justify-end pt-1 flex-wrap">
                  {d.file_type === "pay_stub" && d.client_id && (
                    <Button size="sm" variant="outline" onClick={() => analyze.mutate(d)} disabled={analyze.isPending}>
                      <Sparkles className="h-3.5 w-3.5 ms-1" />נתח תלוש שכר
                    </Button>
                  )}
                  {d.requires_signature && d.signature_status !== "signed" && (
                    <Button size="sm" variant="outline" onClick={() => sendForSignature.mutate(d)} disabled={sendForSignature.isPending}>
                      <PenLine className="h-3.5 w-3.5 ms-1" />שלח לחתימה
                    </Button>
                  )}
                  {!!d.analysis_result && (
                    <Button size="sm" variant="ghost" onClick={() => setAnalysisDoc(d)}><Sparkles className="h-3.5 w-3.5 ms-1" />תוצאות</Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => preview(d)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`למחוק את ${d.file_name}?`)) del.mutate(d); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload meta dialog */}
      <Dialog open={!!pendingFile} onOpenChange={(o) => !o && !uploading && setPendingFile(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>העלאת קובץ</DialogTitle></DialogHeader>
          {pendingFile && (
            <div className="space-y-3">
              <div className="text-sm bg-muted rounded p-2"><FileText className="h-4 w-4 inline ms-2" />{pendingFile.name}</div>
              <div className="space-y-1.5">
                <Label>שייך ללקוח</Label>
                <Select value={pendingClient} onValueChange={setPendingClient}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא שיוך</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{clientMap.get(c.id)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>סוג מסמך</Label>
                <Select value={pendingTag} onValueChange={setPendingTag}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FILE_TAGS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pendingSig} onCheckedChange={setPendingSig} />
                <Label>דורש חתימה</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingFile(null)} disabled={uploading}>ביטול</Button>
            <Button onClick={() => doUpload.mutate()} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin ms-2" />}העלה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analysis results dialog */}
      <Dialog open={!!analysisDoc} onOpenChange={(o) => !o && setAnalysisDoc(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>תוצאות ניתוח – {analysisDoc?.file_name}</DialogTitle></DialogHeader>
          {analysisDoc?.analysis_result ? (
            <AnalysisView doc={analysisDoc} onApply={() => { setAnalysisDoc(null); qc.invalidateQueries({ queryKey: ["doc-center"] }); }} />
          ) : <div className="text-sm text-muted-foreground">אין נתונים עדיין</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalysisView({ doc, onApply }: { doc: DocRow; onApply: () => void }) {
  const r = doc.analysis_result as Record<string, unknown>;
  const gross = Number(r.gross_salary ?? 0);
  const net = Number(r.net_salary ?? 0);
  const employer = String(r.employer ?? "—");
  const deductions = r.deductions as Record<string, number> | undefined;
  // Rows written by the old no-webhook fallback carry mock:true. The numbers in them were never
  // extracted from anything, so they must not reach client_financial_profile.
  const isMock = !!(r.mock as boolean);
  const [busy, setBusy] = useState(false);

  async function applyToProfile() {
    if (isMock) { toast.error("נתוני דמו — לא ניתן לעדכן מהם פרופיל לקוח"); return; }
    if (!doc.client_id) { toast.error("המסמך לא משויך ללקוח"); return; }
    if (!confirm("לעדכן את פרופיל הלקוח עם הנתונים שחולצו?")) return;
    setBusy(true);
    try {
      const { data: existing } = await supabase.from("client_financial_profile").select("id, tenant_id").eq("client_id", doc.client_id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("client_financial_profile").update({ gross_monthly_income: gross, net_monthly_income: net, employer_name: employer }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_financial_profile").insert({ client_id: doc.client_id, tenant_id: doc.tenant_id, gross_monthly_income: gross, net_monthly_income: net, employer_name: employer });
        if (error) throw error;
      }
      toast.success("פרופיל הלקוח עודכן");
      onApply();
    } catch (e) {
      toast.error("שגיאה", { description: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="ברוטו" value={`₪${gross.toLocaleString("he-IL")}`} />
        <Stat label="נטו" value={`₪${net.toLocaleString("he-IL")}`} />
        <Stat label="מעסיק" value={employer} />
        <Stat label="תקופה" value={String(r.period ?? "—")} />
      </div>
      {deductions && (
        <div>
          <div className="font-medium mb-1">ניכויים</div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(deductions).map(([k, v]) => <Stat key={k} label={k} value={`₪${Number(v).toLocaleString("he-IL")}`} />)}
          </div>
        </div>
      )}
      {isMock && <div className="text-xs text-destructive">נתוני דמו — המספרים כאן לא חולצו מהמסמך ואינם ניתנים להחלה על פרופיל הלקוח</div>}
      <DialogFooter>
        <Button onClick={applyToProfile} disabled={busy || !doc.client_id || isMock}>
          {busy && <Loader2 className="h-4 w-4 animate-spin ms-2" />}החל על פרופיל הלקוח
        </Button>
      </DialogFooter>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
