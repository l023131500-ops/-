import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Video, Radio, Globe, Mic, Mail, Phone, MessageSquare, FileText, Heart, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BACKGROUND_PRESETS } from "@/components/portal/PortalSettingsTab";
import LessonDetailModal from "@/components/LessonDetailModal";
import PublicContactForm from "@/components/portal/PublicContactForm";

const PublicRabbiPage = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [portal, setPortal] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  useEffect(() => {
    if (!publicToken) return;
    let cancelled = false;
    fetchData(publicToken, () => cancelled);
    return () => { cancelled = true; };
  }, [publicToken]);

  const fetchData = async (token: string, isCancelled: () => boolean) => {
    const { data: portalData, error } = await supabase
      .from("rabbi_portals")
      .select("id,rabbi_name,about_text,rabbi_photo_url,logo_url,donation_link,lesson_download_url,background_preset,font_color,custom_background_url,custom_sections,contact_phone,contact_whatsapp,contact_email,contact_fax,contact_address,contact_mailing_address")
      .eq("public_token", token)
      .single();

    if (isCancelled()) return;
    if (error || !portalData) { setNotFound(true); setLoading(false); return; }
    setPortal(portalData);

    const [lessonsRes, photosRes] = await Promise.all([
      supabase.from("lessons").select("*").eq("rabbi_name", portalData.rabbi_name).eq("is_approved", true).order("created_at", { ascending: false }),
      supabase.from("portal_photos").select("*").eq("portal_type", "rabbi").eq("portal_id", portalData.id).order("created_at", { ascending: false }),
    ]);
    if (isCancelled()) return;
    setLessons(lessonsRes.data || []);
    setPhotos(photosRes.data || []);
    setLoading(false);
  };

  const bgPreset = BACKGROUND_PRESETS.find(p => p.id === portal?.background_preset);
  const bgClass = bgPreset?.css || "bg-gradient-to-br from-[hsl(220,40%,13%)] via-[hsl(220,35%,18%)] to-[hsl(40,60%,20%)]";
  const customBg = portal?.custom_background_url;
  const fontColorClass = portal?.font_color === "dark" ? "text-gray-900" : "text-white";
  const fontColorMuted = portal?.font_color === "dark" ? "text-gray-600" : "text-white/70";

  const hasContactInfo = portal?.contact_phone || portal?.contact_email || portal?.contact_address || portal?.contact_whatsapp || portal?.contact_fax || portal?.contact_mailing_address;
  const customSections: { title: string; content: string }[] = Array.isArray(portal?.custom_sections) ? portal.custom_sections : [];

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
      <div>
        <h1 className="font-display text-3xl font-black text-card-foreground mb-4">הדף לא נמצא</h1>
        <p className="font-body text-muted-foreground">הקישור אינו תקף או שפג תוקפו.</p>
      </div>
    </div>
  );

  const logoSrc = portal?.logo_url || portal?.rabbi_photo_url;

  return (
    <div className={`min-h-screen ${!customBg ? bgClass : ""}`} dir="rtl"
      style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" } : undefined}
    >
      {customBg && <div className="fixed inset-0 bg-navy/70 z-0" />}

      <div className="relative z-10">
        {/* Hero */}
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16">
          <div className="flex flex-col items-center text-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.3 }} className="relative mb-8">
              <div className="absolute -inset-4 rounded-2xl border-2 border-gold/20 animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute -inset-6 rounded-2xl border border-gold/10 animate-[pulse_4s_ease-in-out_infinite_0.5s]" />
              {logoSrc ? (
                <img src={logoSrc} alt={portal?.rabbi_name ? `תמונת פרופיל ${portal.rabbi_name}` : "תמונת פרופיל"} className="w-[140px] h-[140px] rounded-2xl object-cover border-4 border-gold/30 shadow-2xl" />
              ) : (
                <div className="w-[140px] h-[140px] rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center border-4 border-gold/30 shadow-2xl">
                  <Mic className="w-14 h-14 text-gold" />
                </div>
              )}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className={`font-display text-4xl md:text-5xl font-black ${fontColorClass} mb-2 drop-shadow-lg`}>
              {portal?.rabbi_name}
            </motion.h1>
            {portal?.about_text && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className={`font-body ${fontColorMuted} max-w-xl mt-4 text-lg leading-relaxed`}>
                {portal.about_text}
              </motion.p>
            )}

            {/* Donation & Download buttons */}
            {(portal?.donation_link || portal?.lesson_download_url) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex gap-3 mt-6">
                {portal?.donation_link && (
                  <a href={portal.donation_link} target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 rounded-2xl bg-gradient-gold text-navy font-body font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow">
                    <Heart className="w-5 h-5" /> תרומה
                  </a>
                )}
                {portal?.lesson_download_url && (
                  <a href={portal.lesson_download_url} target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 font-body font-bold flex items-center gap-2 hover:bg-white/25 transition-colors text-white">
                    <Download className="w-5 h-5" /> הורדת שיעור
                  </a>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Lessons */}
        <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-black text-card-foreground mb-8 text-center">
              שיעורים ({lessons.length})
            </h2>
            {lessons.length === 0 ? (
              <p className="text-center font-body text-muted-foreground py-8">אין שיעורים מפורסמים כרגע</p>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, i) => (
                  <motion.div key={lesson.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedLesson(lesson)}
                    role="button" tabIndex={0} aria-label={`פרטי שיעור: ${lesson.subject}`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedLesson(lesson); } }}
                    className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-shadow cursor-pointer hover:border-gold/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-display text-lg font-black text-card-foreground">{lesson.subject}</h3>
                        {lesson.lesson_style && <Badge className="bg-gold/15 text-gold font-body text-xs">{lesson.lesson_style}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 font-body text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[lesson.city, lesson.neighborhood].filter(Boolean).join(", ")}</span>
                        {lesson.synagogue_name && <span>🏛️ {lesson.synagogue_name}</span>}
                        <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{lesson.language}</span>
                      </div>
                      {lesson.is_recurring && lesson.schedule_days && (lesson.schedule_days as any[]).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(lesson.schedule_days as any[]).map((d: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="font-body text-xs gap-1">
                              <Clock className="w-3 h-3" /> {d.day} {d.time}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {lesson.is_recorded && <Badge className="bg-magenta/15 text-magenta font-body text-xs"><Video className="w-3 h-3 ml-1" />מוקלט</Badge>}
                        {lesson.is_live_stream && <Badge className="bg-destructive/15 text-destructive font-body text-xs"><Radio className="w-3 h-3 ml-1" />שידור חי</Badge>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Sections */}
        {customSections.length > 0 && (
          <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
            <div className="container mx-auto max-w-4xl space-y-6">
              {customSections.map((section, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-display text-xl font-black text-card-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gold" /> {section.title}
                  </h3>
                  <p className="font-body text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Photos Gallery - moved after lessons */}
        {photos.length > 0 && (
          <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
            <div className="container mx-auto max-w-5xl">
              <h2 className="font-display text-2xl font-black text-card-foreground mb-6 text-center">תמונות מפעילות</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, i) => (
                  <motion.div key={photo.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="rounded-2xl overflow-hidden border border-border shadow-sm group">
                    <div className="relative">
                      <img src={photo.image_url} alt={photo.caption || ""} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                      {photo.caption && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy/90 to-transparent px-3 py-2">
                          <p className="font-body text-sm text-white">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contact Form */}
        {portal && <PublicContactForm portalId={portal.id} portalType="rabbi" portalName={portal.rabbi_name} />}

        {/* Contact Details Footer */}
        {hasContactInfo && (
          <div className="bg-navy/95 backdrop-blur-sm py-10 px-6 border-t border-gold/20">
            <div className="container mx-auto max-w-3xl">
              <h2 className="font-display text-xl font-black text-white mb-6 text-center">פרטי התקשרות</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portal?.contact_phone && (
                  <a href={`tel:${portal.contact_phone}`} className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <Phone className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-body text-xs text-white/60">טלפון</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_phone}</p>
                    </div>
                  </a>
                )}
                {portal?.contact_whatsapp && (
                  <a href={`https://wa.me/${portal.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener" className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-body text-xs text-white/60">וואטסאפ</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_whatsapp}</p>
                    </div>
                  </a>
                )}
                {portal?.contact_email && (
                  <a href={`mailto:${portal.contact_email}`} className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <Mail className="w-5 h-5 text-teal" />
                    <div>
                      <p className="font-body text-xs text-white/60">אימייל</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_email}</p>
                    </div>
                  </a>
                )}
                {portal?.contact_fax && (
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3">
                    <Phone className="w-5 h-5 text-white/60" />
                    <div>
                      <p className="font-body text-xs text-white/60">פקס</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_fax}</p>
                    </div>
                  </div>
                )}
                {portal?.contact_address && (
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3 col-span-2 md:col-span-1">
                    <MapPin className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-body text-xs text-white/60">כתובת</p>
                      <p className="font-body text-sm text-white font-bold">{portal.contact_address}</p>
                    </div>
                  </div>
                )}
                {portal?.contact_mailing_address && (
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3 col-span-2 md:col-span-1">
                    <Mail className="w-5 h-5 text-white/60" />
                    <div>
                      <p className="font-body text-xs text-white/60">כתובת מען</p>
                      <p className="font-body text-sm text-white font-bold">{portal.contact_mailing_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-navy/80 py-6 text-center border-t border-border">
          <p className="font-body text-xs text-muted-foreground">באדיבות איגוד השיעורים • שיעורי תורה, חברותות והרצאות</p>
        </div>
      </div>

      {/* Lesson Detail Modal */}
      <AnimatePresence>
        {selectedLesson && (
          <LessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} imageOptions={{ backgroundPreset: portal?.background_preset, portalName: portal?.rabbi_name }} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicRabbiPage;
