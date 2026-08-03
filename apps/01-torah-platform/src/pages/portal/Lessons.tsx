import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, MapPin, Clock, Users, Mic, Video } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  subjectOptions, LESSON_STYLES, speakingStyleOptions, styleOptions,
  GENDER_OPTIONS, LANGUAGES, AUDIENCE_TYPES, DAY_NAMES,
} from "@/types/questionnaire";

const emptyForm = {
  subject: "", city: "", neighborhood: "", street: "", street_number: "",
  synagogue_name: "", schedule_time: "", schedule_days: [] as string[],
  schedule_notes: "", lesson_style: "", speaking_style: "", language: "עברית",
  target_audience: [] as string[], audience_type: [] as string[],
  rabbi_phone: "", rabbi_role: "", contact_name: "", contact_phone: "",
  contact_email: "", donation_link: "", is_recurring: true, is_recorded: false,
  is_live_stream: false, recording_location: "", specific_date: "",
};

const ChipPicker = ({ options, selected, onChange, label }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; label: string;
}) => (
  <div>
    <label className="text-sm font-medium mb-2 block">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button"
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? "border-secondary bg-secondary/10 text-secondary" : "border-border text-muted-foreground hover:border-secondary/30"}`}
            onClick={() => onChange(active ? selected.filter(x => x !== opt) : [...selected, opt])}>
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const Lessons = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    // profiles.id is the auth user id, and a lesson points at its teacher
    // through rabbi_user_id — teacher_id belonged to the pre-migration schema.
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user!.id).maybeSingle();
    if (!profile) return;
    setProfileId(profile.id);
    const { data } = await supabase.from("lessons").select("*").eq("rabbi_user_id", profile.id).order("created_at", { ascending: false });
    setLessons(data || []);
  };

  const toggleDay = (d: string) => setForm(p => ({
    ...p,
    schedule_days: p.schedule_days.includes(d) ? p.schedule_days.filter(x => x !== d) : [...p.schedule_days, d],
  }));

  const handleAdd = async () => {
    if (!form.subject || !profileId) { toast.error("נא לבחור נושא"); return; }
    const { error } = await supabase.from("lessons").insert({
      teacher_id: profileId,
      subject: form.subject, city: form.city, neighborhood: form.neighborhood,
      street: form.street, street_number: form.street_number,
      synagogue_name: form.synagogue_name, schedule_time: form.schedule_time,
      schedule_days: form.schedule_days, schedule_notes: form.schedule_notes,
      lesson_style: form.lesson_style, speaking_style: form.speaking_style,
      language: form.language, target_audience: form.target_audience,
      audience_type: form.audience_type, rabbi_phone: form.rabbi_phone,
      rabbi_role: form.rabbi_role, contact_name: form.contact_name,
      contact_phone: form.contact_phone, contact_email: form.contact_email,
      donation_link: form.donation_link, is_recurring: form.is_recurring,
      is_recorded: form.is_recorded, is_live_stream: form.is_live_stream,
      recording_location: form.recording_location,
      specific_date: form.specific_date || null,
    });
    if (error) { toast.error("שגיאה: " + error.message); return; }
    toast.success("שיעור נוסף בהצלחה!");
    setShowAdd(false);
    setForm(emptyForm);
    setStep(1);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    toast.success("השיעור נמחק");
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("lessons").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-secondary" />השיעורים שלי
            </h1>
            <p className="text-muted-foreground text-sm mt-1">ניהול השיעורים שאתה מעביר</p>
          </div>
          <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) { setStep(1); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="bg-secondary text-secondary-foreground hover:bg-gold-dark"><Plus className="w-4 h-4 ml-2" />שיעור חדש</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto max-w-lg">
              <DialogHeader>
                <DialogTitle>הוסף שיעור חדש — שלב {step}/3</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {step === 1 && (<>
                  <ChipPicker label="נושא השיעור *" options={subjectOptions} selected={form.subject ? [form.subject] : []}
                    onChange={v => setForm(p => ({ ...p, subject: v[v.length - 1] || "" }))} />
                  <ChipPicker label="סגנון שיעור" options={LESSON_STYLES} selected={form.lesson_style ? [form.lesson_style] : []}
                    onChange={v => setForm(p => ({ ...p, lesson_style: v[v.length - 1] || "" }))} />
                  <ChipPicker label="סגנון דיבור" options={speakingStyleOptions} selected={form.speaking_style ? [form.speaking_style] : []}
                    onChange={v => setForm(p => ({ ...p, speaking_style: v[v.length - 1] || "" }))} />
                  <div>
                    <label className="text-sm font-medium mb-1 block">שפה</label>
                    <Select value={form.language} onValueChange={v => setForm(p => ({ ...p, language: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <ChipPicker label="קהל יעד" options={AUDIENCE_TYPES} selected={form.target_audience} onChange={v => setForm(p => ({ ...p, target_audience: v }))} />
                  <Button onClick={() => setStep(2)} className="w-full bg-secondary text-secondary-foreground">המשך →</Button>
                </>)}

                {step === 2 && (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">עיר</label>
                      <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="ירושלים" /></div>
                    <div><label className="text-sm font-medium mb-1 block">שכונה</label>
                      <Input value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} placeholder="רמות" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">רחוב</label>
                      <Input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium mb-1 block">מספר</label>
                      <Input value={form.street_number} onChange={e => setForm(p => ({ ...p, street_number: e.target.value }))} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">בית כנסת / מקום</label>
                    <Input value={form.synagogue_name} onChange={e => setForm(p => ({ ...p, synagogue_name: e.target.value }))} /></div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_recurring} onCheckedChange={v => setForm(p => ({ ...p, is_recurring: v }))} />
                    <label className="text-sm font-medium">{form.is_recurring ? "שיעור קבוע" : "שיעור חד-פעמי"}</label>
                  </div>
                  {form.is_recurring ? (
                    <>
                      <div><label className="text-sm font-medium mb-2 block">ימים</label>
                        <div className="flex flex-wrap gap-2">
                          {DAY_NAMES.map(d => (
                            <label key={d} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all ${form.schedule_days.includes(d) ? "border-secondary bg-secondary/10" : "border-border"}`}>
                              <Checkbox checked={form.schedule_days.includes(d)} onCheckedChange={() => toggleDay(d)} />{d}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div><label className="text-sm font-medium mb-1 block">שעת שיעור</label>
                        <Input value={form.schedule_time} onChange={e => setForm(p => ({ ...p, schedule_time: e.target.value }))} placeholder="20:00" /></div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-medium mb-1 block">תאריך</label>
                        <Input type="date" value={form.specific_date} onChange={e => setForm(p => ({ ...p, specific_date: e.target.value }))} /></div>
                      <div><label className="text-sm font-medium mb-1 block">שעה</label>
                        <Input value={form.schedule_time} onChange={e => setForm(p => ({ ...p, schedule_time: e.target.value }))} placeholder="20:00" /></div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← חזור</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-secondary text-secondary-foreground">המשך →</Button>
                  </div>
                </>)}

                {step === 3 && (<>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><Switch checked={form.is_recorded} onCheckedChange={v => setForm(p => ({ ...p, is_recorded: v }))} /><Mic className="w-4 h-4" /><span className="text-sm">מוקלט</span></div>
                    <div className="flex items-center gap-2"><Switch checked={form.is_live_stream} onCheckedChange={v => setForm(p => ({ ...p, is_live_stream: v }))} /><Video className="w-4 h-4" /><span className="text-sm">שידור חי</span></div>
                  </div>
                  {form.is_recorded && (
                    <div><label className="text-sm font-medium mb-1 block">מיקום הקלטה</label>
                      <Input value={form.recording_location} onChange={e => setForm(p => ({ ...p, recording_location: e.target.value }))} placeholder="קישור או מיקום" /></div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">טלפון הרב</label>
                      <Input value={form.rabbi_phone} onChange={e => setForm(p => ({ ...p, rabbi_phone: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium mb-1 block">תפקיד</label>
                      <Input value={form.rabbi_role} onChange={e => setForm(p => ({ ...p, rabbi_role: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">איש קשר</label>
                      <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium mb-1 block">טלפון</label>
                      <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium mb-1 block">מייל</label>
                      <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-1 block">קישור לתרומה</label>
                    <Input value={form.donation_link} onChange={e => setForm(p => ({ ...p, donation_link: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium mb-1 block">הערות</label>
                    <Input value={form.schedule_notes} onChange={e => setForm(p => ({ ...p, schedule_notes: e.target.value }))} /></div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← חזור</Button>
                    <Button onClick={handleAdd} className="flex-1 bg-secondary text-secondary-foreground hover:bg-gold-dark">שמור שיעור ✓</Button>
                  </div>
                </>)}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {lessons.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-foreground text-lg">{l.subject}</h3>
                    {l.lesson_style && <Badge variant="outline" className="text-xs">{l.lesson_style}</Badge>}
                    {l.is_recorded && <Badge variant="secondary" className="text-xs"><Mic className="w-3 h-3 ml-1" />מוקלט</Badge>}
                    {l.is_live_stream && <Badge variant="secondary" className="text-xs"><Video className="w-3 h-3 ml-1" />חי</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {l.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{l.city} {l.neighborhood || ""} {l.street ? `- ${l.street} ${l.street_number || ""}` : ""}</span>}
                    {l.schedule_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{l.schedule_time}</span>}
                    {l.language && l.language !== "עברית" && <span>🌐 {l.language}</span>}
                  </div>
                  {l.schedule_days?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {l.schedule_days.map((d: string) => (
                        <span key={d} className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full">{d}</span>
                      ))}
                    </div>
                  )}
                  {l.synagogue_name && <p className="text-sm text-muted-foreground mt-1">📍 {l.synagogue_name}</p>}
                  {l.target_audience?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {l.target_audience.map((a: string) => (
                        <span key={a} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 mr-3">
                  <Button size="sm" variant={l.is_active ? "outline" : "default"} onClick={() => toggleActive(l.id, l.is_active)}>
                    {l.is_active ? "השבת" : "הפעל"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
          {lessons.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">אין שיעורים עדיין</h3>
              <p className="text-muted-foreground">הוסף את השיעור הראשון שלך!</p>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default Lessons;