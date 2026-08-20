import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Edit3, Save, X, Plus, Clock, MapPin, Users, Video, Radio, UserPlus, Trash2, Upload, Image, Settings, MessageCircle, Building2, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { formatHebrewDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PrayerTimesTab from "@/components/portal/PrayerTimesTab";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import PortalSettingsTab from "@/components/portal/PortalSettingsTab";
import PortalMessagesTab from "@/components/portal/PortalMessagesTab";
import PortalLessonForm from "@/components/portal/PortalLessonForm";
import SynagogueExcelImportExport from "@/components/synagogue/SynagogueExcelImportExport";

const OrgPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<any>(null);
  const [rabbis, setRabbis] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [addingNew, setAddingNew] = useState(false);
  const [newRabbiName, setNewRabbiName] = useState("");
  const [selectedRabbi, setSelectedRabbi] = useState<string>("all");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (token) fetchPortal(); }, [token]);

  const fetchPortal = async () => {
    setLoading(true);
    const { data: portalData, error } = await supabase
      .from("org_portals")
      .select("*")
      .eq("access_token", token)
      .single();

    if (error || !portalData) { setNotFound(true); setLoading(false); return; }
    setPortal(portalData);

    const { data: rabbisData } = await supabase
      .from("org_rabbis")
      .select("*")
      .eq("org_id", portalData.id)
      .order("created_at", { ascending: false });
    setRabbis(rabbisData || []);

    const rabbiNames = (rabbisData || []).map((r: any) => r.rabbi_name);
    if (rabbiNames.length > 0) {
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .in("rabbi_name", rabbiNames)
        .order("created_at", { ascending: false });
      setLessons(lessonsData || []);
    }
    setLoading(false);
  };

  const uploadLogo = async (file: File) => {
    if (!portal) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `org-logos/${portal.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("lesson-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("lesson-logos").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from("org_portals").update({ logo_url: logoUrl }).eq("id", portal.id);
      if (updateError) throw updateError;
      setPortal({ ...portal, logo_url: logoUrl });
      toast.success("הלוגו עודכן בהצלחה!");
    } catch (e) {
      toast.error("שגיאה בהעלאת הלוגו");
    }
    setUploadingLogo(false);
  };

  const addRabbi = async () => {
    if (!newRabbiName.trim() || !portal) return;
    const { data, error } = await supabase
      .from("org_rabbis")
      .insert({ org_id: portal.id, rabbi_name: newRabbiName.trim() })
      .select()
      .single();
    if (!error && data) {
      setRabbis(prev => [data, ...prev]);
      setNewRabbiName("");
      toast.success("הרב נוסף לארגון!");
    } else toast.error("שגיאה בהוספת רב");
  };

  const removeRabbi = async (id: string) => {
    const { error } = await supabase.from("org_rabbis").delete().eq("id", id);
    if (!error) {
      setRabbis(prev => prev.filter(r => r.id !== id));
      toast.success("הרב הוסר");
    }
  };

  const startEdit = (lesson: any) => { setEditingId(lesson.id); setEditData({ ...lesson }); };

  const saveEdit = async () => {
    if (!editingId) return;
    const { id, created_at, updated_at, ...fields } = editData;
    const { error } = await supabase.from("lessons").update(fields).eq("id", editingId);
    if (!error) {
      toast.success("השיעור עודכן!");
      setLessons(prev => prev.map(l => l.id === editingId ? { ...l, ...fields } : l));
      setEditingId(null);
    } else toast.error("שגיאה");
  };

  const addLesson = async () => {
    if (!editData.rabbi_name || !editData.subject || !editData.city) {
      toast.error("שם הרב, נושא ועיר הם חובה");
      return;
    }
    const row = { ...editData, org_name: portal?.org_name || "", logo_url: portal?.logo_url || "" };
    const { data, error } = await supabase.from("lessons").insert(row).select().single();
    if (!error && data) {
      toast.success("שיעור חדש נוסף!");
      setLessons(prev => [data, ...prev]);
      setAddingNew(false);
      setEditData({});
    } else toast.error("שגיאה");
  };

  const filteredLessons = selectedRabbi === "all" ? lessons : lessons.filter(l => l.rabbi_name === selectedRabbi);

  const lastUpdate = lessons.length > 0
    ? formatHebrewDate(new Date(Math.max(...lessons.map(l => new Date(l.updated_at).getTime()))).toISOString(), true)
    : null;

  const featuresEnabled = portal?.features_enabled as any;
  const settingsEnabled = featuresEnabled?.settings !== false;
  const prayerTimesEnabled = featuresEnabled?.prayer_times === true;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
      <div>
        <h1 className="font-display text-3xl font-black text-card-foreground mb-4">קישור לא תקין</h1>
        <p className="font-body text-muted-foreground">הקישור שקיבלת אינו תקף. פנה למערכת לקבלת קישור חדש.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-navy/95 backdrop-blur-xl border-b border-gold/20">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {portal?.logo_url ? (
              <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                <img src={portal.logo_url} alt="" className="w-10 h-10 rounded-xl object-contain" />
                <div className="absolute inset-0 bg-navy/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-4 h-4 text-gold" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gold/60" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()} className="text-gold/60 hover:text-gold text-xs gap-1">
                  <Image className="w-3.5 h-3.5" /> העלאת לוגו
                </Button>
              </div>
            )}
            <div>
              <h1 className="font-display text-lg font-black text-primary-foreground">{portal?.org_name}</h1>
              <p className="font-body text-xs text-primary-foreground/60">ניהול שיעורי הארגון</p>
            </div>
          </div>
          {lastUpdate && (
            <div className="flex items-center gap-2 text-primary-foreground/50 font-body text-xs">
              <Clock className="w-3.5 h-3.5" />
              עדכון אחרון: {lastUpdate}
            </div>
          )}
        </div>
      </div>

      {/* Private link warning + public link */}
      {portal?.public_token && (
        <div className="container mx-auto px-6 mt-4 max-w-5xl">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-900 px-5 py-4 shadow-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="font-body text-sm font-bold">⚠️ קישור ניהול זה אינו להפצה</p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-green-700 font-bold mb-1">📢 הקישור להפצה לציבור:</p>
                <p className="font-body text-xs text-green-800 truncate">{`${window.location.origin}/view/org/${portal.public_token}`}</p>
              </div>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100 gap-1 text-xs"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/view/org/${portal.public_token}`); toast.success("קישור ההפצה הועתק!"); }}>
                <Copy className="w-3 h-3" /> העתק
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-teal">{lessons.length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">שיעורים</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-amber-600">{rabbis.length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">רבנים</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-green-600">{lessons.filter(l => l.is_approved).length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">מאושרים</p>
          </div>
        </div>

        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="bg-navy/5 border border-border p-1 rounded-xl">
            <TabsTrigger value="lessons" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg">
              שיעורים ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="rabbis" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg">
              רבנים ({rabbis.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="font-body font-bold data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground rounded-lg">
              <MessageCircle className="w-4 h-4 ml-1" /> פניות
            </TabsTrigger>
            {prayerTimesEnabled && (
              <TabsTrigger value="prayer_times" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg">
                <Clock className="w-4 h-4 ml-1" /> זמני תפילות
              </TabsTrigger>
            )}
            {settingsEnabled && (
              <TabsTrigger value="settings" className="font-body font-bold data-[state=active]:bg-navy data-[state=active]:text-primary-foreground rounded-lg">
                <Settings className="w-4 h-4 ml-1" /> הגדרות
              </TabsTrigger>
            )}
          </TabsList>

          {/* Rabbis Tab */}
          <TabsContent value="rabbis">
            <div className="bg-card rounded-2xl border border-border p-6 mb-4">
              <h3 className="font-display text-lg font-black text-card-foreground mb-4">הוספת רב חדש</h3>
              <div className="flex gap-3">
                <Input
                  value={newRabbiName}
                  onChange={e => setNewRabbiName(e.target.value)}
                  placeholder="שם הרב..."
                  className="flex-1 border-gold/20 focus:border-gold/50"
                />
                <Button onClick={addRabbi} className="bg-gradient-gold text-navy font-body font-bold gap-2">
                  <UserPlus className="w-4 h-4" /> הוסף
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {rabbis.map(r => (
                <div key={r.id} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                      <Users className="w-5 h-5 text-navy" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-card-foreground">{r.rabbi_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{lessons.filter(l => l.rabbi_name === r.rabbi_name).length} שיעורים</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeRabbi(r.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons">
            <SynagogueExcelImportExport
              mode="org"
              orgName={portal?.org_name}
              logoUrl={portal?.logo_url}
              onImported={fetchPortal}
            />
            {rabbis.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  onClick={() => setSelectedRabbi("all")}
                  className={`cursor-pointer font-body ${selectedRabbi === "all" ? "bg-gradient-teal text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  הכל
                </Badge>
                {rabbis.map(r => (
                  <Badge
                    key={r.id}
                    onClick={() => setSelectedRabbi(r.rabbi_name)}
                    className={`cursor-pointer font-body ${selectedRabbi === r.rabbi_name ? "bg-gradient-gold text-navy" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {r.rabbi_name}
                  </Badge>
                ))}
              </div>
            )}

            <Button
              onClick={() => { setAddingNew(true); setEditData({ subject: "", city: "", neighborhood: "", street: "", street_number: "", synagogue_name: "", rabbi_name: rabbis[0]?.rabbi_name || "", language: "עברית", target_audience: [], audience_type: [], lesson_style: "", rabbi_role: "", rabbi_phone: "", contact_name: "", contact_phone: "", contact_email: "", donation_link: "", schedule_days: [], schedule_notes: "", is_recurring: false, is_recorded: false, is_live_stream: false, recording_location: "", submitter_notes: "", status: "pending", is_approved: false, org_name: portal?.org_name || "" }); }}
              className="w-full mb-6 bg-gradient-gold text-navy font-display font-black py-6 rounded-2xl gap-2 hover:opacity-90 text-lg"
            >
              <Plus className="w-5 h-5" /> הוספת שיעור חדש
            </Button>

            <AnimatePresence>
              {addingNew && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                  <div className="bg-card rounded-2xl border-2 border-gold/30 p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg font-black text-gold">שיעור חדש</h3>
                      <Button variant="ghost" size="icon" onClick={() => setAddingNew(false)}><X className="w-4 h-4" /></Button>
                    </div>
                    <div>
                      <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">שם הרב *</label>
                      <select
                        value={editData.rabbi_name || ""}
                        onChange={e => setEditData({ ...editData, rabbi_name: e.target.value })}
                        className="w-full rounded-md border border-gold/20 bg-background px-3 py-2 text-sm font-body"
                      >
                        <option value="">בחר רב...</option>
                        {rabbis.map(r => <option key={r.id} value={r.rabbi_name}>{r.rabbi_name}</option>)}
                      </select>
                    </div>
                    <PortalLessonForm data={editData} onChange={setEditData} />
                    <Button onClick={addLesson} className="w-full bg-gradient-teal text-primary-foreground font-body font-bold py-5 gap-2">
                      <Save className="w-5 h-5" /> שמור
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {filteredLessons.map(lesson => (
                <motion.div key={lesson.id} layout className="bg-card rounded-2xl border-2 border-border hover:border-gold/20 transition-all overflow-hidden">
                  {editingId === lesson.id ? (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-black text-teal">עריכת שיעור</h3>
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                      <PortalLessonForm data={editData} onChange={setEditData} />
                      <Button onClick={saveEdit} className="w-full bg-gradient-brand text-primary-foreground font-body font-bold py-5 gap-2">
                        <Save className="w-5 h-5" /> שמור שינויים
                      </Button>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-display text-lg font-black text-card-foreground">{lesson.subject}</h3>
                            <Badge variant="outline" className="font-body text-xs">{lesson.rabbi_name}</Badge>
                            <Badge className={`font-body text-xs ${lesson.is_approved ? "bg-teal/15 text-teal" : "bg-gold/15 text-gold"}`}>
                              {lesson.is_approved ? "מאושר" : "ממתין"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 font-body text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lesson.city}</span>
                            {lesson.synagogue_name && <span>🏛️ {lesson.synagogue_name}</span>}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => startEdit(lesson)} className="gap-1 border-gold/30 text-gold hover:bg-gold/10 font-body">
                          <Edit3 className="w-3.5 h-3.5" /> עריכה
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>
          {/* Messages Tab */}
          {portal && (
            <TabsContent value="messages">
              <PortalMessagesTab portalId={portal.id} portalType="org" />
            </TabsContent>
          )}

          {/* Prayer Times Tab */}
          {prayerTimesEnabled && portal && (
            <TabsContent value="prayer_times">
              <PrayerTimesTab orgId={portal.id} />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {settingsEnabled && portal && (
            <TabsContent value="settings">
              <PortalSettingsTab
                portalId={portal.id}
                portalType="org"
                portalData={portal}
                onUpdate={(data) => setPortal(data)}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="bg-navy/50 border-t border-border mt-16 py-6 text-center">
        <p className="font-body text-xs text-muted-foreground">איגוד השיעורים • שיעורי תורה, חברותות והרצאות</p>
      </div>
    </div>
  );
};

export default OrgPortal;
