import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link2, Phone, Mail, Send, Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import agudLogo from "@/assets/agud-logo-mark.jpg";
import BulkLessonForm from "@/components/bulk/BulkLessonForm";
import BulkLessonTable from "@/components/bulk/BulkLessonTable";
import ExcelImportExport from "@/components/bulk/ExcelImportExport";
import type { Tables } from "@/integrations/supabase/types";

type Lesson = Tables<"lessons">;
type Session = Tables<"bulk_upload_sessions">;

const ORG_PHONE = "03-1234567";
const ORG_EMAIL = "info@agud-shiurim.org.il";

export default function BulkUpload() {
  const { token = "main" } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Contact form
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cMessage, setCMessage] = useState("");
  const [cSending, setCSending] = useState(false);

  const loadAll = useCallback(async () => {
    const { data: s } = await supabase
      .from("bulk_upload_sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!s) {
      setLoading(false);
      return;
    }
    setSession(s);

    const { data: l } = await supabase
      .from("lessons")
      .select("*")
      .eq("bulk_session_id", s.id)
      .order("created_at", { ascending: false });

    setLessons(l ?? []);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const copyLink = async () => {
    const url = `${window.location.origin}/bulk-upload/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("הקישור הועתק! שלחו אותו לאחרים שיוסיפו שיעורים");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendContact = async () => {
    if (!cName.trim() || !cPhone.trim()) {
      toast.error("שם וטלפון הם שדות חובה");
      return;
    }
    setCSending(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: cName.trim(),
        phone: cPhone.trim(),
        message: cMessage.trim() || null,
        subject: "פנייה מדף העלאה קבוצתית",
        status: "new",
      });
      if (error) throw error;
      toast.success("הפנייה נשלחה! ניצור קשר בהקדם");
      setCName(""); setCPhone(""); setCMessage("");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בשליחה");
    } finally {
      setCSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0] text-foreground font-assistant">
        טוען...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0] text-foreground p-6 text-center font-assistant">
        <div>
          <h1 className="font-display text-2xl mb-2">קישור לא חוקי</h1>
          <p className="text-muted-foreground">הקישור שאליו ניסית להגיע אינו תקף.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fdf8f0] font-assistant"
      dir="rtl"
      style={{
        // Override theme tokens locally so inputs/labels read well on cream
        ['--background' as string]: '0 0% 100%',
        ['--foreground' as string]: '225 30% 15%',
        ['--muted-foreground' as string]: '225 15% 35%',
        ['--border' as string]: '225 15% 80%',
        ['--input' as string]: '225 15% 80%',
        ['--card' as string]: '0 0% 100%',
        ['--card-foreground' as string]: '225 30% 15%',
        ['--popover' as string]: '0 0% 100%',
        ['--popover-foreground' as string]: '225 30% 15%',
        color: 'hsl(225 30% 15%)',
      } as React.CSSProperties}
    >
      {/* Floating header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#fdf8f0]/80 border-b border-secondary/15">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-end">
          <Button
            onClick={copyLink}
            variant="outline"
            className="gap-2 border-secondary/40 hover:bg-secondary/10 text-secondary"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  הקישור הועתק
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="hidden sm:inline">העתק קישור לדף זה</span>
                  <span className="sm:hidden">העתק קישור</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </header>

      {/* Hero with big logo */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <img
            src={agudLogo}
            alt="איגוד השיעורים"
            className="h-40 md:h-48 w-auto drop-shadow-md"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-display text-4xl md:text-5xl text-secondary mb-4 tracking-tight"
        >
          מוזמנים לזכות את הרבים
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-xl md:text-2xl text-foreground/70 font-light"
        >
          ולפרסם שיעורים שאתם מכירים
        </motion.p>

        {/* Animated link to main site - opens in new window */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 flex justify-center"
        >
          <motion.a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            animate={{
              boxShadow: [
                "0 0 0 0 hsl(45 80% 55% / 0.35)",
                "0 0 0 14px hsl(45 80% 55% / 0)",
              ],
            }}
            transition={{ boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" } }}
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gradient-to-l from-[#f5e7c4] via-[#fbe9b8] to-[#f5e7c4] border border-secondary/30 text-navy font-medium text-base shadow-sm hover:shadow-md transition-all"
          >
            <motion.span
              animate={{ rotate: [0, 14, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-navy/80"
            >
              <Sparkles className="w-4 h-4" />
            </motion.span>
            <span>מוזמנים להיכנס לאתר איגוד השיעורים כאן</span>
            <motion.span
              animate={{ x: [0, -4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="opacity-70 group-hover:opacity-100"
            >
              <ExternalLink className="w-4 h-4" />
            </motion.span>
          </motion.a>
        </motion.div>
      </section>

      {/* Main content */}
      <main id="main-content" className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
        <BulkLessonForm sessionId={session.id} onAdded={loadAll} />
        <ExcelImportExport sessionId={session.id} onImported={loadAll} />
        <BulkLessonTable lessons={lessons} onChanged={loadAll} />
      </main>

      {/* Contact section */}
      <footer className="border-t border-secondary/20 bg-white/60 backdrop-blur-sm mt-8">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl md:text-4xl text-secondary mb-2">
              {session.org_name || "איגוד השיעורים"}
            </h2>
            <p className="text-foreground/60">נשמח לעמוד לשירותכם</p>
          </div>

          {/* Direct contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <a
              href={`tel:${session.contact_phone || ORG_PHONE}`}
              className="flex items-center justify-center gap-3 bg-white border border-secondary/20 rounded-xl p-5 hover:border-secondary/50 hover:shadow-md transition-all group"
            >
              <Phone className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
              <div className="text-right">
                <div className="text-xs text-foreground/60">טלפון</div>
                <div className="font-medium text-foreground" dir="ltr">{session.contact_phone || ORG_PHONE}</div>
              </div>
            </a>
            <a
              href={`mailto:${session.contact_email || ORG_EMAIL}`}
              className="flex items-center justify-center gap-3 bg-white border border-secondary/20 rounded-xl p-5 hover:border-secondary/50 hover:shadow-md transition-all group"
            >
              <Mail className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
              <div className="text-right">
                <div className="text-xs text-foreground/60">דוא״ל</div>
                <div className="font-medium text-foreground text-sm" dir="ltr">{session.contact_email || ORG_EMAIL}</div>
              </div>
            </a>
          </div>

          {/* Quick contact form */}
          <div className="bg-white rounded-2xl border border-secondary/20 p-6 md:p-8 shadow-sm">
            <h3 className="font-display text-xl text-secondary mb-5 text-center">
              שליחת פנייה
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label className="text-sm">שם <span className="text-destructive">*</span></Label>
                <Input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="h-11 border-foreground/15"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">טלפון <span className="text-destructive">*</span></Label>
                <Input
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  dir="ltr"
                  className="h-11 border-foreground/15"
                />
              </div>
            </div>
            <div className="space-y-1.5 mb-5">
              <Label className="text-sm">הודעה</Label>
              <Textarea
                value={cMessage}
                onChange={(e) => setCMessage(e.target.value)}
                rows={3}
                className="border-foreground/15 resize-none"
              />
            </div>
            <Button
              onClick={sendContact}
              disabled={cSending}
              size="lg"
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
            >
              <Send className="w-4 h-4" />
              {cSending ? "שולח..." : "שלח פנייה"}
            </Button>
          </div>

          <p className="text-xs text-foreground/50 text-center mt-8">
            כל שיעור שתשלחו עובר אישור צוות לפני פרסום במאגר הציבורי
          </p>
        </div>
      </footer>
    </div>
  );
}
