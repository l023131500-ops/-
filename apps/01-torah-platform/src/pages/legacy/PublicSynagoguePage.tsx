import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MapPin, Phone, Mail, MessageSquare, Heart, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BACKGROUND_PRESETS } from "@/components/portal/PortalSettingsTab";
import PublicContactForm from "@/components/portal/PublicContactForm";
import PublicZmanim from "@/components/portal/PublicZmanim";
import { normalizeToBlocks, blockLabel, type ScheduleBlock } from "@/lib/studyDayLessons";

export default function PublicSynagoguePage() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [portal, setPortal] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!publicToken) return;
    (async () => {
      const { data: p } = await supabase
        .from("synagogue_portals")
        .select("*")
        .eq("public_token", publicToken)
        .maybeSingle();
      if (!p) { setNotFound(true); setLoading(false); return; }
      setPortal(p);
      const { data: e } = await supabase
        .from("study_day_events")
        .select("*")
        .eq("session_id", p.id)
        .order("created_at", { ascending: false });
      setEvents(e ?? []);
      setLoading(false);
    })();
  }, [publicToken]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (notFound || !portal) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center px-6">
      <div>
        <h1 className="font-display text-3xl font-black text-card-foreground mb-4">הדף לא נמצא</h1>
        <p className="font-body text-muted-foreground">הקישור אינו תקף או שפג תוקפו.</p>
      </div>
    </div>
  );

  const bgPreset = BACKGROUND_PRESETS.find(p => p.id === portal.background_preset);
  const bgClass = bgPreset?.css || "bg-gradient-to-br from-[hsl(180,40%,13%)] via-[hsl(180,35%,18%)] to-[hsl(40,60%,20%)]";
  const customBg = portal.custom_background_url;
  const fontColorClass = portal.font_color === "dark" ? "text-gray-900" : "text-white";
  const fontColorMuted = portal.font_color === "dark" ? "text-gray-600" : "text-white/70";

  // Collect all schedule blocks across all events
  const allBlocks: { ev: any; block: ScheduleBlock }[] = [];
  events.forEach((ev) => {
    const blocks = normalizeToBlocks(ev.lessons, {
      schedule_type: ev.schedule_type,
      event_date: ev.event_date,
      schedule_days: ev.schedule_days,
    });
    blocks.forEach((b) => allBlocks.push({ ev, block: b }));
  });

  const totalLessons = allBlocks.reduce((s, x) => s + x.block.items.length, 0);
  const hasContact = portal.contact_phone || portal.contact_email || portal.contact_address || portal.contact_whatsapp;

  return (
    <div className={`min-h-screen ${!customBg ? bgClass : ""}`} dir="rtl"
      style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" } : undefined}
    >
      {customBg && <div className="fixed inset-0 bg-navy/70 z-0" />}

      <div className="relative z-10">
        {/* Hero */}
        <div className="min-h-[45vh] flex flex-col items-center justify-center px-6 py-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="relative mb-6"
          >
            <div className="absolute -inset-4 rounded-2xl border-2 border-gold/20 animate-[pulse_3s_ease-in-out_infinite]" />
            {portal.logo_url ? (
              <img src={portal.logo_url} alt="" className="w-[140px] h-[140px] rounded-2xl object-cover border-4 border-gold/30 shadow-2xl" />
            ) : (
              <div className="w-[140px] h-[140px] rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center border-4 border-gold/30 shadow-2xl">
                <Building2 className="w-14 h-14 text-gold" />
              </div>
            )}
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className={`font-display text-4xl md:text-5xl font-black ${fontColorClass} text-center drop-shadow-lg`}>
            {portal.synagogue_name}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className={`font-body ${fontColorMuted} mt-3 text-center text-sm`}>
            {portal.city}{portal.neighborhood ? ` • ${portal.neighborhood}` : ""}
          </motion.p>
          {portal.about_text && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              className={`font-body ${fontColorMuted} max-w-xl mt-5 text-center text-base leading-relaxed`}>
              {portal.about_text}
            </motion.p>
          )}
        </div>

        {/* Lessons grouped by day-block */}
        <div className="bg-background/90 backdrop-blur-sm py-12 px-6">
          <div className="container mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-black text-card-foreground mb-8 text-center">
              שיעורים ({totalLessons})
            </h2>
            {totalLessons === 0 ? (
              <p className="text-center font-body text-muted-foreground py-8">אין שיעורים מפורסמים כרגע</p>
            ) : (
              <div className="space-y-5">
                <AnimatePresence>
                  {allBlocks.map(({ ev, block }, idx) => (
                    <motion.div
                      key={`${ev.id}-${block.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-3 border-b border-border flex items-center gap-2">
                        {block.kind === "date" ? <Calendar className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-primary" />}
                        <span className="font-display font-bold text-card-foreground">{blockLabel(block)}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {block.items.map((l, i) => (
                          <div key={i} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-bold text-card-foreground">{l.subject}</div>
                              <div className="text-sm text-muted-foreground">{l.rabbi_name}</div>
                            </div>
                            {l.time && <Badge variant="outline" className="gap-1 text-xs"><Clock className="w-3 h-3" />{l.time}</Badge>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Zmanim */}
        {portal.features_enabled?.zmanim && <PublicZmanim city={portal.city} />}

        {/* Donation */}
        {portal.donation_link && (
          <div className="bg-background/90 backdrop-blur-sm pb-8 px-6 text-center">
            <a href={portal.donation_link} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-gradient-gold text-navy font-bold gap-2 shadow-lg">
                <Heart className="w-4 h-4" /> תרומה לבית הכנסת
              </Button>
            </a>
          </div>
        )}

        {/* Contact form */}
        <PublicContactForm portalId={portal.id} portalType="shul" portalName={portal.synagogue_name} />

        {/* Contact details */}
        {hasContact && (
          <div className="bg-navy/95 backdrop-blur-sm py-10 px-6 border-t border-gold/20">
            <div className="container mx-auto max-w-3xl">
              <h2 className="font-display text-xl font-black text-white mb-6 text-center">פרטי התקשרות</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portal.contact_phone && (
                  <a href={`tel:${portal.contact_phone}`} className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <Phone className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-body text-xs text-white/60">טלפון</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_phone}</p>
                    </div>
                  </a>
                )}
                {portal.contact_whatsapp && (
                  <a href={`https://wa.me/${portal.contact_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener" className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-body text-xs text-white/60">וואטסאפ</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_whatsapp}</p>
                    </div>
                  </a>
                )}
                {portal.contact_email && (
                  <a href={`mailto:${portal.contact_email}`} className="bg-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/15 transition-colors">
                    <Mail className="w-5 h-5 text-teal" />
                    <div>
                      <p className="font-body text-xs text-white/60">אימייל</p>
                      <p className="font-body text-sm text-white font-bold" dir="ltr">{portal.contact_email}</p>
                    </div>
                  </a>
                )}
                {portal.contact_address && (
                  <div className="bg-white/10 rounded-xl p-4 flex items-center gap-3 col-span-2 md:col-span-1">
                    <MapPin className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-body text-xs text-white/60">כתובת</p>
                      <p className="font-body text-sm text-white font-bold">{portal.contact_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-navy/80 py-6 text-center border-t border-border">
          <p className="font-body text-xs text-muted-foreground">באדיבות איגוד השיעורים • הארגון העולמי של שיעורי התורה</p>
        </div>
      </div>
    </div>
  );
}
