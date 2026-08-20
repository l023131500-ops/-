import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, MapPin, Clock, Calendar, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SynagogueDetailModal, { SynagogueCardData } from "./SynagogueDetailModal";
import {
  normalizeToBlocks,
  flattenWithDayLabel,
  formatHebDate,
  isFullyExpired,
  type ScheduleBlock,
} from "@/lib/studyDayLessons";

const SynagogueCard = ({ data, onClick }: { data: SynagogueCardData; onClick: () => void }) => {
  const isStudyDay = data.source === "study_day";
  const preview = data.lessons.slice(0, 3);
  const remaining = Math.max(0, data.lessons.length - 3);

  const dateLabel = (() => {
    const blocks = data.blocks ?? [];
    const dateBlocks = blocks.filter((b) => b.kind === "date" && b.date);
    const daysBlocks = blocks.filter((b) => b.kind === "days" && b.days?.length);

    if (dateBlocks.length && daysBlocks.length) {
      return `${blocks.length} מועדים`;
    }
    if (dateBlocks.length === 1) {
      return formatHebDate(dateBlocks[0].date!);
    }
    if (dateBlocks.length > 1) {
      return `${dateBlocks.length} מועדים`;
    }
    if (daysBlocks.length) {
      const allDays = Array.from(new Set(daysBlocks.flatMap((b) => b.days ?? [])));
      return `ימים: ${allDays.join(", ")}`;
    }
    if (data.schedule_type === "specific_date" && data.event_date) {
      return formatHebDate(data.event_date);
    }
    if (data.schedule_type === "weekly_days" && Array.isArray(data.schedule_days) && data.schedule_days.length) {
      return `ימים: ${(data.schedule_days as string[]).join(", ")}`;
    }
    return null;
  })();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      className="shrink-0 w-[300px] md:w-[320px] h-[340px] bg-card rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-elegant transition-all overflow-hidden text-right flex flex-col"
    >
      {/* Header — fixed height */}
      <div className={`p-4 text-center h-[170px] flex flex-col justify-center ${isStudyDay ? "bg-gradient-to-l from-[hsl(180_45%_30%)] to-[hsl(180_55%_33%)] text-white" : "bg-gradient-to-l from-gold to-gold-light text-navy"}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden shrink-0">
            {data.logo_url ? (
              <img src={data.logo_url} alt={data.synagogue_name ? `לוגו ${data.synagogue_name}` : "לוגו"} className="w-full h-full object-cover" />
            ) : (
              <Building2 className={`w-7 h-7 ${isStudyDay ? "text-white" : "text-navy"}`} />
            )}
          </div>
          <h4 className={`font-display font-bold text-base truncate w-full px-2 ${isStudyDay ? "text-white" : "text-navy"}`}>{data.synagogue_name}</h4>
          <p className={`text-xs flex items-center gap-1 justify-center truncate w-full px-2 ${isStudyDay ? "text-white/85" : "text-navy/85"}`}>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{[data.city, data.street].filter(Boolean).join(", ") || "—"}</span>
          </p>
        </div>
        {dateLabel && (
          <div className="mt-2 mx-auto inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-xs max-w-[90%] truncate">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>
        )}
      </div>

      {/* Lessons preview — fills remaining */}
      <div className="p-4 space-y-2 flex-1 overflow-hidden">
        {preview.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {l.time && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[hsl(180_45%_30%)] font-bold text-xs bg-[hsl(180_30%_96%)] px-2 py-0.5 rounded">
                <Clock className="w-3 h-3" /> {l.time}
              </span>
            )}
            <span className="text-foreground font-medium truncate">{l.subject}</span>
            {l.rabbi_name && (
              <span className="text-muted-foreground text-xs truncate">• {l.rabbi_name}</span>
            )}
          </div>
        ))}
        {preview.length === 0 && (
          <p className="text-sm text-muted-foreground italic">אין שיעורים זמינים</p>
        )}
        {remaining > 0 && (
          <p className="text-xs text-primary font-bold pt-1">+ עוד {remaining} שיעורים →</p>
        )}
      </div>
    </motion.button>
  );
};

// Build ScheduleBlock[] for a flat list of lessons coming from `lessons` table
function lessonsToBlocks(rows: any[]): ScheduleBlock[] {
  const dateMap = new Map<string, { rabbi_name: string; subject: string; time?: string }[]>();
  const daysMap = new Map<string, { days: string[]; items: { rabbi_name: string; subject: string; time?: string }[] }>();

  for (const l of rows) {
    if (!l) continue;
    if (l.specific_date) {
      const key = l.specific_date;
      if (!dateMap.has(key)) dateMap.set(key, []);
      // try to extract a time from schedule_days[0]
      const t = Array.isArray(l.schedule_days) && l.schedule_days[0]?.time;
      dateMap.get(key)!.push({ rabbi_name: l.rabbi_name, subject: l.subject, time: t || "" });
    } else if (Array.isArray(l.schedule_days) && l.schedule_days.length) {
      const days = l.schedule_days.map((d: any) => d.day).filter(Boolean);
      const key = days.slice().sort().join("|");
      if (!daysMap.has(key)) daysMap.set(key, { days, items: [] });
      // one entry per day–time pair, but we keep at lesson granularity
      const time = l.schedule_days[0]?.time || "";
      daysMap.get(key)!.items.push({ rabbi_name: l.rabbi_name, subject: l.subject, time });
    }
  }

  const blocks: ScheduleBlock[] = [];
  let i = 0;
  for (const [date, items] of dateMap) blocks.push({ id: `d-${i++}`, kind: "date", date, items });
  for (const { days, items } of daysMap.values()) blocks.push({ id: `w-${i++}`, kind: "days", days, items });
  return blocks;
}

export default function SynagogueShowcase() {
  const [items, setItems] = useState<SynagogueCardData[]>([]);
  const [selected, setSelected] = useState<SynagogueCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [studyRes, shulPortalsRes, orgPortalsRes, lessonsRes] = await Promise.all([
        supabase.from("study_day_events").select("*").eq("is_approved", true),
        supabase.from("synagogue_portals").select("*"),
        supabase.from("org_portals").select("*"),
        supabase.from("lessons").select("*").eq("is_approved", true),
      ]);

      const studyData = studyRes.data || [];
      const shulPortals = shulPortalsRes.data || [];
      const orgPortals = orgPortalsRes.data || [];
      const allLessons = lessonsRes.data || [];

      // 1) Plain study_day_events that are NOT linked to a synagogue portal
      const standaloneStudy: SynagogueCardData[] = studyData
        .filter((e) => !e.session_id || !shulPortals.some((p) => p.id === e.session_id))
        .map((e) => {
          const blocks = normalizeToBlocks(e.lessons, {
            schedule_type: e.schedule_type,
            event_date: e.event_date,
            schedule_days: e.schedule_days,
          });
          return { e, blocks };
        })
        .filter(({ blocks }) => !isFullyExpired(blocks, today))
        .map(({ e, blocks }) => {
          const liveBlocks = blocks.filter(
            (b) => !(b.kind === "date" && b.date && b.date < today),
          );
          const flat = flattenWithDayLabel(liveBlocks);
          return {
            id: `sd-${e.id}`,
            source: "study_day" as const,
            synagogue_name: e.synagogue_name,
            city: e.city,
            street: e.street || "",
            street_number: e.street_number || "",
            logo_url: e.logo_url || "",
            schedule_type: e.schedule_type as any,
            event_date: e.event_date,
            schedule_days: e.schedule_days,
            lessons: flat,
            blocks: liveBlocks,
            donation_link: e.donation_link || "",
          };
        })
        .filter((c) => c.lessons.length > 0);

      // 2) Synagogue portals — combine their study_day_events + their lessons
      const shulCards: SynagogueCardData[] = shulPortals
        .map((p) => {
          const portalEvents = studyData.filter((e) => e.session_id === p.id);
          const allBlocks: ScheduleBlock[] = [];
          for (const e of portalEvents) {
            const bs = normalizeToBlocks(e.lessons, {
              schedule_type: e.schedule_type,
              event_date: e.event_date,
              schedule_days: e.schedule_days,
            });
            allBlocks.push(...bs);
          }
          const portalLessons = allLessons.filter((l) => l.synagogue_portal_id === p.id);
          allBlocks.push(...lessonsToBlocks(portalLessons));

          const live = allBlocks.filter(
            (b) => !(b.kind === "date" && b.date && b.date < today),
          );
          if (!live.length) return null;
          const flat = flattenWithDayLabel(live);
          if (!flat.length) return null;
          return {
            id: `sp-${p.id}`,
            source: "lesson" as const,
            synagogue_name: p.synagogue_name,
            city: p.city || "",
            street: p.street || "",
            street_number: p.street_number || "",
            logo_url: p.logo_url || "",
            schedule_type: null,
            event_date: null,
            schedule_days: null,
            lessons: flat,
            blocks: live,
            donation_link: p.donation_link || "",
          } as SynagogueCardData;
        })
        .filter((x): x is SynagogueCardData => x !== null);

      // 3) Org portals — group by org_name, attach all approved lessons
      const orgCards: SynagogueCardData[] = orgPortals
        .map((p) => {
          const orgLessons = allLessons.filter((l) => l.org_name === p.org_name);
          if (!orgLessons.length) return null;
          const blocks = lessonsToBlocks(orgLessons);
          const live = blocks.filter(
            (b) => !(b.kind === "date" && b.date && b.date < today),
          );
          if (!live.length) return null;
          const flat = flattenWithDayLabel(live);
          if (!flat.length) return null;
          return {
            id: `op-${p.id}`,
            source: "lesson" as const,
            synagogue_name: p.org_name,
            city: orgLessons[0]?.city || "",
            street: "",
            street_number: "",
            logo_url: p.logo_url || "",
            schedule_type: null,
            event_date: null,
            schedule_days: null,
            lessons: flat,
            blocks: live,
            donation_link: "",
          } as SynagogueCardData;
        })
        .filter((x): x is SynagogueCardData => x !== null);

      setItems([...shulCards, ...standaloneStudy, ...orgCards]);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Duplicate for seamless loop
  const loop = useMemo(() => [...items, ...items], [items]);

  if (loading || items.length === 0) return null;

  return (
    <section className="py-16 bg-gradient-to-b from-[hsl(40_50%_98%)] via-[hsl(180_30%_97%)] to-[hsl(40_50%_98%)] overflow-hidden">
      <div className="container mx-auto px-6 mb-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
            <BookOpen className="w-3 h-3" />
            בתי כנסת • ארגונים • ימי עיון
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-black mb-3">
            <span className="text-foreground">השיעורים </span>
            <span className="text-gold">סביבכם</span>
          </h2>
          <p className="font-body text-muted-foreground">
            בתי כנסת, ארגונים וימי עיון ברחבי הארץ.
          </p>
        </div>
      </div>

      <div className="relative group" dir="ltr">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[hsl(40_50%_98%)] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[hsl(40_50%_98%)] to-transparent z-10" />
        <motion.div
          className="flex gap-5 px-6 group-hover:[animation-play-state:paused]"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 140, ease: "linear", repeat: Infinity }}
          style={{ width: "max-content" }}
          whileHover={{ animationPlayState: "paused" }}
        >
          {loop.map((card, i) => (
            <div key={`${card.id}-${i}`} dir="rtl">
              <SynagogueCard data={card} onClick={() => setSelected(card)} />
            </div>
          ))}
        </motion.div>
      </div>

      <SynagogueDetailModal open={!!selected} onClose={() => setSelected(null)} data={selected} />
    </section>
  );
}
