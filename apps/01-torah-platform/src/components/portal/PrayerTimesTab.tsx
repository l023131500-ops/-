import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Clock, MapPin, Phone, Save, X, Building2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRAYER_TYPES = ["שחרית", "מנחה", "ערבית", "מנחה-ערבית", "מוסף", "סליחות", "תיקון חצות", "שיעור תורה", "פעילות נוער", "אחר"];
const DAY_OPTIONS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "יומי", "חול", "שבת וחג"];

interface PrayerTimesTabProps {
  orgId: string;
}

const PrayerTimesTab = ({ orgId }: PrayerTimesTabProps) => {
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSynagogue, setAddingSynagogue] = useState(false);
  const [editingSynagogue, setEditingSynagogue] = useState<string | null>(null);
  const [synForm, setSynForm] = useState({ name: "", address: "", city: "", neighborhood: "", phone: "", notes: "" });
  const [addingPrayer, setAddingPrayer] = useState<string | null>(null); // synagogue_id
  const [prayerForm, setPrayerForm] = useState({ prayer_type: "שחרית", day_of_week: "יומי", time: "", notes: "", custom_category: "" });
  const loadSeq = useRef(0);

  useEffect(() => { fetchData(); }, [orgId]);

  const fetchData = async () => {
    const seq = ++loadSeq.current;
    const [synRes, ptRes] = await Promise.all([
      supabase.from("synagogues").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("prayer_times").select("*").order("created_at", { ascending: false }),
    ]);
    if (seq !== loadSeq.current) return;
    const syns = synRes.data || [];
    setSynagogues(syns);
    // Filter prayer times to only our synagogues
    const synIds = syns.map((s: any) => s.id);
    setPrayerTimes((ptRes.data || []).filter((pt: any) => synIds.includes(pt.synagogue_id)));
    setLoading(false);
  };

  const addSynagogue = async () => {
    if (!synForm.name.trim()) { toast.error("שם בית הכנסת הוא שדה חובה"); return; }
    const { data, error } = await supabase.from("synagogues").insert({ ...synForm, org_id: orgId }).select().single();
    if (!error && data) {
      setSynagogues(prev => [data, ...prev]);
      setSynForm({ name: "", address: "", city: "", neighborhood: "", phone: "", notes: "" });
      setAddingSynagogue(false);
      toast.success("בית כנסת נוסף!");
    } else toast.error("שגיאה");
  };

  const updateSynagogue = async (id: string) => {
    const { error } = await supabase.from("synagogues").update(synForm).eq("id", id);
    if (!error) {
      setSynagogues(prev => prev.map(s => s.id === id ? { ...s, ...synForm } : s));
      setEditingSynagogue(null);
      toast.success("בית כנסת עודכן!");
    } else toast.error("שגיאה");
  };

  const deleteSynagogue = async (id: string) => {
    const { error } = await supabase.from("synagogues").delete().eq("id", id);
    if (!error) {
      setSynagogues(prev => prev.filter(s => s.id !== id));
      setPrayerTimes(prev => prev.filter(pt => pt.synagogue_id !== id));
      toast.success("בית כנסת נמחק");
    }
  };

  const addPrayerTime = async (synagogueId: string) => {
    if (!prayerForm.time.trim()) { toast.error("שעה היא שדה חובה"); return; }
    const insertData: any = { ...prayerForm, synagogue_id: synagogueId };
    // If "אחר" is selected, use custom_category as the display name
    if (prayerForm.prayer_type === "אחר" && prayerForm.custom_category.trim()) {
      insertData.custom_category = prayerForm.custom_category.trim();
    }
    const { data, error } = await supabase.from("prayer_times").insert(insertData).select().single();
    if (!error && data) {
      setPrayerTimes(prev => [data, ...prev]);
      setPrayerForm({ prayer_type: "שחרית", day_of_week: "יומי", time: "", notes: "", custom_category: "" });
      setAddingPrayer(null);
      toast.success("זמן תפילה / פעילות נוספה!");
    } else toast.error("שגיאה");
  };

  const deletePrayerTime = async (id: string) => {
    const { error } = await supabase.from("prayer_times").delete().eq("id", id);
    if (!error) {
      setPrayerTimes(prev => prev.filter(pt => pt.id !== id));
      toast.success("זמן תפילה נמחק");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-black text-card-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" /> בתי כנסת וזמני תפילות ({synagogues.length})
        </h3>
        <Button onClick={() => { setAddingSynagogue(true); setSynForm({ name: "", address: "", city: "", neighborhood: "", phone: "", notes: "" }); }}
          className="bg-gradient-gold text-navy font-body font-bold gap-2">
          <Plus className="w-4 h-4" /> הוסף בית כנסת
        </Button>
      </div>

      {/* Add Synagogue Form */}
      {addingSynagogue && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card rounded-2xl border-2 border-gold/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-gold">בית כנסת חדש</h4>
            <Button variant="ghost" size="icon" onClick={() => setAddingSynagogue(false)}><X className="w-4 h-4" /></Button>
          </div>
          <SynagogueForm form={synForm} onChange={setSynForm} />
          <Button onClick={addSynagogue} className="w-full bg-gradient-teal text-primary-foreground font-body font-bold gap-2">
            <Save className="w-4 h-4" /> שמור
          </Button>
        </motion.div>
      )}

      {/* Synagogues List */}
      {synagogues.length === 0 && !addingSynagogue ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-display text-xl font-black text-muted-foreground">אין בתי כנסת עדיין</p>
          <p className="font-body text-sm text-muted-foreground/60">הוסיפו בתי כנסת כדי לנהל זמני תפילות</p>
        </div>
      ) : (
        <div className="space-y-4">
          {synagogues.map(syn => {
            const synPrayers = prayerTimes.filter(pt => pt.synagogue_id === syn.id);
            const isEditing = editingSynagogue === syn.id;
            return (
              <motion.div key={syn.id} layout className="bg-card rounded-2xl border border-border overflow-hidden">
                {isEditing ? (
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-teal">עריכת בית כנסת</h4>
                      <Button variant="ghost" size="icon" onClick={() => setEditingSynagogue(null)}><X className="w-4 h-4" /></Button>
                    </div>
                    <SynagogueForm form={synForm} onChange={setSynForm} />
                    <Button onClick={() => updateSynagogue(syn.id)} className="w-full bg-gradient-brand text-primary-foreground font-body font-bold gap-2">
                      <Save className="w-4 h-4" /> עדכן
                    </Button>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-display text-lg font-black text-card-foreground flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gold" /> {syn.name}
                        </h4>
                        <div className="flex flex-wrap gap-3 font-body text-sm text-muted-foreground mt-1">
                          {syn.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{syn.address}</span>}
                          {syn.city && <span>{syn.city}</span>}
                          {syn.neighborhood && <span>({syn.neighborhood})</span>}
                          {syn.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{syn.phone}</span>}
                        </div>
                        {syn.notes && <p className="font-body text-xs text-muted-foreground mt-1">{syn.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingSynagogue(syn.id); setSynForm({ name: syn.name, address: syn.address || "", city: syn.city || "", neighborhood: syn.neighborhood || "", phone: syn.phone || "", notes: syn.notes || "" }); }}
                          className="text-gold hover:bg-gold/10">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSynagogue(syn.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Prayer Times */}
                    <div className="border-t border-border/50 pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-body text-xs font-bold text-muted-foreground">זמני תפילות ({synPrayers.length})</span>
                        <Button variant="ghost" size="sm" onClick={() => { setAddingPrayer(syn.id); setPrayerForm({ prayer_type: "שחרית", day_of_week: "יומי", time: "", notes: "", custom_category: "" }); }}
                          className="text-gold hover:bg-gold/10 font-body text-xs gap-1 h-7">
                          <Plus className="w-3 h-3" /> הוסף זמן
                        </Button>
                      </div>

                      {addingPrayer === syn.id && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-muted/30 rounded-xl p-3 mb-3 space-y-2 border border-border/50">
                          <div className="grid grid-cols-4 gap-2">
                            <select value={prayerForm.prayer_type} onChange={e => setPrayerForm(f => ({ ...f, prayer_type: e.target.value }))}
                              aria-label="סוג תפילה"
                              className="rounded-md border border-gold/20 bg-background px-2 py-1.5 text-xs font-body">
                              {PRAYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={prayerForm.day_of_week} onChange={e => setPrayerForm(f => ({ ...f, day_of_week: e.target.value }))}
                              aria-label="יום בשבוע"
                              className="rounded-md border border-gold/20 bg-background px-2 py-1.5 text-xs font-body">
                              {DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <Input value={prayerForm.time} onChange={e => setPrayerForm(f => ({ ...f, time: e.target.value }))}
                              placeholder="07:00" className="border-gold/20 h-8 text-xs" />
                            <Input value={prayerForm.notes} onChange={e => setPrayerForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="הערות..." className="border-gold/20 h-8 text-xs" />
                          </div>
                          {prayerForm.prayer_type === "אחר" && (
                            <Input value={prayerForm.custom_category} onChange={e => setPrayerForm(f => ({ ...f, custom_category: e.target.value }))}
                              placeholder="שם הפעילות / קטגוריה..." className="border-gold/20 h-8 text-xs" />
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addPrayerTime(syn.id)} className="bg-gradient-teal text-primary-foreground font-body text-xs h-7 gap-1">
                              <Save className="w-3 h-3" /> שמור
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingPrayer(null)} className="font-body text-xs h-7">ביטול</Button>
                          </div>
                        </motion.div>
                      )}

                      {synPrayers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {synPrayers.map(pt => (
                            <Badge key={pt.id} variant="outline" className="font-body text-xs gap-1.5 py-1.5 px-3 group cursor-default">
                              <Clock className="w-3 h-3 text-gold" />
                              <span className="font-bold">{pt.prayer_type}</span>
                              <span className="text-muted-foreground">{pt.day_of_week}</span>
                              <span className="text-primary font-bold">{pt.time}</span>
                              {pt.notes && <span className="text-muted-foreground">({pt.notes})</span>}
                              <button onClick={() => deletePrayerTime(pt.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive ml-1 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground/50">טרם הוגדרו זמני תפילות</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SynagogueForm = ({ form, onChange }: { form: any; onChange: (f: any) => void }) => (
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שם בית הכנסת *</label>
      <Input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">עיר</label>
      <Input value={form.city} onChange={e => onChange({ ...form, city: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שכונה</label>
      <Input value={form.neighborhood} onChange={e => onChange({ ...form, neighborhood: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">כתובת</label>
      <Input value={form.address} onChange={e => onChange({ ...form, address: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">טלפון</label>
      <Input value={form.phone} onChange={e => onChange({ ...form, phone: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
    <div>
      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">הערות</label>
      <Input value={form.notes} onChange={e => onChange({ ...form, notes: e.target.value })} className="border-gold/20 focus:border-gold/50" />
    </div>
  </div>
);

export default PrayerTimesTab;
