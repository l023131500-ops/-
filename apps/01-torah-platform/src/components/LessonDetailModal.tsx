import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Phone, Mail, ExternalLink, Video, Radio, Users, BookOpen, Share2, Download, Globe, Mic, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadLessonAsImage, type LessonImageOptions } from "@/lib/lessonImageExport";

interface LessonDetailModalProps {
  lesson: any;
  onClose: () => void;
  imageOptions?: LessonImageOptions;
}

const LessonDetailModal = ({ lesson, onClose, imageOptions }: LessonDetailModalProps) => {
  const [showContact, setShowContact] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!lesson) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocusRef.current?.focus();
    };
  }, [lesson, onClose]);

  if (!lesson) return null;

  const handleShare = async () => {
    const text = `📖 שיעור תורה: ${lesson.subject}\n👨‍🏫 ${lesson.rabbi_name}${lesson.rabbi_role ? ` — ${lesson.rabbi_role}` : ""}\n📍 ${[lesson.city, lesson.neighborhood, lesson.synagogue_name].filter(Boolean).join(", ")}${lesson.is_recurring && lesson.schedule_days?.length ? `\n🕐 ${(lesson.schedule_days as any[]).map((d: any) => `${d.day} ${d.time}`).join(", ")}` : ""}\n\nבאדיבות: איגוד השיעורים — הארגון העולמי של שיעורי התורה`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `שיעור: ${lesson.subject} — ${lesson.rabbi_name}`, text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("הפרטים הועתקו! 📋");
    }
  };

  const handleDownload = () => {
    const lines = [
      "═══════════════════════════════════",
      "       איגוד השיעורים",
      "   הארגון העולמי של שיעורי התורה",
      "═══════════════════════════════════",
      "",
      `📖 נושא: ${lesson.subject}`,
      `👨‍🏫 מגיד השיעור: ${lesson.rabbi_name}`,
      lesson.rabbi_role ? `   תפקיד: ${lesson.rabbi_role}` : "",
      lesson.lesson_style ? `   סגנון: ${lesson.lesson_style}` : "",
      "",
      "── מיקום ──",
      `🏙️ עיר: ${lesson.city}`,
      lesson.neighborhood ? `📍 שכונה: ${lesson.neighborhood}` : "",
      lesson.street ? `🛣️ רחוב: ${lesson.street} ${lesson.street_number || ""}` : "",
      lesson.synagogue_name ? `🏛️ בית כנסת: ${lesson.synagogue_name}` : "",
      "",
      "── זמנים ──",
      lesson.is_recurring && lesson.schedule_days?.length
        ? (lesson.schedule_days as any[]).map((d: any) => `🕐 ${d.day} — ${d.time}`).join("\n")
        : "",
      lesson.specific_date ? `📅 תאריך: ${lesson.specific_date}` : "",
      lesson.schedule_notes ? `📝 ${lesson.schedule_notes}` : "",
      "",
      `🌍 שפה: ${lesson.language}`,
      lesson.target_audience?.length ? `👥 קהל יעד: ${lesson.target_audience.join(", ")}` : "",
      lesson.audience_type?.length ? `🎯 סוג קהל: ${lesson.audience_type.join(", ")}` : "",
      "",
      lesson.is_recorded ? "🎥 השיעור מוקלט" : "",
      lesson.is_live_stream ? "📡 שידור חי" : "",
      lesson.recording_location ? `   מיקום הקלטה: ${lesson.recording_location}` : "",
      "",
      "── יצירת קשר ──",
      lesson.contact_name ? `👤 ${lesson.contact_name}` : "",
      lesson.contact_phone ? `📞 ${lesson.contact_phone}` : "",
      lesson.contact_email ? `📧 ${lesson.contact_email}` : "",
      lesson.rabbi_phone ? `📞 טלפון הרב: ${lesson.rabbi_phone}` : "",
      lesson.donation_link ? `💝 קישור לתרומה: ${lesson.donation_link}` : "",
      "",
      "═══════════════════════════════════",
      "   איגוד השיעורים • 023-133-0600",
      "═══════════════════════════════════",
    ].filter(Boolean).join("\n");

    const blob = new Blob(["\uFEFF" + lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `שיעור_${lesson.rabbi_name}_${lesson.subject}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("הקובץ הורד בהצלחה! 📥");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-xl p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${lesson.subject} — ${lesson.rabbi_name}`}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: "spring", bounce: 0.2 }}
        className="bg-card rounded-3xl border border-border shadow-elegant max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header with gradient */}
        <div className="relative p-8 pb-4">
          <div className="absolute inset-0 bg-gradient-to-bl from-teal/5 via-transparent to-gold/5 rounded-t-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleShare}
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                  <Share2 className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleDownload}
                  className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center text-gold hover:bg-gold/20 transition-colors" title="הורדה כטקסט">
                  <Download className="w-4 h-4" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { downloadLessonAsImage(lesson, imageOptions); toast.success("התמונה הורדה! 🖼️"); }}
                  className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center text-primary hover:bg-teal/20 transition-colors" title="הורדה כתמונה">
                  <Image className="w-4 h-4" />
                </motion.button>
              </div>
              <button ref={closeButtonRef} onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" aria-label="סגירה">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-4">
              {lesson.logo_url ? (
                <img src={lesson.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-primary/20 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse-glow">
                  <Mic className="w-7 h-7 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl font-black text-foreground mb-1">{lesson.rabbi_name}</h2>
                {lesson.rabbi_role && (
                  <p className="font-body text-sm text-muted-foreground">{lesson.rabbi_role}</p>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4 relative z-10">
            <span className="px-3 py-1 rounded-full bg-gradient-teal text-primary-foreground text-xs font-body font-bold shadow-sm">
              {lesson.subject}
            </span>
            {lesson.lesson_style && (
              <span className="px-3 py-1 rounded-full bg-gradient-gold text-primary-foreground text-xs font-body font-bold shadow-sm">
                {lesson.lesson_style}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-body flex items-center gap-1">
              <Globe className="w-3 h-3" /> {lesson.language}
            </span>
            {lesson.is_recorded && (
              <span className="px-3 py-1 rounded-full bg-magenta/15 text-magenta text-xs font-body font-bold flex items-center gap-1">
                <Video className="w-3 h-3" /> 🎥 מוקלט
              </span>
            )}
            {lesson.is_live_stream && (
              <span className="px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-body font-bold flex items-center gap-1 animate-pulse">
                <Radio className="w-3 h-3" /> 📡 שידור חי
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-8 pb-6 space-y-4">
          {/* Location card */}
          <div className="bg-gradient-to-br from-muted/60 to-muted/30 rounded-2xl p-5 space-y-3 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-teal flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="font-body text-sm text-foreground">
                <p className="font-semibold">{[lesson.city, lesson.neighborhood].filter(Boolean).join(", ")}</p>
                {lesson.street && <p className="text-muted-foreground">{lesson.street} {lesson.street_number}</p>}
                {lesson.synagogue_name && <p className="text-muted-foreground">🏛️ {lesson.synagogue_name}</p>}
              </div>
            </div>

            {lesson.is_recurring && lesson.schedule_days && (lesson.schedule_days as any[]).length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="font-body text-sm text-foreground">
                  {(lesson.schedule_days as any[]).map((d: any, i: number) => (
                    <p key={i} className="font-medium">{d.day} — {d.time}</p>
                  ))}
                </div>
              </div>
            )}

            {lesson.specific_date && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="font-body text-sm text-foreground font-medium">📅 תאריך: {lesson.specific_date}</p>
              </div>
            )}

            {lesson.schedule_notes && (
              <p className="font-body text-xs text-muted-foreground pr-11">📝 {lesson.schedule_notes}</p>
            )}
          </div>

          {/* Audience */}
          {(lesson.target_audience?.length > 0 || lesson.audience_type?.length > 0) && (
            <div className="bg-gold/5 border border-gold/15 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-gold flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-body text-sm font-bold text-foreground">קהל יעד</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lesson.target_audience?.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 rounded-full bg-gold/15 text-gold-dark text-xs font-body font-medium">{a}</span>
                ))}
                {lesson.audience_type?.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 rounded-full bg-teal/10 text-primary text-xs font-body font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Live stream / recording details */}
          {(lesson.is_live_stream || lesson.is_recorded) && (
            <div className="bg-gradient-to-br from-magenta/5 to-magenta/10 border border-magenta/15 rounded-2xl p-4 space-y-2">
              {lesson.is_live_stream && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <Radio className="w-4 h-4 text-destructive" />
                  <span className="font-body text-sm font-bold text-foreground">שידור חי</span>
                </div>
              )}
              {lesson.is_live_stream && (
                <div className="font-body text-sm text-muted-foreground pr-6 space-y-1">
                  <p>📍 מיקום: {[lesson.city, lesson.neighborhood, lesson.street, lesson.street_number].filter(Boolean).join(", ")}</p>
                  {lesson.synagogue_name && <p>🏛️ {lesson.synagogue_name}</p>}
                </div>
              )}
              {lesson.is_recorded && (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-gold" />
                  <span className="font-body text-sm font-bold text-foreground">
                    🎥 מוקלט{lesson.recording_location ? ` — ${lesson.recording_location}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submitter notes */}
          {lesson.submitter_notes && (
            <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
              <p className="font-body text-xs text-muted-foreground">💬 {lesson.submitter_notes}</p>
            </div>
          )}

          {/* Contact section */}
          <div className="pt-4 border-t border-border space-y-3">
            <AnimatePresence>
              {showContact ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {lesson.contact_name && (
                    <p className="font-body text-sm text-foreground font-medium">👤 {lesson.contact_name}</p>
                  )}
                  {lesson.contact_phone && (
                    <a href={`tel:${lesson.contact_phone}`} className="flex items-center gap-2 font-body text-sm text-primary hover:text-primary/80 transition-colors">
                      <Phone className="w-4 h-4" />
                      <span dir="ltr">{lesson.contact_phone}</span>
                    </a>
                  )}
                  {lesson.rabbi_phone && lesson.rabbi_phone !== lesson.contact_phone && (
                    <a href={`tel:${lesson.rabbi_phone}`} className="flex items-center gap-2 font-body text-sm text-primary hover:text-primary/80 transition-colors">
                      <Phone className="w-4 h-4" />
                      טלפון הרב: <span dir="ltr">{lesson.rabbi_phone}</span>
                    </a>
                  )}
                  {lesson.contact_email && (
                    <a href={`mailto:${lesson.contact_email}`} className="flex items-center gap-2 font-body text-sm text-primary hover:text-primary/80 transition-colors">
                      <Mail className="w-4 h-4" />
                      <span dir="ltr">{lesson.contact_email}</span>
                    </a>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Button
                    onClick={() => setShowContact(true)}
                    className="w-full bg-gradient-brand text-primary-foreground font-body font-bold hover:opacity-90 shadow-lg"
                  >
                    <Phone className="w-4 h-4 ml-2" />
                    הצגת פרטי יצירת קשר
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              {lesson.donation_link && (
                <a href={lesson.donation_link} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full font-body border-gold/30 text-gold hover:bg-gold/10">
                    <ExternalLink className="w-4 h-4 ml-2" />
                    קישור לתרומה
                  </Button>
                </a>
              )}
              <Button variant="outline" onClick={handleShare} className="font-body border-primary/30 text-primary hover:bg-primary/10">
                <Share2 className="w-4 h-4 ml-1" />
                שיתוף
              </Button>
              <Button variant="outline" onClick={handleDownload} className="font-body border-gold/30 text-gold hover:bg-gold/10">
                <Download className="w-4 h-4 ml-1" />
                טקסט
              </Button>
              <Button variant="outline" onClick={() => { downloadLessonAsImage(lesson, imageOptions); toast.success("התמונה הורדה! 🖼️"); }} className="font-body border-teal/30 text-primary hover:bg-teal/10">
                <Image className="w-4 h-4 ml-1" />
                תמונה
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LessonDetailModal;
