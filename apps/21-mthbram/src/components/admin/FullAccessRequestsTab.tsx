import { useEffect, useState, useCallback } from "react";
import { Phone, Mail, MapPin, Save, Trash2, Building2, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FEATURE_OPTIONS } from "@/components/synagogue/SynagogueFullAccessRequest";

export default function FullAccessRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("synagogue_full_access_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data ?? []);
    const d: Record<string, Record<string, boolean>> = {};
    (data ?? []).forEach((r: any) => {
      const map: Record<string, boolean> = {};
      FEATURE_OPTIONS.forEach((f) => {
        map[f.id] = (r.approved_features ?? []).includes(f.id);
      });
      d[r.id] = map;
    });
    setDrafts(d);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (rid: string, fid: string) => {
    setDrafts((prev) => ({ ...prev, [rid]: { ...prev[rid], [fid]: !prev[rid]?.[fid] } }));
  };

  const save = async (req: any) => {
    setSaving(req.id);
    const map = drafts[req.id] ?? {};
    const approved = Object.entries(map).filter(([, v]) => v).map(([k]) => k);

    // 1. update the request
    const { error: e1 } = await supabase
      .from("synagogue_full_access_requests")
      .update({ approved_features: approved, status: "reviewed", updated_at: new Date().toISOString() })
      .eq("id", req.id);

    // 2. update the synagogue portal's features_enabled
    let e2: any = null;
    if (req.synagogue_portal_id) {
      const featuresEnabled: Record<string, boolean> = { lessons: true, settings: true };
      FEATURE_OPTIONS.forEach((f) => {
        featuresEnabled[f.id] = approved.includes(f.id);
      });
      const r = await supabase
        .from("synagogue_portals")
        .update({ features_enabled: featuresEnabled })
        .eq("id", req.synagogue_portal_id);
      e2 = r.error;
    }
    setSaving(null);
    if (e1 || e2) return toast.error("שגיאה בשמירה");
    toast.success("האישורים נשמרו וברגע זה הופעלו בפורטל בית הכנסת ✓");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הבקשה?")) return;
    const { error } = await supabase.from("synagogue_full_access_requests").delete().eq("id", id);
    if (error) return toast.error("שגיאה במחיקה");
    toast.success("נמחק");
    load();
  };

  if (loading) return <p className="text-center py-12 text-muted-foreground font-body">טוען בקשות...</p>;

  if (requests.length === 0) {
    return <p className="text-center font-body text-muted-foreground py-16">אין בקשות להרחבת ממשק עדיין</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const reviewed = req.status === "reviewed";
        return (
          <div key={req.id} className="bg-card rounded-2xl border-2 border-border hover:border-gold/30 transition-all p-5">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Building2 className="w-4 h-4 text-gold" />
                  <h3 className="font-display text-lg font-black text-card-foreground">{req.synagogue_name}</h3>
                  <Badge className={`font-body font-bold ${reviewed ? "bg-gradient-teal text-primary-foreground" : "bg-gradient-gold text-navy animate-pulse"}`}>
                    {reviewed ? <><Check className="w-3 h-3 ml-1 inline" /> נבדק</> : <><Clock className="w-3 h-3 ml-1 inline" /> ממתין</>}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-body text-muted-foreground">
                  {req.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.city}</span>}
                  {req.contact_name && <span>👤 {req.contact_name}</span>}
                  {req.contact_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {req.contact_phone}</span>}
                  {req.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {req.contact_email}</span>}
                </div>
                {req.note && <p className="font-body text-xs text-muted-foreground mt-2">💬 {req.note}</p>}
                <p className="font-body text-xs text-muted-foreground/60 mt-1">{new Date(req.created_at).toLocaleString("he-IL")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => remove(req.id)} className="text-destructive border-destructive/30 gap-1">
                <Trash2 className="w-3 h-3" /> מחק
              </Button>
            </div>

            <div className="bg-muted/30 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-muted-foreground mb-2">אישור פיצ׳רים — סמנו את מה שמאושר להפעלה:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {FEATURE_OPTIONS.map((f) => {
                  const requested = (req.requested_features ?? []).includes(f.id);
                  const checked = drafts[req.id]?.[f.id] ?? false;
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-2 p-2 bg-card rounded-lg border">
                      <Label className="text-sm font-body cursor-pointer flex-1">
                        <span className="ml-1">{f.emoji}</span>
                        {f.label}
                        {requested && <Badge variant="outline" className="mr-2 text-[10px] border-gold/40 text-gold">התבקש</Badge>}
                      </Label>
                      <Switch checked={checked} onCheckedChange={() => toggle(req.id, f.id)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={() => save(req)} disabled={saving === req.id} className="bg-gradient-teal text-primary-foreground gap-2 font-body font-bold">
              <Save className="w-4 h-4" />
              {saving === req.id ? "שומר..." : "שמור אישורים והפעל בפורטל"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
