import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MATERIAL_CATEGORIES } from "@/types/questionnaire";

const MEDIA_KINDS: Record<string, string> = {
  document: "מסמך / PDF",
  audio: "קובץ שמע",
  video: "קובץ וידאו",
  image: "תמונה",
};

const emptyForm = { title: "", description: "", category: "", subcategory: "", media_kind: "document" };

export default function Materials() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["materials", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFile(null);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !user?.id) throw new Error("חסר טננט או משתמש");
      if (!file) throw new Error("יש לבחור קובץ");

      const ext = file.name.split(".").pop();
      const path = `${tenant.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("materials-media").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("materials-media").getPublicUrl(path);

      const { error } = await supabase.from("materials").insert({
        tenant_id: tenant.id,
        owner_user_id: user.id,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        subcategory: form.subcategory || null,
        media_kind: form.media_kind,
        file_url: pub.publicUrl,
        file_size: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("החומר הועלה וממתין לאישור להצגה ציבורית");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["materials", tenant?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> מאושר</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> נדחה</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> ממתין לאישור</Badge>;
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">חומרי לימוד</h1>
        <Button onClick={openCreate} disabled={!tenant?.id}>
          <Plus className="ml-2 h-4 w-4" /> חומר חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>העלאת חומר לימוד</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="שם החומר" />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>קטגוריה</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}>
                  <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(MATERIAL_CATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תת־קטגוריה</Label>
                <Select value={form.subcategory} onValueChange={(v) => setForm({ ...form, subcategory: v })} disabled={!form.category}>
                  <SelectTrigger><SelectValue placeholder="בחר תת־קטגוריה" /></SelectTrigger>
                  <SelectContent>
                    {(MATERIAL_CATEGORIES[form.category] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>סוג קובץ</Label>
              <Select value={form.media_kind} onValueChange={(v) => setForm({ ...form, media_kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIA_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>קובץ *</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.title || !file}>
              {save.isPending ? "מעלה..." : "העלה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((m: any) => (
          <Card key={m.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-10 w-10 text-primary" />
                {statusBadge(m.status)}
              </div>
              <div className="font-medium mb-1">{m.title}</div>
              {m.category && (
                <Badge variant="outline" className="text-xs mb-2">
                  {m.category}{m.subcategory ? ` / ${m.subcategory}` : ""}
                </Badge>
              )}
              <div className="text-sm text-muted-foreground mb-3">{m.description}</div>
              <div className="flex items-center gap-2">
                {m.file_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={m.file_url} target="_blank" rel="noreferrer"><Download className="ml-2 h-4 w-4" /> הורד</a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (data?.length || 0) === 0 && <div className="text-muted-foreground">אין חומרים עדיין</div>}
      </div>
    </div>
  );
}
