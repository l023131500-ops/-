import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  VAULT_TOPICS,
  vaultTopicLabel,
  personalAreasQuery,
  useInvalidatePersonalAreas,
  groupByTopic,
  normalizeUrl,
  type PersonalAreaRow,
} from "@/features/clients/vault";

type Props = {
  clientId: string;
  tenantId: string;
  /** staff = inside the CRM client file; client = the self-portal */
  mode: "staff" | "client";
  profileId?: string | null;
};

type FormState = {
  topic: string;
  label: string;
  url: string;
  username: string;
  password: string;
  notes: string;
};

const EMPTY_FORM: FormState = { topic: "", label: "", url: "", username: "", password: "", notes: "" };

async function copyToClipboard(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} הועתק`);
  } catch {
    toast.error("ההעתקה נכשלה");
  }
}

export function PersonalAreasPanel({ clientId, tenantId, mode, profileId }: Props) {
  const { data: rows, isLoading } = useQuery(personalAreasQuery(clientId));
  const invalidate = useInvalidatePersonalAreas(clientId);
  const groups = useMemo(() => groupByTopic(rows ?? []), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <p>
          {mode === "client"
            ? "כאן שומרים את כל האזורים האישיים שלכם — קופת חולים, ביטוח לאומי, בנק ועוד — עם פרטי הכניסה לכל אחד, כדי שתמיד תזכרו איפה ואיך נכנסים. הפרטים גלויים רק לכם ולצוות המשרד המטפל בכם; הם לעולם לא מועברים לשותפים חיצוניים ולא נכללים בדוח המודפס."
            : "האזורים האישיים ופרטי הכניסה של הלקוח לכל גוף. גלוי לצוות המשרד וללקוח בלבד — לא נחשף לשותפים (אין לטבלה מדיניות שותף) ולא נכלל בדוח הלקוח המודפס."}
        </p>
      </div>

      <AddAreaCard clientId={clientId} tenantId={tenantId} mode={mode} profileId={profileId} onSaved={invalidate} />

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            עדיין לא נשמרו אזורים אישיים — הוסיפו את הראשון למעלה.
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.topic}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                {vaultTopicLabel(g.topic)}
                <Badge variant="secondary" className="font-normal">{g.rows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {g.rows.map((r) => (
                <AreaRowView key={r.id} row={r} onChanged={invalidate} />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AddAreaCard({ clientId, tenantId, mode, profileId, onSaved }: Props & { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<FormState>(EMPTY_FORM);

  const add = useMutation({
    mutationFn: async () => {
      if (!f.topic) throw new Error("בחרו נושא");
      if (!f.label.trim()) throw new Error("הזינו שם לאזור האישי (למשל: אתר מכבי)");
      const { error } = await supabase.from("client_personal_areas").insert({
        tenant_id: tenantId,
        client_id: clientId,
        topic: f.topic,
        label: f.label.trim(),
        url: normalizeUrl(f.url),
        username: f.username.trim() || null,
        password: f.password || null,
        notes: f.notes.trim() || null,
        created_by: mode === "staff" ? (profileId ?? null) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("האזור האישי נשמר");
      setF(EMPTY_FORM);
      setOpen(false);
      onSaved();
    },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 ms-1" /> הוספת אזור אישי
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">אזור אישי חדש</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AreaFormFields f={f} setF={setF} />
        <div className="flex gap-2">
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Plus className="h-4 w-4 ms-1" />}
            שמירה
          </Button>
          <Button variant="ghost" onClick={() => { setOpen(false); setF(EMPTY_FORM); }}>ביטול</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AreaFormFields({ f, setF }: { f: FormState; setF: (v: FormState) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-sm">נושא</Label>
        <Select value={f.topic} onValueChange={(v) => setF({ ...f, topic: v })}>
          <SelectTrigger><SelectValue placeholder="בחרו נושא" /></SelectTrigger>
          <SelectContent>
            {Object.entries(VAULT_TOPICS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">שם האזור האישי</Label>
        <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="למשל: האזור האישי במכבי" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">כתובת האתר</Label>
        <Input dir="ltr" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="www.example.co.il" autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">שם משתמש / ת״ז לכניסה</Label>
        <Input dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">סיסמה</Label>
        <Input dir="ltr" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="off" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">הערות</Label>
        <Textarea rows={1} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="שאלת אבטחה, קוד לקוח, טלפון מוקד…" />
      </div>
    </div>
  );
}

function AreaRowView({ row, onChanged }: { row: PersonalAreaRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [f, setF] = useState<FormState>({
    topic: row.topic,
    label: row.label,
    url: row.url ?? "",
    username: row.username ?? "",
    password: row.password ?? "",
    notes: row.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!f.topic) throw new Error("בחרו נושא");
      if (!f.label.trim()) throw new Error("הזינו שם לאזור האישי");
      const { error } = await supabase
        .from("client_personal_areas")
        .update({
          topic: f.topic,
          label: f.label.trim(),
          url: normalizeUrl(f.url),
          username: f.username.trim() || null,
          password: f.password || null,
          notes: f.notes.trim() || null,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נשמר"); setEditing(false); onChanged(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_personal_areas").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("נמחק"); onChanged(); },
    onError: (e: Error) => toast.error("שגיאה", { description: e.message }),
  });

  if (editing) {
    return (
      <div className="rounded-lg border p-3 space-y-3 my-2">
        <AreaFormFields f={f} setF={setF} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Check className="h-4 w-4 ms-1" />}
            שמירה
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4 ms-1" /> ביטול</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b last:border-0 py-2.5">
      <div className="min-w-0 flex-1 basis-48">
        <div className="text-sm font-medium truncate">{row.label}</div>
        {row.notes && <div className="text-xs text-muted-foreground truncate">{row.notes}</div>}
      </div>

      {row.url && (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          dir="ltr"
        >
          <ExternalLink className="h-3.5 w-3.5" /> כניסה לאתר
        </a>
      )}

      {row.username && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span dir="ltr" className="font-mono">{row.username}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="העתקת שם משתמש"
            onClick={() => copyToClipboard(row.username!, "שם המשתמש")}>
            <Copy className="h-3 w-3" />
          </Button>
        </span>
      )}

      {row.password && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span dir="ltr" className="font-mono">{reveal ? row.password : "••••••••"}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={reveal ? "הסתרת סיסמה" : "הצגת סיסמה"}
            onClick={() => setReveal((v) => !v)}>
            {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="העתקת סיסמה"
            onClick={() => copyToClipboard(row.password!, "הסיסמה")}>
            <Copy className="h-3 w-3" />
          </Button>
        </span>
      )}

      <span className="inline-flex items-center">
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="עריכה" onClick={() => {
          setF({
            topic: row.topic,
            label: row.label,
            url: row.url ?? "",
            username: row.username ?? "",
            password: row.password ?? "",
            notes: row.notes ?? "",
          });
          setEditing(true);
        }}>
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="מחיקה" onClick={() => del.mutate()} disabled={del.isPending}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </span>
    </div>
  );
}
