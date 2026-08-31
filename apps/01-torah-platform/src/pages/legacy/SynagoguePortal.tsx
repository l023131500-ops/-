import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Check, Users, Share2, Building2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StudyDayEventForm from "@/components/studyday/StudyDayEventForm";
import StudyDayEventTable from "@/components/studyday/StudyDayEventTable";
import PortalSettingsTab from "@/components/portal/PortalSettingsTab";
import PortalMessagesTab from "@/components/portal/PortalMessagesTab";
import SynagogueShowcaseCarousel from "@/components/synagogue/SynagogueShowcaseCarousel";
import SynagogueExcelImportExport from "@/components/synagogue/SynagogueExcelImportExport";
import SynagogueFullAccessRequest, { FEATURE_OPTIONS } from "@/components/synagogue/SynagogueFullAccessRequest";
import PrayerTimesTab from "@/components/portal/PrayerTimesTab";
import ZmanimTab from "@/components/portal/ZmanimTab";
import agudLogo from "@/assets/agud-logo.webp";

const teal = "hsl(180 45% 30%)";

export default function SynagoguePortal() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [portal, setPortal] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSide, setCopiedSide] = useState<"public" | "invite" | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const { data: p } = await supabase
      .from("synagogue_portals")
      .select("*")
      .eq("access_token", accessToken)
      .maybeSingle();
    if (!p) { setLoading(false); return; }
    setPortal(p);

    // Lessons created via this synagogue portal (for showcase)
    const { data: e } = await supabase
      .from("study_day_events")
      .select("*")
      .eq("session_id", p.id)
      .order("created_at", { ascending: false });
    setEvents(e ?? []);
    setLoading(false);
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const publicUrl = portal?.public_token ? `${window.location.origin}/view/shul/${portal.public_token}` : "";
  const inviteUrl = `${window.location.origin}/study-days/main`;

  const copy = async (url: string, side: "public" | "invite", msg: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedSide(side);
    toast.success(msg);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  // Flatten study_day_events lessons for the showcase
  const flatLessons: any[] = [];
  events.forEach((ev) => {
    const blocks = (ev.lessons as any)?.blocks ?? [];
    blocks.forEach((b: any) => {
      (b.items ?? []).forEach((l: any, i: number) => {
        flatLessons.push({
          id: `${ev.id}-${b.id}-${i}`,
          rabbi_name: l.rabbi_name,
          subject: l.subject,
          city: ev.city,
          neighborhood: portal?.neighborhood || "",
          schedule_days: b.kind === "days" && b.days
            ? b.days.map((d: string) => ({ day: d, time: l.time || "" }))
            : [],
        });
      });
    });
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0] font-assistant">טוען...</div>;
  }

  if (!portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8f0] font-assistant text-center p-6">
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
      {/* Header with two CTA chips */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#fdf8f0]/85 border-b" style={{ borderColor: 'hsl(180 45% 30% / 0.15)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-1 md:grid-cols-3 items-center gap-3">
          {/* RIGHT: public distribution chip */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 hsl(180 45% 45% / 0.4)",
                "0 0 0 14px hsl(180 45% 45% / 0)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="rounded-full justify-self-start order-2 md:order-1"
          >
            <Button
              onClick={() => copy(publicUrl, "public", "הקישור לציבור הועתק! 📢")}
              size="lg"
              disabled={!publicUrl}
              className="gap-2 text-white font-bold shadow-md"
              style={{ backgroundColor: teal }}
            >
              <AnimatePresence mode="wait">
                {copiedSide === "public" ? (
                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> הועתק
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">📢 קישור הפצה למתפללים שלך</span>
                    <span className="sm:hidden">📢 קישור למתפללים</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          {/* CENTER: portal name */}
          <div className="text-center order-1 md:order-2">
            <div className="text-xs text-foreground/60">פורטל בית הכנסת</div>
            <div className="font-display text-lg font-bold truncate" style={{ color: teal }}>
              {portal.synagogue_name}
            </div>
          </div>

          {/* LEFT: invite-other-shuls chip */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 hsl(40 80% 55% / 0.35)",
                "0 0 0 12px hsl(40 80% 55% / 0)",
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="rounded-full justify-self-end order-3"
          >
            <Button
              onClick={() => copy(inviteUrl, "invite", "קישור הזמנה לבתי כנסת אחרים הועתק! 🤝")}
              size="lg"
              variant="outline"
              className="gap-2 font-bold border-2"
              style={{ borderColor: 'hsl(40 80% 50%)', color: 'hsl(40 80% 35%)' }}
            >
              <AnimatePresence mode="wait">
                {copiedSide === "invite" ? (
                  <motion.span key="ok2" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> הועתק
                  </motion.span>
                ) : (
                  <motion.span key="copy2" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">🤝 הזמן בתי כנסת לפרסום שיעורי תורה</span>
                    <span className="sm:hidden">🤝 פרסום שיעורי תורה</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 text-center text-[11px] text-foreground/55">
          <Sparkles className="w-3 h-3 inline ml-1 text-[hsl(40_80%_50%)]" />
          הזמינו את המתפללים והלומדים שלכם להצטרף לזמני השיעורים שלכם
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero strip */}
        <div className="text-center">
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src={agudLogo} alt="חזרה לאיגוד השיעורים (חלון חדש)" className="h-16 w-auto mx-auto opacity-80 mb-2 hover:opacity-100 transition-opacity" />
          </a>
          <h1 className="font-display text-2xl md:text-3xl tracking-tight" style={{ color: teal }}>
            {portal.synagogue_name}
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            {portal.city}{portal.neighborhood ? ` • ${portal.neighborhood}` : ""}
          </p>
        </div>

        {/* Showcase carousel — only renders when 5+ lessons exist */}
        {flatLessons.length >= 5 && (
          <SynagogueShowcaseCarousel
            synagogueName={portal.synagogue_name}
            logoUrl={portal.logo_url}
            publicUrl={publicUrl}
            lessons={flatLessons}
          />
        )}

        <Tabs defaultValue="lessons" className="space-y-4">
          <TabsList className="bg-white border w-full justify-start overflow-x-auto" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
            <TabsTrigger value="lessons" className="font-bold">📚 שיעורים</TabsTrigger>
            <TabsTrigger value="messages" className="font-bold">📩 פניות</TabsTrigger>
            <TabsTrigger value="settings" className="font-bold">⚙️ הגדרות</TabsTrigger>
            {FEATURE_OPTIONS.filter((f) => portal.features_enabled?.[f.id]).map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="font-bold whitespace-nowrap">
                {f.emoji} {f.label.split(" – ")[0].split(" (")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="lessons" className="space-y-6">
            <SynagogueExcelImportExport
              mode="shul"
              sessionId={portal.id}
              synagogueName={portal.synagogue_name}
              city={portal.city}
              logoUrl={portal.logo_url}
              onImported={load}
            />
            <StudyDayEventForm
              sessionId={portal.id}
              onAdded={load}
              existingEvents={events.map((e) => ({
                id: e.id,
                synagogue_name: e.synagogue_name,
                city: e.city,
                lessons: e.lessons,
                schedule_type: e.schedule_type,
                event_date: e.event_date,
                schedule_days: e.schedule_days,
              }))}
            />
            <StudyDayEventTable events={events} onChanged={load} />

            <SynagogueFullAccessRequest
              portalId={portal.id}
              synagogueName={portal.synagogue_name}
              city={portal.city}
              defaultContactName={portal.contact_name || ""}
              defaultContactPhone={portal.contact_phone || ""}
              defaultContactEmail={portal.contact_email || ""}
            />
          </TabsContent>

          <TabsContent value="messages">
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
              <PortalMessagesTab portalId={portal.id} portalType="shul" />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
              <PortalSettingsTab
                portalId={portal.id}
                portalType={"org" as any}
                portalData={{ ...portal, org_name: portal.synagogue_name }}
                onUpdate={(d) => setPortal((p: any) => ({ ...p, ...d }))}
              />
              <p className="mt-3 text-[11px] text-muted-foreground text-center">
                * שדה "אודות הארגון" נשמר עבור בית הכנסת שלך.
              </p>
            </div>
          </TabsContent>

          {portal.features_enabled?.prayer_times && (
            <TabsContent value="prayer_times">
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
                <PrayerTimesTab orgId={portal.id} />
              </div>
            </TabsContent>
          )}

          {portal.features_enabled?.zmanim && (
            <TabsContent value="zmanim">
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
                <ZmanimTab city={portal.city} />
              </div>
            </TabsContent>
          )}

          {FEATURE_OPTIONS.filter((f) => f.id !== "prayer_times" && f.id !== "zmanim" && portal.features_enabled?.[f.id]).map((f) => (
            <TabsContent key={f.id} value={f.id}>
              <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: 'hsl(180 45% 30% / 0.2)' }}>
                <div className="text-4xl mb-3">{f.emoji}</div>
                <h3 className="font-display text-xl font-bold mb-2" style={{ color: teal }}>{f.label}</h3>
                <p className="text-sm text-foreground/60">
                  ✅ פיצ׳ר זה אושר עבורכם — מסך הניהול יתווסף בעדכון הקרוב.
                </p>
                <p className="text-xs text-foreground/50 mt-2">
                  בינתיים, אם יש לכם תכנים להעלאה — שלחו אלינו ואנחנו נטפל בכך עבורכם.
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
