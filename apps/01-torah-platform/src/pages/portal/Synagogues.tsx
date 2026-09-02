import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Building2, MapPin, User, Phone, ChevronDown, ChevronUp } from "lucide-react";
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

// synagogues: name (required) + nusach/rabbi_name/gabbai_*/address/city/neighborhood/
// region/capacity/has_mikve/has_kollel/description. public/Synagogues.tsx +
// SynagogueDetail.tsx already read this table (tenant-scoped, RLS ready since
// 20260519000002) but no screen anywhere ever wrote to it, so every
// religious_council tenant (e.g. the live "מועצה דתית גליל") had zero synagogues
// and no way to add one — the public directory was permanently empty.

const emptyForm = {
  name: "",
  nusach: "",
  rabbi_name: "",
  gabbai_name: "",
  gabbai_phone: "",
  gabbai_email: "",
  address: "",
  city: "",
  neighborhood: "",
  region: "",
  capacity: "",
  has_mikve: false,
  has_kollel: false,
  description: "",
};

export default function PortalSynagogues() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["portal-synagogues", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("synagogues")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("name");
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
    setForm({
      name: s.name || "",
      nusach: s.nusach || "",
      rabbi_name: s.rabbi_name || "",
      gabbai_name: s.gabbai_name || "",
      gabbai_phone: s.gabbai_phone || "",
      gabbai_email: s.gabbai_email || "",
      address: s.address || "",
      city: s.city || "",
      neighborhood: s.neighborhood || "",
      region: s.region || "",
      capacity: s.capacity != null ? String(s.capacity) : "",
      has_mikve: !!s.has_mikve,
      has_kollel: !!s.has_kollel,
      description: s.description || "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("חסר ארגון");
      const payload = {
        name: form.name,
        nusach: form.nusach || null,
        rabbi_name: form.rabbi_name || null,
        gabbai_name: form.gabbai_name || null,
        gabbai_phone: form.gabbai_phone || null,
        gabbai_email: form.gabbai_email || null,
        address: form.address || null,
        city: form.city || null,
        neighborhood: form.neighborhood || null,
        region: form.region || null,
        capacity: form.capacity ? parseInt(form.capacity, 10) : null,
        has_mikve: form.has_mikve,
        has_kollel: form.has_kollel,
        description: form.description || null,
      };
      if (editId) {
        const { error } = await supabase.from("synagogues").update(payload).eq("id", editId).eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("synagogues").insert({ ...payload, tenant_id: tenant.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "בית הכנסת עודכן" : "בית הכנסת נוסף");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-synagogues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("synagogues").delete().eq("id", id).eq("tenant_id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("נמחק");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["portal-synagogues"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl">בתי כנסת באזור</h1>
        <Button onClick={openCreate}>
          <Plus className="ml-2 h-4 w-4" />
          בית כנסת חדש
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת בית כנסת" : "בית כנסת חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם בית הכנסת *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="בית הכנסת..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>נוסח</Label>
                <Input value={form.nusach} onChange={(e) => setForm({ ...form, nusach: e.target.value })} placeholder="אשכנז / ספרד / תימני..." />
              </div>
              <div>
                <Label>רב בית הכנסת</Label>
                <Input value={form.rabbi_name} onChange={(e) => setForm({ ...form, rabbi_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>כתובת</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>עיר</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>שכונה</Label>
                <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </div>
              <div>
                <Label>אזור</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>שם גבאי</Label>
                <Input value={form.gabbai_name} onChange={(e) => setForm({ ...form, gabbai_name: e.target.value })} />
              </div>
              <div>
                <Label>טלפון גבאי</Label>
                <Input value={form.gabbai_phone} onChange={(e) => setForm({ ...form, gabbai_phone: e.target.value })} />
              </div>
              <div>
                <Label>מייל גבאי</Label>
                <Input value={form.gabbai_email} onChange={(e) => setForm({ ...form, gabbai_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>קיבולת (מקומות ישיבה)</Label>
              <Input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.has_mikve} onCheckedChange={(v) => setForm({ ...form, has_mikve: v })} />
                <Label>מקווה במקום</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.has_kollel} onCheckedChange={(v) => setForm({ ...form, has_kollel: v })} />
                <Label>כולל במקום</Label>
              </div>
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <Button
              className="w-full"
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.name}
            >
              {save.isPending ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>מחיקת בית כנסת</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האם אתה בטוח שברצונך למחוק בית כנסת זה?</p>
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
          const isOpen = expandedId === s.id;
          return (
            <Card key={s.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-3 flex-1 text-right"
                    onClick={() => setExpandedId(isOpen ? null : s.id)}
                  >
                    <Building2 className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.nusach}{s.nusach && s.city ? " · " : ""}{s.city}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {s.has_mikve && <Badge variant="outline">מקווה</Badge>}
                    {s.has_kollel && <Badge variant="outline">כולל</Badge>}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setExpandedId(isOpen ? null : s.id)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t space-y-1.5 text-sm text-muted-foreground">
                    {s.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {s.address}{s.city ? `, ${s.city}` : ""}{s.neighborhood ? ` (${s.neighborhood})` : ""}</div>}
                    {s.rabbi_name && <div className="flex items-center gap-2"><User className="h-3 w-3" /> רב: {s.rabbi_name}</div>}
                    {s.gabbai_name && <div className="flex items-center gap-2"><User className="h-3 w-3" /> גבאי: {s.gabbai_name}{s.gabbai_phone ? ` · ${s.gabbai_phone}` : ""}</div>}
                    {s.gabbai_phone && !s.gabbai_name && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {s.gabbai_phone}</div>}
                    {s.capacity != null && <div>קיבולת: {s.capacity} מקומות</div>}
                    {s.description && <p className="text-foreground/85 pt-1">{s.description}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(data?.length || 0) === 0 && <div className="text-muted-foreground">אין בתי כנסת רשומים עדיין</div>}
      </div>
    </div>
  );
}
