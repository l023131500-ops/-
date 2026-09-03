import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Trash2, Clock, Edit2, Save, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import FeatureLocked from "@/components/portal/FeatureLocked";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PRAYER_TYPES, PRAYER_DAY_OPTIONS } from "@/types/questionnaire";

const PrayerTimes = () => {
  const { user } = useAuth();
  const { locked, checked } = useFeatureGate("prayer_times");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any[]>([]);
  const [showAddSyn, setShowAddSyn] = useState(false);
  const [showAddPrayer, setShowAddPrayer] = useState<string | null>(null);
  const [synForm, setSynForm] = useState({ name: "", address: "", city: "", neighborhood: "", phone: "", notes: "" });
  const [prayerForm, setPrayerForm] = useState({ prayer_type: "", day_of_week: "יומי", time: "", notes: "", custom_category: "" });

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user!.id).single();
    if (!profile) return;
    setProfileId(profile.id);
    const { data: syns } = await supabase.from("synagogues").select("*").eq("teacher_id", profile.id);
    setSynagogues(syns || []);
    if (syns && syns.length > 0) {
      const synIds = syns.map(s => s.id);
      const { data: pts } = await supabase.from("prayer_times").select("*").in("synagogue_id", synIds);
      setPrayerTimes(pts || []);
    }
  };

  const handleAddSyn = async () => {
    if (!synForm.name || !profileId) { toast.error("נא להזין שם בית כנסת"); return; }
    const { error } = await supabase.from("synagogues").insert({ ...synForm, teacher_id: profileId });
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("בית הכנסת נוסף!");
    setShowAddSyn(false);
    setSynForm({ name: "", address: "", city: "", neighborhood: "", phone: "", notes: "" });
    fetchData();
  };

  const handleDeleteSyn = async (id: string) => {
    await supabase.from("prayer_times").delete().eq("synagogue_id", id);
    await supabase.from("synagogues").delete().eq("id", id);
    toast.success("בית הכנסת נמחק");
    fetchData();
  };

  const handleAddPrayer = async () => {
    if (!prayerForm.prayer_type || !prayerForm.time || !showAddPrayer) { toast.error("נא למלא סוג תפילה ושעה"); return; }
    const { error } = await supabase.from("prayer_times").insert({ ...prayerForm, synagogue_id: showAddPrayer });
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("זמן תפילה נוסף!");
    setShowAddPrayer(null);
    setPrayerForm({ prayer_type: "", day_of_week: "יומי", time: "", notes: "", custom_category: "" });
    fetchData();
  };

  const handleDeletePrayer = async (id: string) => {
    await supabase.from("prayer_times").delete().eq("id", id);
    toast.success("זמן התפילה נמחק");
    fetchData();
  };

  if (checked && locked) {
    return <PortalLayout><FeatureLocked /></PortalLayout>;
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-secondary" />בתי כנסת וזמני תפילות
            </h1>
            <p className="text-muted-foreground text-sm mt-1">ניהול בתי כנסת וזמני תפילות</p>
          </div>
          <Dialog open={showAddSyn} onOpenChange={setShowAddSyn}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-secondary-foreground hover:bg-gold-dark"><Plus className="w-4 h-4 ml-2" />בית כנסת חדש</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>הוסף בית כנסת</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-4">
                <Input placeholder="שם בית הכנסת *" value={synForm.name} onChange={e => setSynForm(p => ({ ...p, name: e.target.value }))} />
                <Input placeholder="כתובת" value={synForm.address} onChange={e => setSynForm(p => ({ ...p, address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="עיר" value={synForm.city} onChange={e => setSynForm(p => ({ ...p, city: e.target.value }))} />
                  <Input placeholder="שכונה" value={synForm.neighborhood} onChange={e => setSynForm(p => ({ ...p, neighborhood: e.target.value }))} />
                </div>
                <Input placeholder="טלפון" value={synForm.phone} onChange={e => setSynForm(p => ({ ...p, phone: e.target.value }))} />
                <Input placeholder="הערות" value={synForm.notes} onChange={e => setSynForm(p => ({ ...p, notes: e.target.value }))} />
                <Button onClick={handleAddSyn} className="w-full bg-secondary text-secondary-foreground">שמור</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {synagogues.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">אין בתי כנסת עדיין</h3>
            <p className="text-muted-foreground">הוסף בית כנסת ונהל זמני תפילות</p>
          </div>
        )}

        {synagogues.map((syn, i) => {
          const synPrayers = prayerTimes.filter(p => p.synagogue_id === syn.id);
          return (
            <motion.div key={syn.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{syn.name}</h3>
                  {syn.address && <p className="text-sm text-muted-foreground">📍 {syn.address} {syn.city ? `- ${syn.city}` : ""}</p>}
                  {syn.phone && <p className="text-sm text-muted-foreground">📞 {syn.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setShowAddPrayer(syn.id); setPrayerForm({ prayer_type: "", day_of_week: "יומי", time: "", notes: "", custom_category: "" }); }}>
                    <Plus className="w-4 h-4 ml-1" />זמן תפילה
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteSyn(syn.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {synPrayers.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {synPrayers.map(pt => (
                    <div key={pt.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-foreground">
                          {pt.prayer_type === "אחר" && pt.custom_category ? pt.custom_category : pt.prayer_type}
                        </span>
                        <span className="text-muted-foreground mr-2">{pt.time}</span>
                        {pt.day_of_week !== "יומי" && <span className="text-xs text-muted-foreground">({pt.day_of_week})</span>}
                      </div>
                      <button onClick={() => handleDeletePrayer(pt.id)} className="text-destructive/60 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Add Prayer Time Dialog */}
        <Dialog open={!!showAddPrayer} onOpenChange={() => setShowAddPrayer(null)}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>הוסף זמן תפילה</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <Select value={prayerForm.prayer_type} onValueChange={v => setPrayerForm(p => ({ ...p, prayer_type: v }))}>
                <SelectTrigger><SelectValue placeholder="סוג תפילה *" /></SelectTrigger>
                <SelectContent>{PRAYER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {prayerForm.prayer_type === "אחר" && (
                <Input placeholder="פרט את סוג האירוע/תפילה" value={prayerForm.custom_category} onChange={e => setPrayerForm(p => ({ ...p, custom_category: e.target.value }))} />
              )}
              <Select value={prayerForm.day_of_week} onValueChange={v => setPrayerForm(p => ({ ...p, day_of_week: v }))}>
                <SelectTrigger><SelectValue placeholder="יום" /></SelectTrigger>
                <SelectContent>{PRAYER_DAY_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="שעה (לדוג' 07:00)" value={prayerForm.time} onChange={e => setPrayerForm(p => ({ ...p, time: e.target.value }))} />
              <Input placeholder="הערות" value={prayerForm.notes} onChange={e => setPrayerForm(p => ({ ...p, notes: e.target.value }))} />
              <Button onClick={handleAddPrayer} className="w-full bg-secondary text-secondary-foreground">שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PortalLayout>
  );
};

export default PrayerTimes;