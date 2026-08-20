import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Edit3, Save, X, Plus, Clock, MapPin, Phone, Mail, Video, Radio, Trash2, CheckCircle, Upload, Image, Settings, MessageCircle, Users, Globe, Calendar, UserCircle, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { formatHebrewDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const RabbiPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [portal, setPortal] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [addingNew, setAddingNew] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const newLessonTemplate = {
    subject: "", city: "", neighborhood: "", street: "", street_number: "",
    synagogue_name: "", language: "עברית", target_audience: [], audience_type: [],
    lesson_style: "", rabbi_role: "", rabbi_phone: "", contact_name: "", contact_phone: "",
    contact_email: "", donation_link: "", schedule_days: [], schedule_notes: "",
    is_recurring: false, is_recorded: false, is_live_stream: false, recording_location: "",
    submitter_notes: "", status: "pending", is_approved: false, org_name: "",
  };

  useEffect(() => {
    if (token) fetchPortal();
  }, [token]);

  const fetchPortal = async () => {
    setLoading(true);
    const { data: portalData, error } = await supabase
      .from("rabbi_portals")
      .select("*")
      .eq("access_token", token)
      .single();

    if (error || !portalData) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setPortal(portalData);

    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("*")
      .eq("rabbi_name", portalData.rabbi_name)
      .order("created_at", { ascending: false });

    setLessons(lessonsData || []);
    setLoading(false);
  };

  const uploadLogo = async (file: File) => {
    if (!portal) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `rabbi-logos/${portal.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("lesson-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("lesson-logos").getPublicUrl(path);
      const logoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from("rabbi_portals").update({ logo_url: logoUrl }).eq("id", portal.id);
      if (updateError) throw updateError;
      setPortal({ ...portal, logo_url: logoUrl });
      toast.success("הלוגו עודכן בהצלחה!");
    } catch (e) {
      toast.error("שגיאה בהעלאת הלוגו");
    }
    setUploadingLogo(false);
  };

  const startEdit = (lesson: any) => {
    setEditingId(lesson.id);
    setEditData({ ...lesson });
  };

  const saveEdit = async () => {
    if (!editingId || savingLesson) return;
    setSavingLesson(true);
    try {
      const { id, created_at, updated_at, ...fields } = editData;
      const { error } = await supabase.from("lessons").update(fields).eq("id", editingId);
      if (!error) {
        toast.success("השיעור עודכן בהצלחה!");
        setLessons(prev => prev.map(l => l.id === editingId ? { ...l, ...fields } : l));
        setEditingId(null);
      } else toast.error("שגיאה בעדכון");
    } finally {
      setSavingLesson(false);
    }
  };

  const addLesson = async () => {
    if (!portal || savingLesson) return;
    const row = { ...editData, rabbi_name: portal.rabbi_name, logo_url: portal.logo_url || "" };
    if (!row.subject || !row.city) { toast.error("נושא ועיר הם שדות חובה"); return; }
    setSavingLesson(true);
    try {
      const { data, error } = await supabase.from("lessons").insert(row).select().single();
      if (!error && data) {
        toast.success("שיעור חדש נוסף! ממתין לאישור.");
        setLessons(prev => [data, ...prev]);
        setAddingNew(false);
        setEditData({});
      } else toast.error("שגיאה בהוספה");
    } finally {
      setSavingLesson(false);
    }
  };

  const lastUpdate = lessons.length > 0
    ? formatHebrewDate(new Date(Math.max(...lessons.map(l => new Date(l.updated_at).getTime()))).toISOString(), true)
    : null;

  const featuresEnabled = portal?.features_enabled as any;
  const settingsEnabled = featuresEnabled?.settings !== false; // default true for existing portals

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
              <div
                className="relative group cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="החלפת לוגו"
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); logoInputRef.current?.click(); } }}
              >
                <img src={portal.logo_url} alt={portal.rabbi_name ? `לוגו ${portal.rabbi_name}` : "לוגו"} className="w-10 h-10 rounded-xl object-contain" />
                <div className="absolute inset-0 bg-navy/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-4 h-4 text-gold" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-gold/60" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()} className="text-gold hover:text-gold text-xs gap-1">
                  <Image className="w-3.5 h-3.5" /> העלאת לוגו
                </Button>
              </div>
            )}
            <div>
              <h1 className="font-display text-lg font-black text-primary-foreground">{portal?.rabbi_name}</h1>
              <p className="font-body text-xs text-primary-foreground/60">ניהול שיעורים</p>
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
        <div className="container mx-auto px-6 mt-4 max-w-4xl">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-900 px-5 py-4 shadow-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="font-body text-sm font-bold">⚠️ קישור ניהול זה אינו להפצה</p>
            </div>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs text-green-700 font-bold mb-1">📢 הקישור להפצה לציבור:</p>
                <p className="font-body text-xs text-green-800 truncate">{`${window.location.origin}/view/rabbi/${portal.public_token}`}</p>
              </div>
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100 gap-1 text-xs"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/view/rabbi/${portal.public_token}`); toast.success("קישור ההפצה הועתק!"); }}>
                <Copy className="w-3 h-3" /> העתק
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-teal">{lessons.length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">סה"כ שיעורים</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-green-600">{lessons.filter(l => l.is_approved).length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">מאושרים</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
            <p className="font-display text-3xl font-black text-amber-600">{lessons.filter(l => l.status === "pending").length}</p>
            <p className="font-body text-xs text-gray-500 font-semibold">ממתינים</p>
          </div>
        </div>

        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList className="bg-navy/5 border border-border p-1 rounded-xl">
            <TabsTrigger value="lessons" className="font-body font-bold data-[state=active]:bg-gradient-teal data-[state=active]:text-primary-foreground rounded-lg">
              שיעורים ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="font-body font-bold data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground rounded-lg">
              <MessageCircle className="w-4 h-4 ml-1" /> פניות
            </TabsTrigger>
            {settingsEnabled && (
              <TabsTrigger value="settings" className="font-body font-bold data-[state=active]:bg-gradient-gold data-[state=active]:text-navy rounded-lg">
                <Settings className="w-4 h-4 ml-1" /> הגדרות
              </TabsTrigger>
            )}
          </TabsList>

          {/* Lessons Tab */}
          <TabsContent value="lessons">
            <SynagogueExcelImportExport
              mode="rabbi"
              rabbiName={portal?.rabbi_name}
              logoUrl={portal?.logo_url}
              onImported={fetchPortal}
            />
            <Button
              onClick={() => { setAddingNew(true); setEditData({ ...newLessonTemplate }); }}
              className="w-full mb-6 bg-gradient-gold text-navy font-display font-black py-6 rounded-2xl gap-2 hover:opacity-90 text-lg"
            >
              <Plus className="w-5 h-5" />
              הוספת שיעור חדש
            </Button>

            <AnimatePresence>
              {addingNew && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                  <div className="bg-card rounded-2xl border-2 border-gold/30 p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display text-lg font-black text-gold">שיעור חדש</h3>
                      <Button variant="ghost" size="icon" aria-label="ביטול" onClick={() => setAddingNew(false)}><X className="w-4 h-4" /></Button>
                    </div>
                    <PortalLessonForm data={editData} onChange={setEditData} />
                    <Button onClick={addLesson} disabled={savingLesson} className="w-full bg-gradient-teal text-primary-foreground font-body font-bold py-5 gap-2">
                      <Save className="w-5 h-5" /> {savingLesson ? "שומר..." : "שמור שיעור חדש"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {lessons.map(lesson => (
                <motion.div key={lesson.id} layout className="bg-card rounded-2xl border-2 border-border hover:border-gold/20 transition-all overflow-hidden">
                  {editingId === lesson.id ? (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-black text-teal">עריכת שיעור</h3>
                        <Button variant="ghost" size="icon" aria-label="ביטול עריכה" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      </div>
                      <PortalLessonForm data={editData} onChange={setEditData} />
                      <Button onClick={saveEdit} disabled={savingLesson} className="w-full bg-gradient-brand text-primary-foreground font-body font-bold py-5 gap-2">
                        <Save className="w-5 h-5" /> {savingLesson ? "שומר..." : "שמור שינויים"}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-display text-lg font-black text-card-foreground">{lesson.subject}</h3>
                            <Badge className={`font-body text-xs ${lesson.is_approved ? "bg-teal/15 text-teal" : lesson.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-gold/15 text-gold"}`}>
                              {lesson.is_approved ? "מאושר" : lesson.status === "rejected" ? "נדחה" : "ממתין"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 font-body text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lesson.city}</span>
                            {lesson.synagogue_name && <span>🏛️ {lesson.synagogue_name}</span>}
                            {lesson.is_recorded && <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />מוקלט</span>}
                            {lesson.is_live_stream && <span className="flex items-center gap-1"><Radio className="w-3.5 h-3.5" />שידור חי</span>}
                          </div>
                          {lesson.is_recurring && lesson.schedule_days?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(lesson.schedule_days as any[]).map((d: any, i: number) => (
                                <Badge key={i} variant="outline" className="font-body text-xs">{d.day} {d.time}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => startEdit(lesson)} className="gap-1 border-gold/30 text-gold hover:bg-gold/10 font-body">
                          <Edit3 className="w-3.5 h-3.5" /> עריכה
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {lessons.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="font-display text-xl font-black text-muted-foreground">אין שיעורים עדיין</p>
                  <p className="font-body text-sm text-muted-foreground/60">לחצו "הוספת שיעור חדש" כדי להתחיל</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          {portal && (
            <TabsContent value="messages">
              <PortalMessagesTab portalId={portal.id} portalType="rabbi" />
            </TabsContent>
          )}

          {/* Settings Tab */}
          {settingsEnabled && portal && (
            <TabsContent value="settings">
              <PortalSettingsTab
                portalId={portal.id}
                portalType="rabbi"
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

export default RabbiPortal;
