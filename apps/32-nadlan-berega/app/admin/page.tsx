import { cookies } from 'next/headers';
import RequestsBoard from '@/components/admin/RequestsBoard';
import SavedReportsBoard from '@/components/admin/SavedReportsBoard';
import SessionGate from '@/components/admin/SessionGate';
import { ADMIN_COOKIE, verifyAdminCookie } from '@/lib/adminauth';
import { aiProviders, envStatus, sourceHealth, systemLinks } from '@/lib/adminconfig';
import { costBreakdown, totalCost } from '@/lib/costs';
import type { ReportTier } from '@/lib/report';
import { TIER_LABEL } from '@/lib/report';
import { TABU_DOC_LIST, tabuMode } from '@/lib/tabu';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * מרכז השליטה.
 * ⚠️ מוצגות רק ארבע הספרות האחרונות של כל מפתח — אף ערך מלא לא מגיע לדפדפן.
 * כשמוגדר ADMIN_TOKEN, הכניסה דורשת אותו (?key=...).
 */
export default function AdminPage({ searchParams }: { searchParams: { key?: string } }) {
  const gate = process.env.ADMIN_TOKEN?.trim();
  // שני מפתחות לאותה דלת: הטוקן ההיסטורי, או סשן ניהול מאושר של הפלטפורמה
  // (עוגייה חתומה שנכתבת רק אחרי אימות מול ההאב). בעל הפלטפורמה מחובר ממילא,
  // ואין סיבה שיחזיק טוקן נפרד לכל מערכת.
  const bySession = verifyAdminCookie(cookies().get(ADMIN_COOKIE)?.value);
  if (gate && searchParams.key !== gate && !bySession) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="text-2xl font-black text-navy">אזור מוגן</h1>
        <p className="mt-2 text-muted">
          נכנסים עם חשבון הניהול של more30, או מוסיפים לכתובת{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5">?key=…</code>.
        </p>
        <SessionGate />
      </div>
    );
  }

  const envs = envStatus();
  const missing = envs.filter((e) => e.required && !e.configured);
  const apifyMax = Number(process.env.APIFY_MAX_ITEMS) || 20;
  const tiers: ReportTier[] = ['basic', 'premium', 'vip'];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header>
        <h1 className="text-3xl font-black text-navy">מרכז שליטה</h1>
        <p className="mt-1 text-muted">
          מה מחובר, מה חסר, וכמה עולה כל דוח. מפתחות מוצגים בארבע ספרות אחרונות בלבד.
        </p>
      </header>

      {missing.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <b>חסרים {missing.length} מפתחות חובה:</b> {missing.map((m) => m.name).join(', ')}
        </div>
      )}

      {!process.env.ADMIN_TOKEN && (
        <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-[#7a5f1f]">
          העמוד הזה אינו מוגן כרגע. כדי לנעול אותו, הגדר משתנה סביבה{' '}
          <code className="rounded bg-surface/60 px-1.5 py-0.5">ADMIN_TOKEN</code> וגש עם{' '}
          <code className="rounded bg-surface/60 px-1.5 py-0.5">?key=…</code>.
        </div>
      )}

      {/* ===== תור הבקשות — ההתראה שהמפרט מגדיר ===== */}
      <Section
        title="בקשות דוח"
        note="כל בקשה שנרשמה באתר. ההפקה והשליחה למייל הן פעולה אחת, ולכל בקשה אפשר להעלות נסח טאבו ולנתח אותו — הניתוח מצורף לדוח לפי הדירה או הכניסה."
      >
        {process.env.ADMIN_TOKEN ? (
          <RequestsBoard token={searchParams.key ?? ''} />
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            תור הבקשות נעול עד שיוגדר <code>ADMIN_TOKEN</code>. המסלול קורא כתובות מייל של
            לקוחות ושולח מיילים, ולכן הוא לא נפתח כברירת מחדל.
          </div>
        )}
      </Section>

      {/* ===== §8 · כל הדוחות השמורים, עם הקישור הקבוע של כל נכס ===== */}
      <Section
        title="דוחות שמורים"
        note="כל נכס שנבדק נשמר כאן עם קישור ייעודי קבוע. הקישור אינו משתנה בין הפקות, וכל מסמך שיצורף לנכס יופיע תחתיו."
      >
        <SavedReportsBoard token={searchParams.key ?? ''} />
      </Section>

      {/* ===== מפתחות ===== */}
      <Section title="מפתחות ומשתני סביבה" note="לכל מפתח: למה הוא משמש ומה נשבר בלעדיו.">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[860px] text-right text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[12px] text-muted">
                <th className="px-4 py-3 font-semibold">מפתח</th>
                <th className="px-4 py-3 font-semibold">מטרה</th>
                <th className="px-4 py-3 font-semibold">בלעדיו</th>
                <th className="px-4 py-3 font-semibold">ערך</th>
                <th className="px-4 py-3 font-semibold">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {envs.map((e) => (
                <tr key={e.name} className="border-b border-line/60 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <code className="text-[12px] font-bold text-navy">{e.name}</code>
                    {e.required && <span className="mr-1.5 text-[10px] text-red-600">חובה</span>}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-[13px] leading-relaxed text-ink">
                    {e.purpose}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-[12px] leading-relaxed text-muted">
                    {e.impact}
                  </td>
                  <td className="px-4 py-3">
                    {e.configured ? (
                      <code className="rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-700">
                        {e.secret ? `••••${e.tail}` : `…${e.tail}`}
                      </code>
                    ) : (
                      <span className="text-[12px] text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.configured ? (
                      <Pill tone="ok">מחובר</Pill>
                    ) : e.required ? (
                      <Pill tone="bad">נדרש</Pill>
                    ) : (
                      <div>
                        <Pill tone="warn">לא מוגדר</Pill>
                        {e.getUrl && (
                          <a
                            href={e.getUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-[11px] font-bold text-tealD hover:underline"
                          >
                            להוספה ←
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ===== עלות הפקה ===== */}
      <Section
        title="עלות הפקה לכל דוח"
        note="מקורות ממשלתיים הם בחינם ואינם מופיעים כאן. העלות היא רק על ספקים בתשלום."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {tiers.map((t) => {
            const lines = costBreakdown(t, apifyMax);
            const total = totalCost(lines);
            return (
              <div key={t} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-black text-navy">{TIER_LABEL[t]}</h3>
                  <div className="text-left">
                    <div className="text-2xl font-black text-tealD">${total.toFixed(3)}</div>
                    <div className="text-[11px] text-muted">≈ {(total * 3.7).toFixed(2)} ₪</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {lines.map((l, i) => (
                    <li key={i} className="border-b border-line/60 pb-2 last:border-0">
                      <div className="flex justify-between gap-2 text-[13px]">
                        <span className="font-semibold text-ink">{l.label}</span>
                        <span className="shrink-0 font-bold text-navy">${l.usd.toFixed(3)}</span>
                      </div>
                      <div className="text-[11px] text-muted">{l.detail}</div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          איתור הקלפיות נשמר במטמון ומשותף לכל הדוחות באותו יישוב — בפועל רק הדוח הראשון
          בכל עיר משלם עליו. תקרת המודעות נקבעת ב-<code>APIFY_MAX_ITEMS</code> (כרגע {apifyMax}).
        </p>
      </Section>

      {/* ===== ספקי AI ===== */}
      <Section title="ספקי AI" note="מה כל ספק עושה, האם הוא מחובר, ואיפה מוסיפים מפתח וקרדיטים.">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[12px] text-muted">
                <th className="px-4 py-3 font-semibold">ספק</th>
                <th className="px-4 py-3 font-semibold">מה הוא עושה</th>
                <th className="px-4 py-3 font-semibold">מפתח</th>
                <th className="px-4 py-3 font-semibold">קרדיטים</th>
                <th className="px-4 py-3 font-semibold">הוספה</th>
              </tr>
            </thead>
            <tbody>
              {aiProviders().map((p) => (
                <tr key={p.envVar} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-bold text-navy">{p.name}</td>
                  <td className="max-w-[280px] px-4 py-3 text-[13px] leading-relaxed text-ink">
                    {p.does}
                  </td>
                  <td className="px-4 py-3">
                    {p.configured ? (
                      <code className="rounded bg-slate-100 px-2 py-1 text-[12px]">••••{p.tail}</code>
                    ) : (
                      <Pill tone="warn">לא מוגדר</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={p.creditsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-bold text-tealD hover:underline"
                    >
                      בדיקת יתרה ←
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={p.addUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-bold text-tealD hover:underline"
                    >
                      הוספת מפתח ←
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ===== סטטוס מקורות ===== */}
      <Section title="סטטוס המקורות" note="מה עובד באמת, מה דורש מפתח, ומה חייב טיפול ידני.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sourceHealth().map((s) => (
            <div key={s.name} className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-navy">{s.name}</div>
                <Pill tone={s.status === 'live' ? 'ok' : s.status === 'needs_key' ? 'warn' : 'info'}>
                  {s.status === 'live' ? 'אמת' : s.status === 'needs_key' ? 'נדרש מפתח' : 'ידני'}
                </Pill>
              </div>
              <div className="mt-1 text-[12px] text-muted">{s.what}</div>
              <div className="mt-2 text-[12px] leading-relaxed text-ink">{s.note}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ===== קישורים ===== */}
      <Section title="קישורי המערכת" note="כל מה שצריך לניהול שוטף.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {systemLinks().map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-line bg-surface p-4 shadow-card transition hover:border-teal"
            >
              <div className="font-bold text-navy">{l.label}</div>
              <div className="mt-1 text-[12px] text-muted">{l.note}</div>
              <div className="mt-2 truncate text-[11px] text-tealD">{l.url}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section
        title="נסחי טאבו — עלות לכל נסח"
        note={
          tabuMode() === 'provider_api'
            ? 'מצב: ספק צד-ג\' מוגדר (TABU_API_URL + TABU_API_KEY). הזמנה מבוצעת רק לאחר אישור מפורש.'
            : 'מצב: הזמנה רשמית מ-gov.il לפי דרישה. להפעלת ספק צד-ג\' יש להגדיר TABU_API_URL וגם TABU_API_KEY.'
        }
      >
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-[12px] text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">סוג הנסח</th>
                <th className="px-3 py-2 font-semibold">עלות</th>
                <th className="px-3 py-2 font-semibold">מה הוא כולל</th>
              </tr>
            </thead>
            <tbody>
              {TABU_DOC_LIST.map((d) => (
                <tr key={d.type} className="border-t border-line">
                  <td className="px-3 py-2.5 font-semibold text-navy">{d.labelHe}</td>
                  <td className="px-3 py-2.5 font-bold text-ink">{d.costIls} ₪</td>
                  <td className="px-3 py-2.5 text-[12px] text-muted">{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-black text-navy">{title}</h2>
      {note && <p className="mb-3 mt-0.5 text-[13px] text-muted">{note}</p>}
      {children}
    </section>
  );
}

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info'; children: React.ReactNode }) {
  const cls = {
    ok: 'bg-teal/10 text-tealD border-teal/30',
    warn: 'bg-gold/15 text-[#8a6d24] border-gold/40',
    bad: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-slate-100 text-slate-600 border-slate-300',
  }[tone];
  return (
    <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {children}
    </span>
  );
}
