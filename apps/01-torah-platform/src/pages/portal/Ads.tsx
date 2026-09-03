import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// public.ads (architecture.md §3.2 "activity_slides — באנרי פרסום עם גדלים
// small/medium/large"): table+RLS existed live since 20260519000002 (size +
// placement + is_active + starts_at/ends_at + sort_order all already there)
// but no screen anywhere ever wrote to it — only the hard-coded platform
// self-promo banners existed. This is the first write path, same UI-wiring
// gap class as Synagogues/CommunityServices/Azkarot/Newsletters before it.
//
// synagogue_id (migration 20260903010000, architecture.md §5.2 religious
// council bullet "פרסום פנימי – באנרים פר-ביכ״נ"): a religious-council
// tenant owns multiple synagogues (src/pages/portal/Synagogues.tsx) and can
// now aim a banner at one of them instead of only the whole tenant. The
// picker below only appears when the tenant actually has synagogues rows —
// empty/no-op for tenant types that don't (synagogue/organization/teacher).

const SIZE_OPTIONS = [
  { value: "small", label: "קטן" },
  { value: "medium", label: "בינוני" },
  { value: "large", label: "גדול" },
  { value: "hero", label: "ראשי (hero)" },
];

const PLACEMENT_OPTIONS = [
  { value: "homepage", label: "עמוד הבית" },
  { value: "sidebar", label: "סרגל צד" },
  { value: "footer", label: "תחתית העמוד" },
  { value: "strip", label: "רצועה" },
];

const NO_SYNAGOGUE = "__tenant_wide__";

const emptyForm = {
  title: "",
  link_url: "",
  size: "medium",
  placement: "homepage",
  starts_at: "",
  ends_at: "",
  sort_order: "0",
  synagogue_id: NO_SYNAGOGUE,
};

export default function PortalAds() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["portal-ads", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: synagogues } = useQuery({
    queryKey: ["portal-ads-synagogues", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("synagogues")
        .select("id, name")
        .eq("tenant_id", tenant!.id)
        .order("name", { ascending: true });
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setImageFile(null);
    setExistingImageUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setOpen(true);
  };

  const openEdit = (ad: any) => {
    setEditId(ad.id);
    setForm({
      title: ad.title || "",
      link_url: ad.link_url || "",
      size: ad.size || "medium",
      placement: ad.placement || "homepage",
      starts_at: ad.starts_at ? ad.starts_at.slice(0, 10) : "",
      ends_at: ad.ends_at ? ad.ends_at.slice(0, 10) : "",
      sort_order: ad.sort_order != null ? String(ad.sort_order) : "0",
      synagogue_id: ad.synagogue_id || NO_SYNAGOGUE,
    });
    setExistingImageUrl(ad.image_url || null);
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      if (!editId && !imageFile) throw new Error("יש לבחור תמונה");

      let image_url = existingImageUrl;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${tenant.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("site-images").upload(path, imageFile);
        if (upErr) throw upErr;
        image_url = supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        title: form.title,
        image_url,
        link_url: form.link_url || null,
        size: form.size,
        placement: form.placement,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        sort_order: form.sort_order ? parseInt(form.sort_order, 10) : 0,
        synagogue_id: form.synagogue_id === NO_SYNAGOGUE ? null : form.synagogue_id,
      };

      if (editId) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ads").insert({ ...payload, tenant_id: tenant.id, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "הבאנר עודכן" : "הבאנר נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-ads"] });
    },
    onError: (e: Error) => toast.error("שגיאה: " + e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (ad: any) => {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id)
        .eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: (_d, ad: any) => {
      toast.success(ad.is_active ? "הבאנר הוסתר" : "הבאנר הופעל");
      qc.invalidateQueries({ queryKey: ["portal-ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-ads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl">באנרים ופרסום</h1>
          <p className="text-sm text-muted-foreground mt-1">
            נהלו את הבאנרים המוצגים באתר הציבורי שלכם — קטן / בינוני / גדול / ראשי
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          באנר חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת באנר" : "באנר חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="שם הבאנר" />
            </div>
            <div>
              <Label>{editId ? "תמונה (השאירו ריק כדי לשמור את הקיימת)" : "תמונה *"}</Label>
              <Input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              {existingImageUrl && !imageFile && (
                <img src={existingImageUrl} alt="" className="mt-2 h-16 rounded object-cover" />
              )}
            </div>
            <div>
              <Label>קישור (אופציונלי)</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {synagogues && synagogues.length > 0 && (
              <div>
                <Label>בית כנסת (אופציונלי — פרסום פנימי לביכ"נ אחד בלבד)</Label>
                <Select value={form.synagogue_id} onValueChange={(v) => setForm({ ...form, synagogue_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SYNAGOGUE}>כל הארגון (ברירת מחדל)</SelectItem>
                    {synagogues.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>גודל</Label>
                <Select value={form.size} onValueChange={(v) => setForm({ ...form, size: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>מיקום</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>מתאריך</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>עד תאריך</Label>
                <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
              <div>
                <Label>סדר הצגה</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.title}>
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת באנר</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק באנר זה?</p>
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
        {(data || []).map((ad: any) => (
          <Card key={ad.id}>
            <CardContent className="pt-6">
              <div className="mb-3">
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="h-24 w-full object-cover rounded" />
                ) : (
                  <div className="h-24 w-full rounded bg-muted flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium">{ad.title}</div>
                <Switch checked={!!ad.is_active} onCheckedChange={() => toggleActive.mutate(ad)} disabled={toggleActive.isPending} />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge variant="outline" className="text-xs">
                  {SIZE_OPTIONS.find((o) => o.value === ad.size)?.label || ad.size}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {PLACEMENT_OPTIONS.find((o) => o.value === ad.placement)?.label || ad.placement}
                </Badge>
                {!ad.is_active && <Badge variant="secondary" className="text-xs">מוסתר</Badge>}
                {ad.synagogue_id && (
                  <Badge variant="outline" className="text-xs">
                    {synagogues?.find((s: any) => s.id === ad.synagogue_id)?.name || "בית כנסת ספציפי"}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ad.link_url && (
                  <Button asChild size="sm" variant="outline">
                    <a href={ad.link_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="ml-2 h-4 w-4" /> קישור
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(ad)}>
                  <Edit2 className="ml-2 h-4 w-4" /> עריכה
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(ad.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length || 0) === 0 && (
          <div className="text-muted-foreground flex items-center gap-2 col-span-full">
            <ImageIcon className="h-4 w-4" /> אין באנרים עדיין
          </div>
        )}
      </div>
    </div>
  );
}
