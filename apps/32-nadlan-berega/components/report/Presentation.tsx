'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import type { AssetType } from '@/lib/assettype';
import { distanceText, walkText } from '@/lib/report';
import { apiUrl } from '@/lib/basepath';
import { MARKER_LABELS } from '@/lib/googlemaps';

/**
 * מצגת חיה להצגה מול לקוח — מסך מלא, ניווט בחצים.
 * נבנית מאותם נתונים של הדוח; אין כאן מספרים חדשים.
 *
 * `print` מרנדר את **כל** השקופיות זו אחר זו, בלי ניווט ובלי כפתורים, כדי
 * ש-`/api/deck` יוכל להדפיס אותן לקובץ. מצגת שמציגה שקופית אחת בכל רגע היא
 * מסך, לא מסמך — הדפסה שלה כמו שהיא הייתה מפיקה קובץ בן שקופית אחת.
 */
export default function Presentation({
  q,
  print = false,
  assetType = 'residential',
}: {
  q: string;
  print?: boolean;
  assetType?: AssetType;
}) {
  const [data, setData] = useState<PropertyReport | null>(null);
  const [i, setI] = useState(0);
  const [hiddenImages, setHiddenImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // אף שקופית אינה מציגה מודעות, ולכן במסלול הקובץ לא משלמים עליהן.
    const skip = print ? '&skipListings=1' : '';
    const type = assetType !== 'residential' ? `&type=${assetType}` : '';
    fetch(apiUrl(`/api/report?q=${encodeURIComponent(q)}&tier=vip${type}${skip}`))
      .then((r) => r.json())
      .then((d) => !d.error && setData(d))
      .catch(() => null);
  }, [q, print, assetType]);

  const slides = data ? buildSlides(data) : [];
  const total = slides.length;

  const go = useCallback(
    (d: number) => setI((v) => Math.min(Math.max(v + d, 0), Math.max(total - 1, 0))),
    [total],
  );

  /**
   * יציאה מהמצגת חוזרת לדוח שממנו היא נפתחה, ולא לדף ריק.
   * ⚠️ לא `router.back()`: מצגת שנפתחה בלשונית חדשה אין לה היסטוריה לחזור אליה,
   * והכפתור היה נשאר בלי תגובה. ניווט מפורש עובד בשני המקרים.
   */
  const exit = useCallback(() => {
    const type = assetType !== 'residential' ? `&type=${assetType}` : '';
    window.location.href = apiUrl(`/report?q=${encodeURIComponent(q)}${type}`);
  }, [q, assetType]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // RTL: חץ שמאל מתקדם, חץ ימין חוזר.
      if (e.key === 'ArrowLeft' || e.key === ' ') go(1);
      if (e.key === 'ArrowRight') go(-1);
      if (e.key === 'Escape') exit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, exit]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navysurface text-white">
        <div className="text-xl font-bold">טוען את המצגת…</div>
      </div>
    );
  }

  if (print) {
    return (
      <div data-deck-ready="1">
        <style>{DECK_PRINT_CSS}</style>
        {slides.map((s, k) => (
          <section key={k} className="hero-gradient deck-slide text-white">
            <div className="deck-inner">
              <SlideBody
                slide={s}
                imageHidden={Boolean(hiddenImages[k])}
                onImageError={() => setHiddenImages((h) => ({ ...h, [k]: true }))}
              />
            </div>
          </section>
        ))}
      </div>
    );
  }

  const slide = slides[i];

  return (
    <div className="hero-gradient flex min-h-screen flex-col text-white">
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-4xl">
          <SlideBody
            slide={slide}
            imageHidden={Boolean(hiddenImages[i])}
            onImageError={() => setHiddenImages((h) => ({ ...h, [i]: true }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/15 px-8 py-4">
        <div className="text-sm text-white/60">
          נדל"ן ברגע · {data.title.headline}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exit}
            aria-label="סגור את המצגת וחזור לדוח"
            className="rounded-lg border border-white/25 px-4 py-2 font-bold text-white/90 hover:bg-white/10"
          >
            סגור מצגת
          </button>
          <button
            onClick={() => go(-1)}
            disabled={i === 0}
            className="rounded-lg bg-white/10 px-4 py-2 font-bold disabled:opacity-30"
          >
            הקודם
          </button>
          <span className="text-sm text-white/70">
            {i + 1} / {total}
          </span>
          <button
            onClick={() => go(1)}
            disabled={i >= total - 1}
            className="rounded-lg bg-surface px-4 py-2 font-bold text-navy disabled:opacity-30"
          >
            הבא
          </button>
        </div>
      </div>
    </div>
  );
}

interface Slide {
  kicker: string;
  title: string;
  subtitle?: string;
  rows?: { label: string; value: string; note?: string }[];
  image?: string;
}

/** גוף השקופית — משותף למסך ולקובץ, כדי ששניהם לא ייפרדו עם הזמן. */
function SlideBody({
  slide,
  imageHidden,
  onImageError,
}: {
  slide: Slide;
  imageHidden: boolean;
  onImageError: () => void;
}) {
  return (
    <>
      <div className="text-sm font-bold tracking-widest text-goldL">{slide.kicker}</div>
      <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">{slide.title}</h1>
      {slide.subtitle && (
        <p className="mt-4 text-xl leading-relaxed text-white/85">{slide.subtitle}</p>
      )}

      {slide.rows && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {slide.rows.map((r, k) => (
            <div key={k} className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
              <div className="text-sm text-white/70">{r.label}</div>
              <div className="mt-1 text-2xl font-black">{r.value}</div>
              {r.note && <div className="mt-1 text-xs text-white/60">{r.note}</div>}
            </div>
          ))}
        </div>
      )}

      {slide.image && !imageHidden && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={slide.image}
          alt={slide.title}
          className="deck-image mt-8 w-full rounded-2xl border border-white/20 shadow-lift"
          // תמונה שאינה זמינה לא תישאר כמסגרת ריקה מול קהל.
          onError={onImageError}
        />
      )}
      {slide.image && imageHidden && (
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/5 px-6 py-10 text-center text-white/70">
          אין תמונה זמינה להצגה עבור הנכס הזה.
        </div>
      )}
    </>
  );
}

/**
 * פריסת השקופיות לקובץ. מוגדר כאן ולא ב-globals כדי שלא ייגע במסך החי.
 *
 * ⚠️ הגובה 209mm ולא 210: עמוד A4 לרוחב הוא 210mm בדיוק, ועיגול של שבריר
 * מילימטר דוחף את השקופית לעמוד הבא ומייצר עמוד ריק בין כל שתי שקופיות.
 */
const DECK_PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
.deck-slide {
  width: 297mm;
  height: 209mm;
  display: flex;
  align-items: center;
  padding: 12mm 16mm;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.deck-slide:last-child { break-after: auto; page-break-after: auto; }
.deck-inner { width: 100%; }
/* תמונה גבוהה מדי דוחפת את הכותרת אל מחוץ לשקופית. */
.deck-image { max-height: 105mm; object-fit: cover; }
`;

function ils(n: number | null | undefined): string {
  return n ? new Intl.NumberFormat('he-IL').format(n) + ' ₪' : '—';
}

function buildSlides(d: PropertyReport): Slide[] {
  const s: Slide[] = [];
  const { lat, lng } = d.location;

  s.push({
    kicker: 'תעודת זהות לנכס',
    title: d.title.headline,
    subtitle: d.title.streetAliases.length
      ? `הרחוב מוכר גם בשמות: ${d.title.streetAliases.join(' · ')}`
      : undefined,
  });

  if (lat != null && lng != null && d.streetView?.available) {
    s.push({
      kicker: 'הבניין',
      title: 'כך נראה הבניין',
      subtitle: d.streetView.date ? `צילום רחוב מ-${d.streetView.date}` : undefined,
      image: apiUrl(`/api/image?kind=street&lat=${lat}&lng=${lng}&w=1000&h=520`),
    });
  }

  if (d.background.population) {
    const p = d.background.population;
    s.push({
      kicker: 'הסביבה',
      title: p.headline,
      subtitle: d.background.neighborhoodDisplay
        ? `שכונת ${d.background.neighborhoodDisplay}`
        : undefined,
      rows: p.breakdown.slice(0, 4).map((b) => ({ label: b.label, value: `${b.pct}%` })),
    });
  }

  const inBuilding = d.soldDeals.filter((x) => x.proximityRank === 0 && !x.suspect);
  if (inBuilding.length) {
    s.push({
      kicker: 'עסקאות שנסגרו',
      title: `${inBuilding.length} עסקאות בבניין הזה`,
      subtitle: 'מחירים שנרשמו בפועל ברשות המסים — לא מחירי בקשה.',
      rows: inBuilding.slice(0, 4).map((x) => ({
        label: `${x.address ?? ''} · ${x.date ? new Date(x.date).toLocaleDateString('he-IL') : ''}`,
        value: ils(x.price),
        note: x.pricePerSqm ? `${new Intl.NumberFormat('he-IL').format(x.pricePerSqm)} ₪ למ"ר` : undefined,
      })),
    });
  }

  const ed = d.places.education.slice(0, 2);
  const tr = d.places.transport.slice(0, 2);
  const rel = d.places.religion.slice(0, 2);
  if (ed.length || tr.length || rel.length) {
    s.push({
      kicker: 'מה יש מסביב',
      title: 'מוסדות, תחבורה ובתי כנסת במרחק הליכה',
      rows: [...ed, ...tr, ...rel].map((p) => ({
        label: `${p.kind} · ${p.name}`,
        value: distanceText(p.straightMeters) ?? '—',
        note: p.walkSeconds != null ? `${walkText(p.walkSeconds)} הליכה` : undefined,
      })),
    });
  }

  if (lat != null && lng != null) {
    const markers = [...d.places.education, ...d.places.transport, ...d.places.religion]
      .sort((a, b) => a.straightMeters - b.straightMeters)
      .slice(0, MARKER_LABELS.length)
      .map((p, i) => `${p.lat},${p.lng},${MARKER_LABELS[i]}`)
      .join(';');
    s.push({
      kicker: 'מיקום',
      title: 'הנכס בסביבתו',
      image: apiUrl(
        `/api/image?kind=map&lat=${lat}&lng=${lng}&zoom=16&w=1000&h=560&markers=${encodeURIComponent(markers)}`,
      ),
    });

    s.push({
      kicker: 'מבט על',
      title: 'תצלום אוויר',
      image: apiUrl(`/api/image?kind=satellite&lat=${lat}&lng=${lng}&zoom=18&w=1000&h=560`),
    });
  }

  // ⚠️ אסור להשתמש בערך הגולמי ככותרת שקופית: כשהנכס אינו במתחם התחדשות
  // הערך הוא המילה "לא", וזו כותרת חסרת פשר מול לקוח.
  const renewal = d.categories
    .find((c) => c.key === 'potential')
    ?.facts.find((f) => f.label.includes('התחדשות'));
  if (renewal?.value) {
    const inCompound = String(renewal.value).trim() !== 'לא';
    s.push({
      kicker: 'פוטנציאל',
      title: inCompound
        ? `הנכס נמצא במתחם התחדשות עירונית: ${renewal.value}`
        : 'הנכס אינו נמצא במתחם התחדשות עירונית מוכרז',
      subtitle: renewal.sourceNote,
    });
  }

  s.push({
    kicker: 'סיכום',
    title: 'מה חשוב לזכור',
    subtitle:
      'כל נתון בדוח מגיע ממקור רשמי ומסומן ברמת ודאות. נתון שאינו קיים — נאמר במפורש שאינו קיים.',
    rows: d.warnings.slice(0, 4).map((w) => ({ label: 'לתשומת לב', value: '', note: w })),
  });

  return s;
}
