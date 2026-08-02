import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Clock, HandCoins, MapPin, Megaphone, Moon, Sparkles, Sun, Sunrise,
} from "lucide-react";
import type { PrayerTime } from "@/lib/types";
import { computeDailyZmanim, formatZman, nextZman } from "@/lib/zmanim";
import { useNow } from "@/hooks/useNow";
import { useAnnouncements, useLessons, usePrayerTimes, useSynagogue } from "@/hooks/useData";
import { useTheme } from "@/hooks/useTheme";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InquiryForm } from "@/components/InquiryForm";

const PRAYER_GROUPS = [
  { type: "shacharit", label: "שחרית", icon: Sunrise },
  { type: "mincha", label: "מנחה", icon: Sun },
  { type: "arvit", label: "ערבית", icon: Moon },
  { type: "special", label: "תפילות מיוחדות", icon: Sparkles },
] as const;

function isSafeHttps(url: string | null): url is string {
  return !!url && /^https:\/\//i.test(url);
}

export function SynagogueSite() {
  const { slug = "" } = useParams();
  const { theme, toggle } = useTheme();
  const now = useNow(30_000);
  const { data: synagogue, isLoading } = useSynagogue(slug);
  const { data: prayerTimes } = usePrayerTimes(synagogue?.id);
  const { data: lessons } = useLessons(synagogue?.id);
  const { data: announcements } = useAnnouncements(synagogue?.id);

  if (isLoading) {
    return (
      <div className="container-page py-24">
        <Skeleton className="mx-auto h-64 max-w-4xl rounded-xl" />
      </div>
    );
  }

  if (!synagogue) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-bold">בית הכנסת לא נמצא</h1>
        <p className="mt-3 text-muted-foreground">ייתכן שהכתובת שגויה או שהדף טרם פורסם.</p>
        <Link to="/batei-knesset" className="mt-6 link-hit gap-1.5 font-semibold text-accent">
          <ArrowLeft className="h-4 w-4" /> לכל בתי הכנסת
        </Link>
      </div>
    );
  }

  const daily = computeDailyZmanim(now);
  const upcoming = nextZman(daily, now);
  const grouped = PRAYER_GROUPS.map((g) => ({
    ...g,
    items: (prayerTimes ?? []).filter((p: PrayerTime) => p.type === g.type),
  })).filter((g) => g.items.length > 0);

  const initial = synagogue.name.replace(/^בית (ה)?כנסת |^בית המדרש /, "").charAt(0);

  return (
    <div className="min-h-screen bg-background">
      {/* branded top bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {synagogue.logoUrl ? (
              <img src={synagogue.logoUrl} alt={`לוגו ${synagogue.name}`} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-lg text-white shadow-soft" style={{ background: synagogue.brandGradient }}>
                <span className="font-display font-bold">{initial}</span>
              </span>
            )}
            <span className="font-display text-lg font-bold">{synagogue.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-secondary" aria-label="החלפת מצב תצוגה">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
              לאתר המרכזי <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* branded hero */}
      <section className="relative overflow-hidden text-white" style={{ background: synagogue.brandGradient }}>
        <div className="absolute inset-0 bg-black/20" aria-hidden />
        <div className="container-page relative py-20 text-center">
          <Reveal>
            {synagogue.logoUrl ? (
              <img src={synagogue.logoUrl} alt="" className="mx-auto mb-5 h-20 w-20 rounded-2xl border border-white/20 object-cover" />
            ) : (
              <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl border border-white/20 bg-white/10 font-display text-3xl font-bold backdrop-blur">
                {initial}
              </span>
            )}
            <h1 className="font-display text-4xl font-bold sm:text-5xl">{synagogue.name}</h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-white/85">
              {synagogue.nusach && <span className="rounded-full border border-white/25 px-3 py-1 text-sm">נוסח {synagogue.nusach}</span>}
              {synagogue.address && (
                <span className="inline-flex items-center gap-1.5 text-sm"><MapPin className="h-4 w-4" /> {synagogue.address}</span>
              )}
            </div>
            {synagogue.description && <p className="mx-auto mt-4 max-w-xl text-white/80">{synagogue.description}</p>}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">{daily.hebrewDate}</span>
              {upcoming && (
                <span className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                  {upcoming.label}: <strong className="tabular-nums">{formatZman(upcoming.time)}</strong>
                </span>
              )}
              {isSafeHttps(synagogue.donationLink) && (
                <a href={synagogue.donationLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-[hsl(209_63%_16%)] shadow-soft hover:brightness-95">
                  <HandCoins className="h-4 w-4" /> לתרומה
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container-page space-y-16 py-16">
        {/* prayer times */}
        <section>
          <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">זמני התפילות</h2>
          {grouped.length === 0 ? (
            <EmptyState icon={Clock} title="זמני התפילות יעודכנו בקרוב" description="הגבאי יעדכן את זמני התפילות מאזור הניהול." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {grouped.map((g) => (
                <div key={g.type} className="rounded-lg border border-border bg-card p-5 shadow-soft">
                  <div className="mb-3 flex items-center gap-2 text-accent">
                    <g.icon className="h-5 w-5" aria-hidden />
                    <h3 className="font-display text-lg font-bold text-foreground">{g.label}</h3>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">{p.label}{p.note ? ` · ${p.note}` : ""}</span>
                        <span className="text-lg font-semibold tabular-nums">{p.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* today's zmanim */}
        <section>
          <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">זמני היום</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {daily.zmanim.map((z) => (
              <div key={z.key} className="rounded-lg border border-border bg-card p-4 text-center shadow-soft">
                <div className="text-sm text-muted-foreground">{z.label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{formatZman(z.time)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* lessons */}
        <section>
          <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">שיעורי תורה</h2>
          {(lessons ?? []).length === 0 ? (
            <EmptyState icon={BookOpen} title="אין שיעורים מעודכנים" description="הגבאי יוכל להוסיף שיעורים מאזור הניהול." />
          ) : (
            <div className="mx-auto grid max-w-3xl gap-4">
              {lessons!.map((l, i) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-soft">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><BookOpen className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-semibold text-foreground">{l.title}</h3>
                    <div className="text-sm text-muted-foreground">{[l.day, l.time, l.teacher].filter(Boolean).join(" · ")}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* announcements */}
        {(announcements ?? []).length > 0 && (
          <section>
            <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">מודעות והודעות</h2>
            <div className="mx-auto grid max-w-3xl gap-4">
              {announcements!.map((a) => (
                <div key={a.id} className="rounded-lg border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center gap-2 text-gold"><Megaphone className="h-5 w-5" aria-hidden />
                    <h3 className="font-display text-lg font-bold text-foreground">{a.title}</h3>
                  </div>
                  {a.body && <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* contact */}
        <section>
          <h2 className="mb-6 text-center font-display text-2xl font-bold sm:text-3xl">יצירת קשר עם בית הכנסת</h2>
          <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-6 shadow-soft">
            <InquiryForm synagogueId={synagogue.id} compact />
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-secondary/40">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>{synagogue.name}</span>
          <Link to="/" className="link-hit gap-1.5 hover:text-foreground">
            חלק ממערכת מחוברים · המועצה הדתית חצור הגלילית <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
