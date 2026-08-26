import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MATERIAL_CATEGORIES } from "@/types/questionnaire";

const STATUS_LABEL: Record<string, string> = { pending: "ממתין לאישור", approved: "מאושר", rejected: "נדחה" };
const STATUS_ICON: Record<string, typeof Clock> = { pending: Clock, approved: CheckCircle2, rejected: XCircle };

const emptyForm = { title: "", category: "", subcategory: "", description: "" };

function mediaKindFor(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "template";
}

export default function Materials() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["materials", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("materials").select("*").eq("tenant_id", tenant!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (!file) throw new Error("יש לבחור קובץ");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${tenant.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("materials-media").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("materials-media").getPublicUrl(path);
      const { error } = await supabase.from("materials").insert({
        tenant_id: tenant.id,
        owner_user_id: user?.id || null,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        subcategory: form.subcategory || null,
        media_kind: mediaKindFor(file),
        file_url: urlData.publicUrl,
        file_size: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הקובץ הועלה וממתין לאישור מנהל");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e: Error) => toast.error("שגיאה בהעלאה: " + e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">חומרי לימוד</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          העלאת חומר
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>העלאת חומר לימוד</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>קובץ *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label>כותרת *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="שם החומר"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>קטגוריה</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(MATERIAL_CATEGORIES).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תת־קטגוריה</Label>
                <Select
                  value={form.subcategory}
                  onValueChange={(v) => setForm({ ...form, subcategory: v })}
                  disabled={!form.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תת־קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {(MATERIAL_CATEGORIES[form.category] || []).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="תיאור קצר של החומר..."
              />
            </div>
            <Button
              className="w-full"
              onClick={() => upload.mutate()}
              disabled={upload.isPending || !form.title || !file}
            >
              {upload.isPending ? "מעלה..." : "העלה לאישור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((m: any) => {
          const Icon = STATUS_ICON[m.status] || Clock;
          return (
            <Card key={m.id}><CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-10 w-10 text-primary" />
                <Badge variant={m.status === "approved" ? "success" : m.status === "rejected" ? "destructive" : "outline"} className="text-xs flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {STATUS_LABEL[m.status] || m.status}
                </Badge>
              </div>
              <div className="font-medium mb-1">{m.title}</div>
              <div className="text-sm text-muted-foreground mb-3">{m.description}</div>
              {m.status === "rejected" && m.rejection_reason && (
                <div className="text-xs text-destructive mb-3">סיבת דחייה: {m.rejection_reason}</div>
              )}
              {m.file_url && <Button asChild size="sm" variant="outline"><a href={m.file_url} target="_blank" rel="noreferrer"><Download className="ml-2 h-4 w-4" /> הורד</a></Button>}
            </CardContent></Card>
          );
        })}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין חומרים עדיין</div>}
      </div>
    </div>
  );
}
