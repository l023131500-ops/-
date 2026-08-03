'use client';

import { useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import type { Place } from '@/lib/googlemaps';
import { distanceText, walkApprox } from '@/lib/report';

/**
 * §8 בגרסה 2 · רקע השכונה — **על המגורים, לא על המאה הקודמת**.
 *
 * מה שהיה כאן קודם: תקציר ויקיפדיה על היישוב ועל השכונה, שרובו היסטוריה.
 * המפרט קובע במפורש שזה לא מה שקונה דירה צריך: "לא היסטוריה של המאה
 * הקודמת... העיקר: מגורים, נוחות, אזור, מרכזים, טיולים." ההיסטוריה לא נמחקה —
 * היא ירדה לקישור "קרא עוד" למי שרוצה להעמיק.
 *
 * מה שיש כאן במקום, וכולו נבנה מנתונים שכבר נאספו לדוח (בלי עלות נוספת):
 * מי גר כאן · אופי דתי וקהילתי (בתי כנסת, מקוואות, חינוך) · נוחות יומיומית
 * (מסחר, בריאות) · תחבורה ונגישות · פנאי וטיולים.
 *
 * ⚠️ "מותאם לכל הציבורים כולל חרדים ודתיים" אינו סעיף נפרד אלא שכבה: בתי
 * הכנסת והמקוואות מוצגים באותה בולטות כמו הסופרמרקט והתחנה, ולא כהערת שוליים.
 */

export default function NeighborhoodProfile({ report }: { report: PropertyReport }) {
  const [readMore, setReadMore] = useState(false);
  const b = report.background;
  const p = report.places;

  const nearest = (list: Place[]): Place | null =>
    list.length ? [...list].sort((a, c) => a.straightMeters - c.straightMeters)[0] : null;

  const nb = b.neighborhoodDisplay ?? b.neighborhoodName ?? null;
  const city = report.title.city;
  const where = nb ? `שכונת ${nb}${city ? `, ${city}` : ''}` : city ?? 'האזור';

  const mikve = report.mikvaot.length
    ? [...report.mikvaot]
        .filter((m) => m.meters != null)
        .sort((a, c) => (a.meters ?? 1e9) - (c.meters ?? 1e9))[0] ?? report.mikvaot[0]
    : null;

  /** קבוצה מוצגת רק כשיש בה נתון אמיתי. אין נתון → הקבוצה לא מומצאת. */
  const groups: {
    title: string;
    lead: string;
    items: { label: string; detail: string }[];
  }[] = [];

  // ---- אופי דתי וקהילתי ----
  const shuls = p.religion ?? [];
  const relItems: { label: string; detail: string }[] = [];
  if (shuls.length) {
    const n = nearest(shuls)!;
    relItems.push({
      label: `${shuls.length} בתי כנסת ומוסדות דת בטווח שנבדק`,
      detail: `הקרוב: ${n.name}, ${distanceText(n.straightMeters)}${
        n.walkSeconds != null ? ` · ${walkApprox(n.walkSeconds)} הליכה` : ''
      }`,
    });
  }
  if (mikve) {
    relItems.push({
      label: 'מקווה',
      detail: `${mikve.name}${mikve.meters != null ? `, ${distanceText(mikve.meters)}` : ''}${
        mikve.hoursShabbat ? ` · שעות שבת: ${mikve.hoursShabbat}` : ''
      }`,
    });
  }
  if (relItems.length) {
    groups.push({
      title: 'אופי דתי וקהילתי',
      lead: 'מה שקובע את שגרת השבוע והשבת של מי שגר כאן.',
      items: relItems,
    });
  }

  // ---- חינוך ----
  const edu = p.education ?? [];
  const pre = p.preschool ?? [];
  const eduItems: { label: string; detail: string }[] = [];
  if (edu.length) {
    const n = nearest(edu)!;
    eduItems.push({
      label: `${edu.length} מוסדות חינוך בטווח שנבדק`,
      detail: `הקרוב: ${n.name}, ${distanceText(n.straightMeters)}${
        n.walkSeconds != null ? ` · ${walkApprox(n.walkSeconds)} הליכה` : ''
      }`,
    });
  }
  if (pre.length) {
    const n = nearest(pre)!;
    eduItems.push({
      label: `${pre.length} גנים ומעונות`,
      detail: `הקרוב: ${n.name}, ${distanceText(n.straightMeters)}`,
    });
  }
  if (eduItems.length) {
    groups.push({
      title: 'חינוך',
      lead: 'מה יש בטווח הליכה, ומה המרחק בפועל.',
      items: eduItems,
    });
  }

  // ---- נוחות יומיומית ----
  const conv: { label: string; detail: string }[] = [];
  const com = nearest(p.commerce ?? []);
  if (com) {
    conv.push({
      label: `מסחר וקניות — ${(p.commerce ?? []).length} בטווח שנבדק`,
      detail: `הקרוב: ${com.kind} ${com.name}, ${distanceText(com.straightMeters)}${
        com.walkSeconds != null ? ` · ${walkApprox(com.walkSeconds)} הליכה` : ''
      }`,
    });
  }
  const hea = nearest(p.health ?? []);
  if (hea) {
    conv.push({
      label: `בריאות — ${(p.health ?? []).length} בטווח שנבדק`,
      detail: `הקרוב: ${hea.kind} ${hea.name}, ${distanceText(hea.straightMeters)}`,
    });
  }
  // בית החולים מגיע בתוך קבוצת הבריאות ולא כשדה נפרד בדוח.
  const hospital = (p.health ?? []).find((h) => /בית\s*חולים|hospital/i.test(`${h.kind} ${h.name}`));
  if (hospital) {
    conv.push({
      label: 'בית החולים הקרוב',
      detail: `${hospital.name}, ${distanceText(hospital.straightMeters)}`,
    });
  }
  if (conv.length) {
    groups.push({
      title: 'נוחות יומיומית',
      lead: 'קניות, שירותים ובריאות — כמה רחוק הכול באמת.',
      items: conv,
    });
  }

  // ---- תחבורה ונגישות ----
  const trans: { label: string; detail: string }[] = [];
  if (report.transitStops.length) {
    const s = report.transitStops[0];
    const lines = (s.lines ?? []).map((l: any) => l.routeShortName ?? l.route ?? '').filter(Boolean);
    trans.push({
      label: `${report.transitStops.length} תחנות תחבורה ציבורית בטווח הליכה`,
      detail: `הקרובה: ${s.name}${
        lines.length ? ` · קווים: ${lines.slice(0, 8).join(', ')}` : ''
      }`,
    });
  } else if ((p.transport ?? []).length) {
    const n = nearest(p.transport)!;
    trans.push({
      label: `${p.transport.length} תחנות בסביבה`,
      detail: `הקרובה: ${n.name}, ${distanceText(n.straightMeters)}`,
    });
  }
  if (b.junction) {
    trans.push({
      label: 'הצומת הראשית הקרובה',
      detail: `${b.junction.name}, כ-${b.junction.meters} מ׳ מכאן`,
    });
  }
  if (trans.length) {
    groups.push({ title: 'תחבורה ונגישות', lead: 'איך יוצאים מכאן, ולאן.', items: trans });
  }

  // ---- פנאי וטיולים ----
  const lei = p.leisure ?? [];
  if (lei.length) {
    const n = nearest(lei)!;
    groups.push({
      title: 'פנאי, פארקים וטיולים',
      lead: 'מה יש לעשות באזור מחוץ לבית.',
      items: [
        {
          label: `${lei.length} פארקים, גינות ומוקדי פנאי בטווח שנבדק`,
          detail: `הקרוב: ${n.kind} ${n.name}, ${distanceText(n.straightMeters)}`,
        },
      ],
    });
  }

  const pop = b.population;
  const hasHistory = !!(b.localityArticle || b.neighborhoodArticle);

  if (!groups.length && !pop && !b.neighborhoodDescription && !hasHistory) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-black text-navy">איך זה לגור כאן</h2>
      <p className="mt-1 text-[13px] text-muted">
        {where} — אופי המקום, מי גר בו, ומה יש מסביב. הכול מהמרחקים והמוסדות שנמדדו בפועל.
      </p>

      {/* ---- מי גר כאן ---- */}
      {pop && (
        <div className="mt-4 rounded-xl border border-line bg-bgsoft p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-black text-navy">מי גר כאן</h3>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              הערכה
            </span>
          </div>
          <p className="mt-1 text-[14.5px] font-bold text-ink">{pop.headline}</p>
          {pop.breakdown?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {pop.breakdown.slice(0, 5).map((g) => (
                <li key={g.group} className="flex items-baseline justify-between text-[13px]">
                  <span className="text-ink">{g.label}</span>
                  <span className="font-bold text-navy">{g.pct}%</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            אפיון האוכלוסייה הוא הערכה ברמת האזור, ולא נתון על הבניין או על השכנים הישירים.
          </p>
        </div>
      )}

      {/* ---- אופי הבנייה ---- */}
      {b.buildingCharacter && (
        <p className="mt-4 text-[14px] leading-relaxed text-ink">
          <b className="text-navy">אופי הבנייה באזור:</b> {b.buildingCharacter.headline}.
        </p>
      )}

      {/* ---- הקבוצות ---- */}
      {groups.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title} className="rounded-xl border border-line p-4">
              <h3 className="text-[15px] font-black text-navy">{g.title}</h3>
              <p className="mt-0.5 text-[12px] text-muted">{g.lead}</p>
              <ul className="mt-2 space-y-2">
                {g.items.map((it) => (
                  <li key={it.label} className="text-[13.5px] leading-relaxed">
                    <div className="font-semibold text-ink">{it.label}</div>
                    <div className="text-muted">{it.detail}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {groups.length === 0 && (
        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          לא נאספו מוסדות ומרחקים לאזור הזה בדוח הנוכחי, ולכן אין באפשרותנו לתאר את נוחות
          המגורים בו. הרשימה המלאה — מוסדות, מסחר, בריאות ופנאי עם זמני הליכה — נכללת בדוח
          הפרימיום.
        </p>
      )}

      {/* ---- קרא עוד: הרקע ההיסטורי, למי שרוצה ---- */}
      {(hasHistory || b.neighborhoodDescription) && (
        <div className="mt-4 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setReadMore((v) => !v)}
            aria-expanded={readMore}
            className="inline-block py-1.5 text-[13px] font-bold text-tealD hover:underline"
          >
            {readMore ? 'סגור את הרקע על המקום' : 'קרא עוד על המקום — רקע והיסטוריה ←'}
          </button>
          {readMore && (
            <div className="mt-2 space-y-3">
              {b.neighborhoodDescription && (
                <p className="text-[14px] leading-relaxed text-ink">{b.neighborhoodDescription}</p>
              )}
              {b.localityArticle && (
                <ArticleBlock title={b.localityArticle.title} article={b.localityArticle} />
              )}
              {b.neighborhoodArticle && (
                <ArticleBlock title={b.neighborhoodArticle.title} article={b.neighborhoodArticle} />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ArticleBlock({ title, article }: { title: string; article: any }) {
  return (
    <div>
      <h4 className="text-[14px] font-black text-navy">{title}</h4>
      {article.summary && (
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{article.summary}</p>
      )}
      {article.url && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block py-1 text-[12.5px] font-bold text-tealD hover:underline"
        >
          למאמר המלא ←
        </a>
      )}
    </div>
  );
}
