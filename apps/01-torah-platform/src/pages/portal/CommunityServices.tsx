import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, HeartHandshake, MapPin, Phone, Clock, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";

// community_services: tenant_id + service_type ('wedding'|'mikveh'|'chevra_kadisha'|
// 'mourning'|'brit_mila') + title (required) + description/contact_*/address/hours/
// links/notes/is_active. public/Mikvaot.tsx already reads service_type='mikveh' (RLS
// ready since 20260519000002) but no screen anywhere ever wrote to this table, so it
// was always empty — the public mikvaot directory, and every other service type
// (weddings, chevra kadisha, local mourning-guidance contacts, brit mila), had zero
// rows and no way to add one for every religious_council tenant.

const SERVICE_TYPES = [
  { value: "wedding", label: "חתונות" },
  { value: "mikveh", label: "מקוואות" },
  { value: "chevra_kadisha", label: "חברה קדישא" },
  { value: "mourning", label: "מדריך אבלות מקומי" },
  { value: "brit_mila", label: "ברית מילה" },
];
const typeLabel = (t: string) => SERVICE_TYPES.find((o) => o.value === t)?.label || t;

const emptyForm = {
  service_type: "wedding",
  title: "",
  description: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  hours: "",
  link_label: "",
  link_url: "",
  notes: "",
  is_active: true,
};

export default function CommunityServices() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-community-services", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("community_services")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("service_type")
        .order("title");
      return data || [];
    },
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    const firstLink = Array.isArray(s.links) && s.links.length > 0 ? s.links[0] : null;
    setForm({
      service_type: s.service_type || "wedding",
      title: s.title || "",
      description: s.description || "",
      contact_name: s.contact_name || "",
      contact_phone: s.contact_phone || "",
      contact_email: s.contact_email || "",
      address: s.address || "",
      hours: s.hours || "",
      link_label: firstLink?.label || "",
      link_url: firstLink?.url || "",
      notes: s.notes || "",
      is_active: s.is_active !== false,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        service_type: form.service_type,
        title: form.title,
        description: form.description || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        address: form.address || null,
        hours: form.hours || null,
        links: form.link_url ? [{ label: form.link_label || form.link_url, url: form.link_url }] : [],
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (editId) {
        const { error } = await supabase.from("community_services").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_services").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "השירות עודכן" : "השירות נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-community-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_services").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-community-services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">שירותי קהילה</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          שירות חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת שירות" : "שירות קהילה חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>סוג שירות</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="שם השירות / הגוף..." />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>כתובת</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>שעות פעילות</Label>
                <Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="א-ה 8:00-20:00..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>איש קשר</Label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
              <div>
                <Label>מייל</Label>
                <Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>קישור — כותרת</Label>
                <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="אופציונלי" />
              </div>
              <div>
                <Label>קישור — כתובת</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>הערות פנימיות</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>פעיל ומוצג לציבור</Label>
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.title}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת שירות</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק שירות זה?</p>
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

      <div className="space-y-2">
        {(data || []).map((s: any) => {
          const link = Array.isArray(s.links) && s.links.length > 0 ? s.links[0] : null;
          return (
            <Card key={s.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HeartHandshake className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-muted-foreground">{typeLabel(s.service_type)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.is_active && <Badge variant="outline">לא פעיל</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(s.address || s.contact_phone || s.hours || link) && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm text-muted-foreground">
                    {s.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {s.address}</div>}
                    {s.contact_phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {s.contact_name ? `${s.contact_name} · ` : ""}{s.contact_phone}</div>}
                    {s.hours && <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {s.hours}</div>}
                    {link && (
                      <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                        <LinkIcon className="h-3 w-3" /> {link.label || link.url}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין שירותי קהילה רשומים עדיין</div>}
      </div>
    </div>
  );
}
