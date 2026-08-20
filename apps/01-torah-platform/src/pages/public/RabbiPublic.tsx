import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, MapPin, Clock, Phone, Mail, Send, Building2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BACKGROUND_PRESETS } from "@/types/portalDesign";

const RabbiPublic = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [synagogues, setSynagogues] = useState<any[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactForm, setContactForm] = useState({ sender_name: "", sender_phone: "", sender_email: "", message: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) fetchRabbi();
  }, [id]);

  const fetchRabbi = async () => {
    // Try to find profile by public_token or id
    let query = supabase.from("profiles").select("*").eq("is_approved", true);
    const { data: byToken } = await query.eq("public_token", id).maybeSingle();
    const profile = byToken || (await supabase.from("profiles").select("*").eq("id", id).eq("is_approved", true).maybeSingle()).data;
    
    if (!profile) { setLoading(false); return; }
    setProfile(profile);

    const { data: lessonsData } = await supabase.from("lessons").select("*").eq("teacher_id", profile.id).eq("is_active", true);
    setLessons(lessonsData || []);

    const { data: syns } = await supabase.from("synagogues").select("*").eq("teacher_id", profile.id);
    setSynagogues(syns || []);
    if (syns && syns.length > 0) {
      const { data: pts } = await supabase.from("prayer_times").select("*").in("synagogue_id", syns.map(s => s.id));
      setPrayerTimes(pts || []);
    }

    const { data: photosData } = await supabase.from("portal_photos").select("*").eq("teacher_id", profile.id);
    setPhotos(photosData || []);

    setLoading(false);
  };

  const handleContact = async () => {
    if (!contactForm.sender_name || !contactForm.sender_phone) { toast.error("נא למלא שם וטלפון"); return; }
    setSending(true);
    const { error } = await supabase.from("portal_messages").insert({
      teacher_id: profile.id,
      ...contactForm,
    });
    setSending(false);
    if (error) { toast.error("שגיאה בשליחה"); return; }
    toast.success("הפנייה נשלחה בהצלחה!");
    setContactForm({ sender_name: "", sender_phone: "", sender_email: "", message: "" });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-secondary border-t-transparent rounded-full" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">הדף לא נמצא</h1>
        <p className="text-muted-foreground">ייתכן שהדף הוסר או שהכתובת שגויה</p>
      </div>
    </div>
  );

  const preset = BACKGROUND_PRESETS.find(b => b.id === profile.background_preset);
  const bgStyle: React.CSSProperties = profile.custom_background_url
    ? { backgroundImage: `url(${profile.custom_background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : preset
    ? { background: preset.css }
    : {};
  const isLight = profile.font_color !== "dark";
  const heroTextClass = isLight ? "text-white" : "text-slate-900";
  const heroSubClass = isLight ? "text-white/80" : "text-slate-700";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <div className={`py-12 px-4 ${heroTextClass}`} style={bgStyle}>
        <div className="max-w-4xl mx-auto text-center">
          {profile.rabbi_photo_url && (
            <img src={profile.rabbi_photo_url} alt={profile.full_name} className="w-28 h-28 rounded-full mx-auto mb-4 border-4 border-secondary object-cover" />
          )}
          {profile.logo_url && !profile.rabbi_photo_url && (
            <img src={profile.logo_url} alt="לוגו" className="w-20 h-20 mx-auto mb-4" />
          )}
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">{profile.full_name}</h1>
          {profile.city && <p className={`${heroSubClass} flex items-center justify-center gap-1`}><MapPin className="w-4 h-4" />{profile.city} {profile.neighborhood || ""}</p>}
          {profile.about_text && <p className={`mt-4 max-w-2xl mx-auto ${heroSubClass}`}>{profile.about_text}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Lessons */}
        {lessons.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" />השיעורים
            </h2>
            <div className="grid gap-3">
              {lessons.map(l => (
                <div key={l.id} className="bg-card rounded-xl border border-border p-4">
                  <h3 className="font-bold text-foreground">{l.subject}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {l.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.city} {l.neighborhood || ""}</span>}
                    {l.schedule_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{l.schedule_time}</span>}
                    {l.synagogue_name && <span>📍 {l.synagogue_name}</span>}
                  </div>
                  {l.schedule_days?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {l.schedule_days.map((d: string) => (
                        <span key={d} className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Prayer Times */}
        {synagogues.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-secondary" />בתי כנסת וזמני תפילות
            </h2>
            {synagogues.map(syn => {
              const synPrayers = prayerTimes.filter(p => p.synagogue_id === syn.id);
              return (
                <div key={syn.id} className="bg-card rounded-xl border border-border p-4 mb-3">
                  <h3 className="font-bold text-foreground">{syn.name}</h3>
                  {syn.address && <p className="text-sm text-muted-foreground">📍 {syn.address}</p>}
                  {synPrayers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {synPrayers.map(pt => (
                        <span key={pt.id} className="bg-muted/50 text-foreground text-xs px-3 py-1.5 rounded-lg">
                          {pt.prayer_type} {pt.time} {pt.day_of_week !== "יומי" && `(${pt.day_of_week})`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-heading text-xl font-bold text-foreground mb-4">גלריה</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map(p => (
                <img key={p.id} src={p.image_url} alt={p.caption || ""} className="rounded-xl w-full h-40 object-cover" />
              ))}
            </div>
          </motion.section>
        )}

        {/* Contact Form */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-secondary" />יצירת קשר
          </h2>
          <div className="space-y-3">
            <Input placeholder="שם מלא *" value={contactForm.sender_name} onChange={e => setContactForm(p => ({ ...p, sender_name: e.target.value }))} />
            <Input placeholder="טלפון *" value={contactForm.sender_phone} onChange={e => setContactForm(p => ({ ...p, sender_phone: e.target.value }))} />
            <Input placeholder="מייל" value={contactForm.sender_email} onChange={e => setContactForm(p => ({ ...p, sender_email: e.target.value }))} />
            <Textarea placeholder="הודעה" value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} rows={3} />
            <Button onClick={handleContact} disabled={sending} className="w-full bg-secondary text-secondary-foreground hover:bg-gold-dark">
              {sending ? "שולח..." : "שלח פנייה"}
            </Button>
          </div>
        </motion.section>

        {/* Contact Info */}
        {(profile.phone || profile.email || profile.contact_whatsapp) && (
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            {profile.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /><span dir="ltr">{profile.phone}</span></span>}
            {profile.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /><span dir="ltr">{profile.email}</span></span>}
            {profile.contact_whatsapp && <span className="flex items-center gap-1"><Globe className="w-4 h-4" />WhatsApp: <span dir="ltr">{profile.contact_whatsapp}</span></span>}
          </div>
        )}

        {/* Donation Link */}
        {profile.donation_link && (
          <div className="text-center">
            <a href={profile.donation_link} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-secondary text-secondary">🎁 תרומה</Button>
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-8 border-t border-border">
          בסיוע איגוד השיעורים 023131600
        </div>
      </div>
    </div>
  );
};

export default RabbiPublic;