import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Heart, Image as ImageIcon, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { formatILS } from "@/lib/utils";

// donation_campaigns: title/slug (required) + description/hero_image_url/goal_ils/
// raised_ils/is_active/starts_at/ends_at. RLS (campaigns_write_ins/upd/del, keyed to
// has_tenant_role(tenant_admin)) has existed since the table was created, and
// public/DonationPage.tsx already reads it by slug and renders a title/description/
// progress bar for /donate/:campaignSlug -- but no screen anywhere ever let a tenant
// admin create that row, so a named campaign (as opposed to the generic tenant-wide
// /donate page) could never actually exist. build_tasks#48.

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  goal_ils: "",
  hero_image_url: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function slugify(v: string) {
  return v
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export default function Campaigns() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["portal-campaigns", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("donation_campaigns")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setHeroFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      title: c.title || "",
      slug: c.slug || "",
      description: c.description || "",
      goal_ils: c.goal_ils != null ? String(c.goal_ils) : "",
      hero_image_url: c.hero_image_url || "",
      is_active: c.is_active !== false,
      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 10) : "",
    });
    setSlugTouched(true);
    setHeroFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      let hero_image_url = form.hero_image_url || null;
      if (heroFile) {
        const ext = heroFile.name.split(".").pop() || "jpg";
        const path = `campaigns/${tenant.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("portal-assets").upload(path, heroFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("portal-assets").getPublicUrl(path);
        hero_image_url = urlData.publicUrl;
      }
      const payload = {
        title: form.title,
        slug: slugify(form.slug || form.title),
        description: form.description || null,
        goal_ils: form.goal_ils ? parseFloat(form.goal_ils) : null,
        hero_image_url,
        is_active: form.is_active,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      if (!payload.slug) throw new Error("יש להזין כתובת (slug) תקינה");
      if (editId) {
        const { error } = await supabase.from("donation_campaigns").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("donation_campaigns").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "הקמפיין עודכן" : "הקמפיין נוצר");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donation_campaigns").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("הקמפיין נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/donate/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("הקישור הועתק");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">קמפיינים לתרומה</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          קמפיין חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת קמפיין" : "קמפיין חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת הקמפיין *</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                }}
                placeholder="לדוגמה: מבצע חנוכה לתלמידי הכולל"
              />
            </div>
            <div>
              <Label>כתובת קישור (slug) *</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">/donate/</span>
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  placeholder="chanukah-2026"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>יעד גיוס (ש״ח)</Label>
              <Input type="number" min="0" value={form.goal_ils} onChange={(e) => setForm({ ...form, goal_ils: e.target.value })} placeholder="לדוגמה: 50000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך התחלה</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>תאריך סיום</Label>
                <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>תמונת רקע (Hero)</Label>
              <Input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
              {form.hero_image_url && !heroFile && (
                <img src={form.hero_image_url} alt="" className="mt-2 h-24 w-full object-cover rounded-md" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>קמפיין פעיל (מוצג לציבור)</Label>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.title || !form.slug}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת קמפיין</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק קמפיין זה? התרומות שכבר נגבו יישארו רשומות בדוח התרומות.</p>
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

      <div className="grid sm:grid-cols-2 gap-4">
        {(data || []).map((c: any) => {
          const pct = c.goal_ils ? Math.min(100, ((c.raised_ils || 0) / c.goal_ils) * 100) : null;
          return (
            <Card key={c.id} className="overflow-hidden">
              {c.hero_image_url ? (
                <img src={c.hero_image_url} alt={c.title} className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 w-full bg-muted flex items-center justify-center">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">/donate/{c.slug}</div>
                  </div>
                  <Badge variant={c.is_active ? "success" : "outline"}>{c.is_active ? "פעיל" : "מושבת"}</Badge>
                </div>
                {pct !== null && (
                  <div>
                    <div className="flex justify-between mb-1 text-xs text-muted-foreground">
                      <span>גויס: {formatILS(c.raised_ils || 0)}</span>
                      <span>יעד: {formatILS(c.goal_ils)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {c.goal_ils == null && (
                  <div className="text-xs text-muted-foreground">גויס עד כה: {formatILS(c.raised_ils || 0)}</div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => copyLink(c.slug)}>
                    <Copy className="ml-1 h-3.5 w-3.5" /> העתק קישור
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/donate/${c.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="ml-1 h-3.5 w-3.5" /> צפייה
                    </a>
                  </Button>
                  <div className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {(data?.length || 0) === 0 && (
        <div className="text-muted-foreground text-center py-16 flex flex-col items-center gap-2">
          <ImageIcon className="h-8 w-8" />
          עדיין אין קמפיינים. צור קמפיין ראשון כדי לגייס תרומות למטרה מסוימת.
        </div>
      )}
    </div>
  );
}
