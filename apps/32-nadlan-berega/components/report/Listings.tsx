'use client';

import type { Listing } from '@/lib/apify';
import type { ReportTier } from '@/lib/report';
import type { AssetType } from '@/lib/assettype';

/**
 * ⚠️ הרכיב הזה משרת שלוש זרימות, ולכן הטקסט שלו אינו יכול להיות "דירות
 * שמוצעות למכירה". נמצא במסך אמיתי: בדוח מסחרי הוא כתב "לא נמצאו דירות
 * שמוצעות למכירה כרגע באזור הזה" מתחת לכותרת "הנכס המסחרי".
 */
const NOUN: Record<AssetType, { plural: string; headline: string; teaser: string }> = {
  residential: {
    plural: 'דירות שמוצעות למכירה',
    headline: 'דירות מוצעות כרגע באזור',
    teaser: 'אילו דירות מוצעות למכירה ברגע זה באזור, באיזה מחיר, וכמה זמן כל מודעה כבר באוויר',
  },
  rental: {
    plural: 'דירות שמוצעות להשכרה',
    headline: 'מודעות שכירות באזור',
    teaser: 'אילו דירות מוצעות להשכרה ברגע זה באזור, באיזה מחיר, ומה שכר הדירה למ"ר',
  },
  commercial: {
    plural: 'נכסים מסחריים שמוצעים',
    headline: 'נכסים מסחריים המוצעים כרגע',
    teaser: 'אילו נכסים מסחריים מוצעים ברגע זה באזור, באיזה מחיר, וכמה זמן כל מודעה באוויר',
  },
  land: {
    plural: 'מגרשים שמוצעים',
    headline: 'מגרשים המוצעים כרגע',
    teaser: 'מה מוצע כרגע באזור ובאיזה מחיר',
  },
};

export default function Listings({
  listings,
  status,
  tier,
  assetType = 'residential',
}: {
  listings: Listing[];
  status: {
    configured: boolean;
    costUsd: number;
    sourcesOk: ('yad2' | 'madlan')[];
    notices: string[];
  };
  tier: ReportTier;
  assetType?: AssetType;
}) {
  const noun = NOUN[assetType];

  if (tier === 'basic') {
    return (
      <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-6 shadow-card">
        <div className="text-lg font-black text-[#7a5f1f]">נפתח בדוח המקיף</div>
        <p className="mt-2 text-sm leading-relaxed text-[#7a5f1f]">
          בדוח המקיף תראה {noun.teaser} — נתון שמלמד אם המחיר שמבקשים ריאלי.
        </p>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="text-lg font-black text-navy">דורש מקור מורשה</div>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          המידע על נכסים שמוצעים כרגע מגיע מלוחות המודעות. כדי להציג אותו צריך חיבור לספק
          מורשה, וכרגע אין חיבור פעיל. לא נציג כאן מודעות משוערות — רק נתונים אמיתיים.
        </p>
      </div>
    );
  }

  // הודעה על לוח שלא נמשך — בעברית מדוברת, בתוך הסעיף, בלי להבהיל.
  const notices = status.notices.length > 0 && (
    <div className="mt-4 space-y-2">
      {status.notices.map((n, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600"
        >
          {n}
        </div>
      ))}
    </div>
  );

  if (!listings.length) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="text-[14px] leading-relaxed text-muted">
          לא נמצאו {noun.plural} כרגע באזור הזה.
        </div>
        {notices}
      </div>
    );
  }

  const sourceNames = status.sourcesOk.map((s) => (s === 'yad2' ? 'יד2' : 'מדלן'));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-black text-navy">
          {listings.length} {noun.headline}
        </h3>
        <p className="text-[12px] text-muted">
          {assetType === 'rental'
            ? 'אלה מחירי בקשה של משכירים — לא חוזים שנחתמו בפועל.'
            : 'אלה מחירי בקשה של מוכרים — לא מחירים שנסגרו בפועל.'}
          {sourceNames.length > 0 && ` המודעות נמשכו מ${sourceNames.join(' ומ')}.`}
        </p>
      </div>

      {notices}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {listings.slice(0, 24).map((l, i) => (
          <div key={i} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-navy">{l.address ?? 'כתובת לא צוינה'}</div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {[
                    l.rooms ? `${l.rooms} חדרים` : null,
                    l.areaSqm ? `${l.areaSqm} מ"ר` : null,
                    l.floor ? `קומה ${l.floor}${l.totalFloors ? ` מתוך ${l.totalFloors}` : ''}` : null,
                    l.yearBuilt ? `נבנה ב-${l.yearBuilt}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {l.source === 'yad2' ? 'יד2' : 'מדלן'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xl font-black text-navy">
                {l.price ? new Intl.NumberFormat('he-IL').format(l.price) + ' ₪' : 'מחיר לא צוין'}
              </span>
              {l.pricePerSqm && (
                <span className="text-[12px] text-muted">
                  {new Intl.NumberFormat('he-IL').format(l.pricePerSqm)} ₪ למ"ר
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {l.meters != null && <Tag>{l.meters} מ' מהנכס</Tag>}
              {l.daysListed != null && (
                <Tag highlight={l.daysListed > 90}>
                  {l.daysListed === 0 ? 'עלה היום' : `${l.daysListed} ימים באוויר`}
                </Tag>
              )}
              {l.byAgent === true && <Tag>מתיווך</Tag>}
              {l.byAgent === false && <Tag>מבעל הנכס</Tag>}
              {l.hasElevator && <Tag>מעלית</Tag>}
              {l.hasParking && <Tag>חניה</Tag>}
              {l.hasSecureRoom && <Tag>ממ"ד</Tag>}
            </div>

            {l.url && (
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[12px] font-bold text-tealD hover:underline"
              >
                לצפייה במודעה המקורית ←
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        מודעה שיושבת באוויר זמן רב עשויה להעיד על מחיר גבוה מדי או על ביקוש נמוך. מספר
        המודעות אינו מספר הנכסים — אותו נכס עשוי להתפרסם ביותר מלוח אחד.
      </p>
    </div>
  );
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-semibold ${
        highlight ? 'bg-gold/20 text-[#7a5f1f]' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </span>
  );
}
