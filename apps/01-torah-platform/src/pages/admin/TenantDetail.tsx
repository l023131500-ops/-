import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLANS = [
  { v: "trial", l: "ניסיון" },
  { v: "standard", l: "רגיל" },
  { v: "premium", l: "פרימיום" },
  { v: "union", l: "איגוד" },
];

export default function TenantDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [features, setFeatures] = useState<any>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subForm, setSubForm] = useState({ plan: "standard", expires_at: "", payment_method: "", notes: "" });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-admin", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("*, tenant_branding(*), tenant_features(*)").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["tenant-subscriptions", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenant_subscriptions").select("*").eq("tenant_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createSubscription = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenant_subscriptions").insert({
        tenant_id: id!,
        plan: subForm.plan,
        expires_at: subForm.expires_at || null,
        payment_method: subForm.payment_method || null,
        notes: subForm.notes || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("רישיון נוסף");
      setSubOpen(false);
      setSubForm({ plan: "standard", expires_at: "", payment_method: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["tenant-subscriptions", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSubscriptionActive = useMutation({
    mutationFn: async ({ subId, is_active }: { subId: string; is_active: boolean }) => {
      const { error } = await supabase.from("tenant_subscriptions").update({ is_active }).eq("id", subId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-subscriptions", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (tenant?.tenant_features) setFeatures(Array.isArray(tenant.tenant_features) ? tenant.tenant_features[0] : tenant.tenant_features);
  }, [tenant]);

  const saveFeatures = async () => {
    if (!features || savingFeatures) return;
    setSavingFeatures(true);
    try {
      const { error } = await supabase.from("tenant_features").update(features).eq("tenant_id", id!);
      if (error) toast.error(error.message); else toast.success("תכונות נשמרו");
    } catch (e: any) {
      toast.error(e?.message || "שגיאה בשמירת התכונות");
    } finally {
      setSavingFeatures(false);
    }
  };

  if (!tenant) return <div>טוען...</div>;

  return (
    <div>
      <Button asChild variant="ghost" className="mb-4"><Link to="/admin/tenants"><ArrowRight className="ml-2 h-4 w-4" /> חזור</Link></Button>
      <h1 className="font-heading text-3xl mb-2">{tenant.display_name || tenant.name}</h1>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-muted-foreground">/{tenant.slug}</span>
        <Button asChild size="sm" variant="outline"><a href={`/t/${tenant.slug}`} target="_blank"><ExternalLink className="ml-1 h-3 w-3" /> צפה באתר</a></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>תכונות מופעלות</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {features && Object.keys(features).filter((k) => typeof features[k] === "boolean").map((k) => (
            <div key={k} className="flex items-center justify-between border-b py-2">
              <Label>{k}</Label>
              <Switch checked={features[k]} onCheckedChange={(v) => setFeatures({ ...features, [k]: v })} />
            </div>
          ))}
          <Button onClick={saveFeatures} disabled={savingFeatures} className="mt-4">{savingFeatures ? "שומר..." : "שמור"}</Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>רישיון ומנוי</CardTitle>
          <Dialog open={subOpen} onOpenChange={setSubOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="ml-2 h-4 w-4" /> רישיון חדש</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>הוספת רישיון</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>תוכנית</Label>
                  <Select value={subForm.plan} onValueChange={(v) => setSubForm({ ...subForm, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>תאריך תפוגה</Label><Input type="date" value={subForm.expires_at} onChange={(e) => setSubForm({ ...subForm, expires_at: e.target.value })} /></div>
                <div><Label>אמצעי תשלום</Label><Input value={subForm.payment_method} onChange={(e) => setSubForm({ ...subForm, payment_method: e.target.value })} placeholder="נדרים פלוס / העברה בנקאית / אחר" /></div>
                <div><Label>הערות</Label><Textarea value={subForm.notes} onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })} /></div>
                <Button onClick={() => createSubscription.mutate()} disabled={createSubscription.isPending}>{createSubscription.isPending ? "שומר..." : "צור רישיון"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {(subscriptions || []).length === 0 && <div className="text-sm text-muted-foreground">אין רישיון רשום לארגון זה.</div>}
          {(subscriptions || []).map((s: any) => {
            const expired = s.expires_at && new Date(s.expires_at) < new Date();
            return (
              <div key={s.id} className="flex items-center justify-between border-b py-3 last:border-b-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary">{PLANS.find((p) => p.v === s.plan)?.l || s.plan}</Badge>
                  {expired && <Badge variant="destructive">פג תוקף</Badge>}
                  <div className="text-sm">
                    <div>התחלה: {new Date(s.starts_at).toLocaleDateString("he-IL")}{s.expires_at && ` · תפוגה: ${new Date(s.expires_at).toLocaleDateString("he-IL")}`}</div>
                    {s.payment_method && <div className="text-muted-foreground">{s.payment_method}</div>}
                    {s.notes && <div className="text-muted-foreground">{s.notes}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">פעיל</Label>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggleSubscriptionActive.mutate({ subId: s.id, is_active: v })}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
