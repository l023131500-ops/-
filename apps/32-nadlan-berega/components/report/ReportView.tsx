'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORY_ORDER, tierAllows, tierMayExport } from '@/lib/report';
import type { CategoryKey, ReportTier } from '@/lib/report';
import type { PropertyReport } from '@/lib/buildreport';
import { ASSET_LABEL, ASSET_TAGLINE, ASSET_TYPES } from '@/lib/assettype';
import type { AssetType } from '@/lib/assettype';
import {
  ALL_LAYERS,
  DATA_LAYERS,
  categoryIncluded,
  serializeLayers,
  shouldSkipListings,
} from '@/lib/datalayers';
import type { DataLayer } from '@/lib/datalayers';
import { apiUrl } from '@/lib/basepath';
import { CertaintyBadge, CertaintyLegend, FactCard } from './Bits';
import PermitsPanel, { RamiPolicyPanel } from './PermitsPanel';
import PlanMap from './PlanMap';
import FeasibilityPanel from './FeasibilityPanel';
import ValuationPanel from './ValuationPanel';
import SoldDeals from './SoldDeals';
import Listings from './Listings';
import PlacesPanel from './PlacesPanel';
import MikvePanel from './MikvePanel';
import PopulationPanel from './PopulationPanel';
import NeighborhoodProfile from './NeighborhoodProfile';
import StreetPanel from './StreetPanel';
import NearbyPlansPanel from './NearbyPlansPanel';
import VipPanel from './VipPanel';
import PriceTrend from './PriceTrend';
import PropertyImagery from './PropertyImagery';
import TransitLines from './TransitLines';
import AreaAlertSignup from './AreaAlertSignup';

/** שלושת הכפתורים, בשפה של הלקוח. */
const BUTTONS: { tier: ReportTier; title: string; sub: string }[] = [
  { tier: 'basic', title: 'דוח חינמי', sub: 'הזיהוי, המפה והעסקאות האחרונות' },
  { tier: 'premium', title: 'דוח פרימיום', sub: 'כל העסקאות, ההיתרים, המודעות והמגמות' },
  { tier: 'vip', title: 'דוח VIP', sub: 'כולל צילום, מפה אזורית, תשואה ומצגת' },
];

export default function ReportView({
  q,
  tier: initialTier,
  assetType: initialAsset = 'residential',
  input,
  layers: initialLayers,
  preloaded = null,
  savedNote = null,
}: {
  q: string;
  tier: ReportTier;
  assetType?: AssetType;
  /**
   * ⚠️ הטיפוס הזה הוא מה שתפס את הבאג: העמוד כבר קרא `tatHelka` ו-`apartment`
   * מהכתובת, אבל הם לא היו כאן, ולכן נעצרו בגבול הרכיב בלי שאיש ישים לב.
   */
  input?: {
    entrance?: string;
    floor?: string;
    rooms?: string;
    tatHelka?: string;
    apartment?: string;
  };
  /**
   * §1 · שכבות המידע שנבחרו בעמוד התדמית. חסר → הכול, כדי שקישור ישן או
   * דוח שמור לא ייראו פתאום קטועים.
   */
  layers?: DataLayer[];
  /**
   * §8 · דוח שנקרא מהאחסון דרך הקישור הקבוע. כשהוא קיים אין קריאה ל-API
   * בכלל: זה מה שהופך את הקישור לקבוע, וזה גם מה שמונע חיוב חוזר על מקורות
   * בתשלום בכל פתיחה שלו.
   */
  preloaded?: PropertyReport | null;
  /** שורת ההסבר שמוצגת מעל דוח שמור. */
  savedNote?: React.ReactNode;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<ReportTier>(initialTier);
  const [assetType, setAssetType] = useState<AssetType>(initialAsset);
  const [layers, setLayers] = useState<DataLayer[]>(initialLayers ?? [...ALL_LAYERS]);
  const skipListings = shouldSkipListings(layers);
  const dropped = DATA_LAYERS.filter((l) => !layers.includes(l.key));
  const [data, setData] = useState<PropertyReport | null>(preloaded);
  const [loading, setLoading] = useState(!preloaded);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<CategoryKey>('property');
  const sectionRefs = useRef<Partial<Record<CategoryKey, HTMLElement | null>>>({});

  /**
   * החלפת תחום מעדכנת גם את הכתובת.
   * ⚠️ בלי זה רענון הדף היה מחזיר את התחום שממנו הגיעו ולא את זה שמוצג, וקישור
   * שמעתיקים מהדפדפן היה שולח את הצד השני לדוח אחר מזה שראו.
   */
  useEffect(() => {
    if (preloaded) return; // בקישור הקבוע אין החלפת תחום — יש תצלום אחד
    if (assetType === initialAsset) return;
    const p = new URLSearchParams(window.location.search);
    if (assetType === 'residential') p.delete('type');
    else p.set('type', assetType);
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [assetType, initialAsset, router]);

  /**
   * §1 · שינוי שכבות מהמסך נכתב לכתובת, מאותה סיבה בדיוק: קישור שמעתיקים
   * מהדפדפן חייב להציג לצד השני את מה שרואים, ולא דוח בהרכב אחר.
   */
  useEffect(() => {
    if (preloaded) return;
    const current = new URLSearchParams(window.location.search);
    const p = new URLSearchParams(window.location.search);
    const inc = serializeLayers(layers);
    if (inc) p.set('include', inc);
    else p.delete('include');
    if (p.toString() === current.toString()) return;
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [layers, preloaded, router]);

  /** הפרמטרים שמזהים את הדוח — משותפים לקריאת ה-API, ל-PDF ולמצגת. */
  const shared = new URLSearchParams({ q });
  if (assetType !== 'residential') shared.set('type', assetType);
  if (input?.entrance) shared.set('entrance', input.entrance);
  if (input?.floor) shared.set('floor', input.floor);
  if (input?.rooms) shared.set('rooms', input.rooms);
  const sharedInclude = serializeLayers(layers);
  if (sharedInclude) shared.set('include', sharedInclude);
  const sharedQs = shared.toString();

  useEffect(() => {
    if (preloaded) return; // הדוח כבר בידינו — אין למי לפנות
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ q, tier });
    if (assetType !== 'residential') params.set('type', assetType);
    if (input?.entrance) params.set('entrance', input.entrance);
    if (input?.floor) params.set('floor', input.floor);
    if (input?.rooms) params.set('rooms', input.rooms);
    // ⚠️ אלה נקראו בעמוד ולא נשלחו מכאן, ולכן מעולם לא הגיעו למנוע — כלומר
    // החיווט של הסבב הקודם נעצר צעד אחד לפני הסוף. בלעדיהם נסח הטאבו אינו
    // משויך לדירה הנכונה ומפתח הקישור הקבוע נבנה בלי מספר הדירה.
    if (input?.tatHelka) params.set('tatHelka', input.tatHelka);
    if (input?.apartment) params.set('apartment', input.apartment);
    // §1 · שכבה שבוטלה ועולה כסף — לא נמשכת בכלל, ולא רק מוסתרת.
    if (skipListings) params.set('skipListings', '1');

    /**
     * תקרת זמן לבקשה.
     *
     * ⚠️ בלי זה `fetch` ממתין כל עוד השרת לא סגר את החיבור, ומסך הטעינה נשאר
     * על המסך ללא הגבלה. נמדדה ריצה שעברה 180 שניות. שתי דקות הן הרבה מעבר
     * לריצה הארוכה שנמדדה בפועל (46 שניות), ולכן הן לא יקטעו דוח תקין —
     * אבל הן מבטיחות שהלקוח יקבל **משפט** במקום להישאר מול נקודות מהבהבות.
     */
    const ctl = new AbortController();
    const ceiling = setTimeout(() => ctl.abort(), 120_000);

    fetch(apiUrl(`/api/report?${params.toString()}`), { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e?.name === 'AbortError'
            ? 'אחד המקורות הרשמיים לא הגיב בזמן, ולכן לא הצלחנו להרכיב את הדוח. אפשר לנסות שוב בעוד רגע.'
            : 'לא הצלחנו להתחבר לשרת.',
        );
      })
      .finally(() => {
        clearTimeout(ceiling);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(ceiling);
      ctl.abort();
    };
  }, [q, tier, assetType, input?.entrance, input?.floor, input?.rooms,
      input?.tatHelka, input?.apartment, skipListings, preloaded]);

  // הדגשת הקטגוריה שנמצאת כרגע מול העין.
  useEffect(() => {
    if (!data) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement) {
          const k = visible.target.dataset.cat as CategoryKey | undefined;
          if (k) setActive(k);
        }
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [data, tier]);

  const categories = useMemo(() => {
    if (!data) return [];
    return data.categories
      // §1 · סעיף ששכבתו לא נבחרה יורד לגמרי — מהניווט, מהמסך ומההדפסה.
      .filter((c) => categoryIncluded(c.key, layers))
      .map((c) => ({
        ...c,
        facts: c.facts.filter((f) => tierAllows(tier, f.tier)),
      }));
  }, [data, tier, layers]);

  function jumpTo(k: CategoryKey) {
    sectionRefs.current[k]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <LoadingState q={q} tier={tier} />;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
          <div className="text-xl font-black text-navy">לא הצלחנו להפיק את הדוח</div>
          <p className="mt-2 text-muted">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-5 rounded-xl bg-teal px-6 py-2.5 font-bold text-white hover:bg-tealD"
          >
            חזרה לחיפוש
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const t = data.title;
  // ה-slug מגיע כשדה נוסף בתשובת ה-API ואינו חלק ממודל הדוח עצמו.
  const permalink = (data as unknown as { permalink?: string | null }).permalink ?? null;
  const totalFacts = categories.reduce((s, c) => s + c.facts.length, 0);
  const filledFacts = categories.reduce(
    (s, c) => s + c.facts.filter((f) => f.value !== null).length,
    0,
  );

  return (
    <div className="pb-20">
      {/* ===== כותרת ===== */}
      <section className="hero-gradient text-white print:bg-surface print:text-black">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="text-xs font-bold tracking-widest text-goldL print:text-gold">
            {ASSET_LABEL[assetType]} · {BUTTONS.find((b) => b.tier === tier)?.title}
          </div>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{t.headline}</h1>

          {t.streetAliases.length > 0 && (
            <p className="mt-2 text-sm text-white/85 print:text-black">
              הרחוב מוכר גם בשמות:{' '}
              <span className="font-semibold">{t.streetAliases.join(' · ')}</span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {t.gush && (
              <Chip>
                גוש <b>{t.gush}</b>
              </Chip>
            )}
            {t.helka && (
              <Chip>
                חלקה <b>{t.helka}</b>
              </Chip>
            )}
            {t.city && <Chip>{t.city}</Chip>}
            {data.propertyKind.kind !== 'unknown' && (
              <Chip>
                {data.propertyKind.kind === 'house' ? 'בית צמוד קרקע' : 'דירה בבית משותף'}
              </Chip>
            )}
            {data.propertyInput.entrance && <Chip>כניסה {data.propertyInput.entrance}</Chip>}
            {data.propertyInput.floor && <Chip>קומה {data.propertyInput.floor}</Chip>}
            {data.propertyInput.rooms && <Chip>{data.propertyInput.rooms} חדרים</Chip>}
            {data.background.junction && <Chip>ליד צומת {data.background.junction.name}</Chip>}
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-white/80 print:text-black">
            {data.propertyKind.reason}
          </p>
        </div>
      </section>

      {/* ===== ארבעת סוגי הנכס ===== */}
      {/*
        אותה כתובת, ארבע זרימות דוח. המעבר כאן בונה את הדוח מחדש ולא מסנן
        תצוגה — סוג הנכס קובע גם מה נמשך מהמקורות (שכירות מול מכירה).
      */}
      <div className={`border-b border-line bg-bgsoft print:hidden ${preloaded ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-6xl px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ASSET_TYPES.map((a) => {
              const on = assetType === a;
              return (
                <button
                  key={a}
                  onClick={() => setAssetType(a)}
                  aria-pressed={on}
                  className={`rounded-2xl border-2 px-4 py-2.5 text-right transition ${
                    on ? 'border-navy bg-surface shadow-card' : 'border-line bg-surface/70 hover:border-navy/40'
                  }`}
                >
                  <div className={`text-[15px] font-black ${on ? 'text-navy' : 'text-ink'}`}>
                    {ASSET_LABEL[a]}
                    {on && <span className="mr-2 text-[11px] font-bold text-tealD">● מוצג כעת</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{ASSET_TAGLINE[a]}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== שלושת הכפתורים ===== */}
      <div className={`border-b border-line bg-surface print:hidden ${preloaded ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-6xl px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {BUTTONS.map((b) => {
              const on = tier === b.tier;
              const vip = b.tier === 'vip';
              return (
                <button
                  key={b.tier}
                  onClick={() => setTier(b.tier)}
                  aria-pressed={on}
                  className={`rounded-2xl border-2 px-5 py-3 text-right transition ${
                    on
                      ? vip
                        ? 'border-gold bg-gold/15 shadow-card'
                        : 'border-teal bg-teal/10 shadow-card'
                      : 'border-line bg-surface hover:border-teal/60'
                  }`}
                >
                  <div
                    className={`text-lg font-black ${
                      on ? (vip ? 'text-[#8a6d24]' : 'text-tealD') : 'text-navy'
                    }`}
                  >
                    {vip && '✦ '}
                    {b.title}
                    {on && <span className="mr-2 text-[11px] font-bold">● מוצג כעת</span>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">{b.sub}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        {savedNote}

        {/*
          §1 · מה שהלקוח בחר לא לכלול — נאמר במפורש, ולא נעלם בשקט.
          בלי השורה הזו דוח מצומצם נראה בדיוק כמו דוח שחסרים בו נתונים, וזה
          בדיוק הבלבול שהמפרט בא למנוע.
        */}
        {dropped.length > 0 && (
          <div className="mt-6 rounded-2xl border border-line bg-bgsoft p-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] leading-relaxed text-ink">
                <b className="text-navy">
                  לפי בחירתכם, {dropped.length === 1 ? 'שכבה אחת לא נכללה' : `${dropped.length} שכבות לא נכללו`} בדוח:
                </b>{' '}
                <span className="text-muted">{dropped.map((l) => l.label).join(' · ')}</span>
                {skipListings && (
                  <span className="mt-1 block text-[12px] text-muted">
                    מודעות הלוחות גם לא נמשכו, ולכן לא שולם עליהן.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLayers([...ALL_LAYERS])}
                className="shrink-0 rounded-lg bg-navysurface px-4 py-2 text-[13px] font-bold text-white hover:bg-navysurface/90"
              >
                הצג את כל השכבות
              </button>
            </div>
          </div>
        )}

        {/* ===== אזהרות ===== */}
        {data.warnings.length > 0 && (
          <div className="mt-6 space-y-2">
            {data.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-[#7a5f1f]"
              >
                {w}
              </div>
            ))}
          </div>
        )}

        {/* ===== רקע השכונה — שכבת `neighborhood` ===== */}
        {layers.includes('neighborhood') && (
        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h2 className="text-lg font-black text-navy">איפה זה נמצא</h2>
            {data.background.neighborhoodDisplay ? (
              <>
                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  הנכס נמצא בשכונת{' '}
                  <b className="text-navy">{data.background.neighborhoodDisplay}</b>
                  {t.city ? ` ב${t.city}` : ''}.
                </p>
                {data.background.neighborhoodAliases.length > 0 && (
                  <p className="mt-1.5 text-[13px] text-muted">
                    השכונה מוכרת גם בשם <b>{data.background.neighborhoodAliases.join(' · ')}</b>.
                  </p>
                )}
                {data.background.neighborhoodDescription && (
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    {data.background.neighborhoodDescription}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                לא נמצא שם שכונה רשמי לנקודה הזו. זה שכיח ביישובים קטנים, שבהם אין חלוקה
                רשמית לשכונות.
              </p>
            )}
            {data.background.junction && (
              <p className="mt-3 text-[13px] text-muted">
                הצומת הראשית הקרובה: <b className="text-ink">{data.background.junction.name}</b>, כ-
                {data.background.junction.meters} מ' מכאן.
              </p>
            )}

            {/* אופי הבנייה — נגזר מסוגי הנכסים בעסקאות שנרשמו באזור. */}
            {data.background.buildingCharacter && (
              <div className="mt-4 border-t border-line/70 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-black text-navy">אופי הבנייה באזור</h3>
                  <CertaintyBadge certainty="approx" small />
                </div>
                <p className="mt-1 text-[14px] font-bold text-ink">
                  {data.background.buildingCharacter.headline}
                </p>
                <ul className="mt-2 space-y-1">
                  {data.background.buildingCharacter.breakdown.map((b) => (
                    <li key={b.kind} className="flex items-baseline justify-between text-[13px]">
                      <span className="text-ink">{b.label}</span>
                      <span className="font-bold text-navy">{b.pct}%</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  נגזר מסוגי הנכסים ב-{data.background.buildingCharacter.sampleSize} עסקאות מגורים
                  שנרשמו באזור. תיאור של הסביבה — לא של הבניין המסוים.
                </p>
              </div>
            )}
          </div>

          <PopulationPanel population={data.background.population} />
        </section>
        )}

        {/*
          §8 בגרסה 2 · רקע השכונה מתאר עכשיו **מגורים** ולא היסטוריה: מי גר
          כאן, אופי דתי וקהילתי, חינוך, נוחות יומיומית, תחבורה ופנאי. הרקע
          ההיסטורי (ויקיפדיה) לא נמחק — הוא ירד ל"קרא עוד" בתוך אותו סעיף,
          ולכן `PlaceStory` כבר אינו מוצג בנפרד.
        */}
        {layers.includes('neighborhood') && <NeighborhoodProfile report={data} />}

        {/*
          §7 · שכבת הרחוב. ארבע השכבות שהמפרט מונה — הנכס, הבניין, הרחוב
          והשכונה — צריכות כל אחת מקום משלה בדוח; הרחוב היה היחיד שלא קיבל.
        */}
        {layers.includes('street') && <StreetPanel report={data} />}

        {/* §2 · הערכת שווי — מוצגת מיד אחרי הרקע, כי זו השאלה הראשונה. */}
        {layers.includes('valuation') && <ValuationPanel valuation={data.valuation} />}

        {/* מפה אינטראקטיבית בכל הרמות; צילום ומפה אזורית — VIP (§2, §4). */}
        {layers.includes('imagery') && <PropertyImagery report={data} tier={tier} />}

        <div className="mt-4">
          <CertaintyLegend />
        </div>

        {/* ===== ניווט — קפיצה לסעיף ===== */}
        <nav className="sticky top-[57px] z-30 -mx-5 mt-6 overflow-x-auto border-y border-line bg-bgsoft/95 px-5 py-2 backdrop-blur print:hidden">
          <div className="flex gap-1.5">
            {CATEGORY_ORDER.map((k) => {
              const cat = categories.find((c) => c.key === k);
              if (!cat) return null;
              const filled = cat.facts.filter((f) => f.value !== null).length;
              return (
                <button
                  key={k}
                  onClick={() => jumpTo(k)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                    active === k ? 'bg-navysurface text-white' : 'bg-surface text-ink hover:text-tealD'
                  }`}
                >
                  {cat.title}
                  <span
                    className={`mr-1.5 text-[11px] font-medium ${
                      active === k ? 'opacity-70' : 'text-muted'
                    }`}
                  >
                    {filled}/{cat.facts.length}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/*
          כל הקטגוריות מוצגות ברצף ולא בלשוניות.
          ⚠️ זה גם תיקון תקלה: הדפסה ל-PDF מדפיסה את מה שמוצג, ולכן בתצוגת
          לשוניות ה-PDF היה יוצא עם קטגוריה אחת בלבד.
        */}
        {categories.map((cat) => (
          <section
            key={cat.key}
            data-cat={cat.key}
            ref={(el) => {
              sectionRefs.current[cat.key] = el;
            }}
            className="mt-10 scroll-mt-32 border-t border-line pt-8 first:border-0"
          >
            <h2 className="text-2xl font-black text-navy">{cat.title}</h2>
            <p className="mt-1 text-[15px] text-muted">{cat.subtitle}</p>

            {cat.facts.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.facts.map((f, i) => (
                  <FactCard key={i} fact={f} />
                ))}
              </div>
            )}

            {cat.key === 'sold' && (
              <>
                <SoldDeals deals={data.soldDeals} tier={tier} officialUrl={data.parcelIdentity?.officialUrl ?? null} />
                {tier !== 'basic' && <PriceTrend points={data.priceTrend} />}
              </>
            )}
            {cat.key === 'listings' && (
              <Listings
                listings={data.listings}
                status={data.listingsStatus}
                tier={tier}
                assetType={assetType}
              />
            )}
            {cat.key === 'surroundings' && (
              <>
                <PlacesPanel
                  groups={[
                    { title: 'מוסדות חינוך', places: data.places.education, showEmpty: true },
                    { title: 'גנים ומעונות', places: data.places.preschool },
                    { title: 'בתי כנסת ומוסדות דת', places: data.places.religion },
                    { title: 'מסחר וקניות', places: data.places.commerce },
                    { title: 'בריאות', places: data.places.health },
                    { title: 'פארקים ופנאי', places: data.places.leisure },
                  ]}
                  tier={tier}
                />
                <MikvePanel mikvaot={data.mikvaot} />
              </>
            )}
            {cat.key === 'transport' && <TransitLines stops={data.transitStops} />}
            {cat.key === 'permits' && (
              <>
                <PermitsPanel permits={data.permits} />
                {/* §7 · המסמך התכנוני עצמו, מוטמע — ולא רק קישור אליו. */}
                {data.location.lat != null && data.location.lng != null && (
                  <PlanMap
                    lat={data.location.lat}
                    lng={data.location.lng}
                    landUses={[
                      data.permits?.landUse ?? '',
                      ...(data.constraints?.buildingLines ?? []).map((e) => e.name),
                    ].filter(Boolean)}
                  />
                )}
                {/* §7 · הכפתור "היתכנות להיתר נוסף". */}
                <FeasibilityPanel feasibility={data.feasibility} />
              </>
            )}
            {cat.key === 'land' && <RamiPolicyPanel policy={data.ramiPolicy} />}
            {/* §12 · תוכניות בנייה ברדיוס סביב הנכס. */}
            {cat.key === 'potential' && <NearbyPlansPanel plans={data.nearbyPlans} tier={tier} />}
            {(cat.key === 'rental' || cat.key === 'commercial') && (
              <Listings
                listings={data.listings}
                status={data.listingsStatus}
                tier={tier}
                assetType={assetType}
              />
            )}
          </section>
        ))}

        {tier === 'vip' && <VipPanel report={data} />}

        {/* more30-feature-expansion.md · נדל"ן: התראות על עסקאות חדשות באזור/רחוב */}
        <AreaAlertSignup
          address={data.title.streetDisplay ? `${data.title.streetDisplay} ${data.title.houseNumber ?? ''}`.trim() : null}
          city={data.title.city}
          gush={data.title.gush}
          helka={data.title.helka}
        />

        {/* ===== §8 · הקישור הקבוע של הנכס ===== */}
        {permalink && (
          <PermalinkBox
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}${apiUrl(`/p/${permalink}`)}`}
          />
        )}

        {/*
          פעולות פלט — §2 מייחד "הורדת מצגת + PDF מעוצב" ל-VIP, ולכן הן
          מוצגות שם בלבד. ברמות האחרות נאמר במפורש איפה הן נמצאות, במקום
          להציג כפתור שמפיק מסמך שהלקוח לא רכש.
        */}
        {tierMayExport(tier) ? (
          <div className="mt-10 flex flex-wrap gap-3 print:hidden">
            {/* ⚠️ כל שלושת הפלטים נושאים את סוג הנכס — אחרת לחיצה על "הורד PDF"
                בדוח שכירות הייתה מפיקה את דוח המגורים של אותה כתובת. */}
            <a
              href={apiUrl(`/api/pdf?${sharedQs}&tier=${tier}`)}
              className="rounded-xl bg-teal px-6 py-3 font-bold text-white hover:bg-tealD"
            >
              הורד PDF מעוצב
            </a>
            <a
              href={apiUrl(`/present?${sharedQs}`)}
              className="rounded-xl border border-line bg-surface px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
            >
              פתח מצגת
            </a>
            <a
              href={apiUrl(`/api/deck?${sharedQs}`)}
              className="rounded-xl border border-line bg-surface px-6 py-3 font-bold text-navy hover:border-teal hover:text-tealD"
            >
              הורדת המצגת
            </a>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-gold/40 bg-gold/[0.07] p-5 print:hidden">
            <div className="text-[15px] font-black text-[#8a6d24]">✦ מצגת ו-PDF מעוצב — בדוח VIP</div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
              המצגת להצגה מול לקוח והגרסה המעוצבת להדפסה נכללות בדוח ה-VIP. את הדוח הזה אפשר
              להדפיס מהדפדפן בכל רמה.
            </p>
          </div>
        )}

        <footer className="mt-12 rounded-2xl border border-line bg-surface p-5 text-[12px] leading-relaxed text-muted shadow-card">
          הדוח כולל {filledFacts} נתונים מתוך {totalFacts} שנבדקו. הופק ב-
          {new Date(data.generatedAt).toLocaleString('he-IL')}. כל נתון מוצג עם המקור שלו ועם
          רמת הוודאות שלו. נתונים המסומנים "מקורב" או "הערכה" אינם קביעה לגבי הנכס עצמו.
          הדוח אינו תחליף לנסח טאבו, לשמאות או לייעוץ משפטי.
        </footer>
      </div>
    </div>
  );
}

/**
 * §8 · הקישור הקבוע. הוא נגזר מזהות הנכס, ולכן אותה דירה תקבל אותו קישור גם
 * בהפקה הבאה — ולא קישור חדש בכל פעם.
 */
function PermalinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-10 rounded-2xl border border-line bg-bgsoft p-5 print:hidden">
      <div className="text-[15px] font-black text-navy">הקישור הקבוע של הנכס</div>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        הדוח נשמר, והקישור הזה יציג אותו גם בעוד חודשים — כולל כל מסמך שיצורף לנכס בהמשך.
        הפקה חוזרת של אותו נכס תגיע לאותו קישור בדיוק.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="הקישור הקבוע של הנכס"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              },
              () => {},
            );
          }}
          className="shrink-0 rounded-lg bg-navysurface px-4 py-2 text-[13px] font-bold text-white hover:bg-navysurface/90"
        >
          {copied ? 'הועתק ✓' : 'העתק קישור'}
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-white/12 px-3 py-1 text-white print:bg-slate-100 print:text-black">
      {children}
    </span>
  );
}

/**
 * מסך ההמתנה.
 *
 * ⚠️ מה שהיה כתוב כאן — "זה לוקח כמה שניות" — פשוט לא נכון. נמדד ישירות מול
 * ה-API באותה שאילתה: 11.1 שניות, 25.6, 45.9, ובניסיון אחד מעל 180. במשך כל
 * הזמן הזה המסך היה זהה: אותן נקודות מהבהבות, בלי מונה, בלי תקרה ובלי מילה
 * על כך שמקור מגיב לאט.
 *
 * המשמעות היא שריצה איטית ומוצר תקוע נראים ללקוח **בדיוק אותו דבר**. זו לא
 * השערה: אני עצמי הסקתי מהמסך הזה שהדוח שבור, גלגלתי פריסה אחורה וחיפשתי
 * תקלה שלא הייתה — עם הרבה יותר מידע ממה שיש למי שרק מסתכל בעמוד.
 *
 * לכן שלוש תוספות, וכולן אמירת אמת ולא הרגעה: מונה שניות שמראה שמשהו קורה,
 * טקסט שמשתנה כשזה נמשך מעבר לצפוי, ובקשה שנגמרת בהודעה במקום להמשיך לנצח.
 */
function LoadingState({ q, tier }: { q: string; tier: ReportTier }) {
  const steps = [
    'מאתרים את הכתובת ואת הגוש והחלקה',
    'מושכים עסקאות שנסגרו בבניין ובסביבה',
    'בודקים מוסדות, תחבורה ומרחקים',
    ...(tier !== 'basic' ? ['אוספים דירות שמוצעות למכירה כרגע'] : []),
    'מרכיבים את הדוח',
  ];

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // הסף נגזר מהמדידה: רוב הריצות מסתיימות מתחת ל-30 שניות, ולכן מעבר לזה
  // כבר הוגן לומר שזה חורג — ולא להשאיר את אותו משפט מרגיע לנצח.
  const slow = seconds >= 30;

  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <div className="text-2xl font-black text-navy">
        מכינים {BUTTONS.find((b) => b.tier === tier)?.title} על "{q}"
      </div>
      <p className="mt-2 text-muted">
        {slow
          ? 'אחד המקורות הרשמיים מגיב לאט הפעם. אנחנו עדיין עובדים — הדוח ייטען מעצמו.'
          : 'אנחנו אוספים נתונים ממקורות רשמיים. בדרך כלל זה לוקח 10 עד 30 שניות.'}
      </p>
      <p className="mt-1 text-[13px] tabular-nums text-muted" aria-live="polite">
        {seconds} שניות
      </p>
      <div className="mx-auto mt-8 max-w-md space-y-2 text-right">
        {steps.map((s) => (
          <div key={s} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-teal" />
            <span className="text-sm text-ink">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
