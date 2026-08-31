import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Download, Trash2, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// newsletters: title/issue_number/publish_date + pdf_url/cover_image_url +
// is_published (architecture.md §5.2 "מודעות לציבור + ניוזלטר (העלאת PDF)").
// The table + `newsletters` storage bucket + RLS existed live since
// 20260519000002/0004 but no React screen anywhere ever referenced the
// table — council/synagogue admins had no way to publish an issue.

const emptyForm = { title: "", issue_number: "", publish_date: "" };

export default function PortalNewsletters() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["portal-newsletters", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("newsletters")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("issue_number", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setPdfFile(null);
    setCoverFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (coverInputRef.current) coverInputRef.current.value = "";
    setOpen(true);
  };

  const uploadTo = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${tenant!.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (!pdfFile) throw new Error("יש לבחור קובץ PDF");
      const pdf_url = await uploadTo("newsletters", pdfFile);
      const cover_image_url = coverFile ? await uploadTo("newsletters", coverFile) : null;
      const { error } = await supabase.from("newsletters").insert({
        tenant_id: tenant.id,
        title: form.title,
        issue_number: form.issue_number ? parseInt(form.issue_number, 10) : null,
        publish_date: form.publish_date || null,
        pdf_url,
        cover_image_url,
        is_published: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הגיליון הועלה (טרם פורסם)");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-newsletters"] });
    },
    onError: (e: Error) => toast.error("שגיאה בהעלאה: " + e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("newsletters")
        .update({ is_published: !row.is_published })
        .eq("id", row.id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: (_d, row: any) => {
      toast.success(row.is_published ? "הגיליון הוסר מהפרסום" : "הגיליון פורסם");
      qc.invalidateQueries({ queryKey: ["portal-newsletters"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("newsletters").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-newsletters"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">ניוזלטר / עלון</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          גיליון חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>העלאת גיליון חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="עלון שבת פרשת..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>מספר גיליון</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.issue_number}
                  onChange={(e) => setForm({ ...form, issue_number: e.target.value })}
                />
              </div>
              <div>
                <Label>תאריך פרסום</Label>
                <Input
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>קובץ PDF *</Label>
              <Input ref={pdfInputRef} type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>תמונת שער (אופציונלי)</Label>
              <Input ref={coverInputRef} type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </div>
            <Button
              className="w-full"
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.title || !pdfFile}
            >
              {create.isPending ? "מעלה..." : "העלה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת גיליון</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק גיליון זה?</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" className="flex-1" onClick={() => deleteId && del.mutate(deleteId)} disabled={del.isPending}>
              מחק
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data || []).map((n: any) => (
          <Card key={n.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                {n.cover_image_url ? (
                  <img src={n.cover_image_url} alt={n.title} className="h-16 w-12 object-cover rounded" />
                ) : (
                  <div className="h-16 w-12 rounded bg-muted flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <Badge variant={n.is_published ? "success" : "outline"} className="text-xs">
                  {n.is_published ? "מפורסם" : "טיוטה"}
                </Badge>
              </div>
              <div className="font-medium mb-1">{n.title}</div>
              <div className="text-sm text-muted-foreground mb-3">
                {n.issue_number != null ? `גיליון ${n.issue_number}` : ""}
                {n.issue_number != null && n.publish_date ? " · " : ""}
                {n.publish_date || ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={n.pdf_url} target="_blank" rel="noreferrer">
                    <Download className="ml-2 h-4 w-4" /> הצג PDF
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(n)} disabled={togglePublish.isPending}>
                  {n.is_published ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
                  {n.is_published ? "בטל פרסום" : "פרסם"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(n.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && (
          <div className="text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> אין גיליונות עדיין
          </div>
        )}
      </div>
    </div>
  );
}
