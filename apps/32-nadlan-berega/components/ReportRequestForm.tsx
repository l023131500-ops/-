'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ASSET_LABEL, ASSET_LINES, ASSET_TAGLINE, ASSET_TYPES } from '@/lib/assettype';
import type { AssetType } from '@/lib/assettype';
import { TIER_LABEL } from '@/lib/report';
import type { ReportTier } from '@/lib/report';
import { ALL_LAYERS, DATA_LAYERS, serializeLayers } from '@/lib/datalayers';
import type { DataLayer } from '@/lib/datalayers';

/**
 * טופס הבקשה — §1 במפרט.
 *
 * הסדר הוא הסדר שהמפרט קובע, והוא גם הסדר ההגיוני:
 *   1. **מה בודקים** (מגורים / שכירות / מסחרי / קרקעות) — נבחר בהתחלה כי הוא
 *      קובע מה נמשך מהמקורות, ולא רק מה מוצג. עסקאות מסחריות ומודעות שכירות
 *      הן שאילתות אחרות לגמרי.
 *   2. **איזה דוח** (חינמי / פרימיום / VIP) — נבחר בהתחלה כי הוא קובע אילו
 *      מקורות ייקראו בכלל. החינמי אינו קורא לאף מקור שגובה תשלום.
 *   3. **אילו נתונים לכלול** — שתים-עשרה שכבות המידע, מסומנות כולן כברירת
 *      מחדל. זה סעיף בחירה ולא סעיף תצוגה: ביטול "דירות מוצעות כרגע" גם חוסך
 *      את המשיכה בתשלום מלוחות המודעות, ולא רק מסתיר את הסעיף.
 *   4. **שדות מובנים** — גוש/חלקה/תת-חלקה ורחוב/מספר/כניסה/קומה/דירה,
 *      **מעל** החיפוש החופשי. אפשר למלא את כולם או חלקם.
 *   5. חיפוש חופשי — למי שיש לו רק מחרוזת.
 *
 * ⚠️ שדה בודד אינו חוסם: מי שהזין גוש וחלקה בלבד יקבל דוח מלא, והכתובת תוצג
 * לו מהכיוון ההפוך (המרה דו-כיוונית). מי שהזין רחוב ומספר יקבל את הגוש והחלקה.
 */

type Mode = 'address' | 'parcel';

const TIER_CARDS: { tier: ReportTier; price: string; sub: string; lines: string[] }[] = [
  {
    tier: 'basic',
    price: 'ללא תשלום',
    sub: 'הזיהוי של הנכס והמפה',
    lines: [
      'כתובת מלאה, גוש, חלקה ותת-חלקה',
      'מפה אינטראקטיבית עם מיקום הנכס',
      'מחיר ממוצע באזור ועסקאות אחרונות',
      'מוסדות ותחנות מהמרשמים הפתוחים',
    ],
  },
  {
    tier: 'premium',
    price: 'בתשלום',
    sub: 'כל מה שידוע על הנכס',
    lines: [
      'כל העסקאות שנסגרו בבניין ובסביבה',
      'גיל הבניין, היתרים, תוכניות ומסמכים',
      'מוסדות ותחבורה עם זמני הליכה אמיתיים',
      'דירות שמוצעות כרגע ומגמת מחירים',
    ],
  },
  {
    tier: 'vip',
    price: 'בתשלום',
    sub: 'הכול, כולל צילום ומצגת',
    lines: [
      'כל מה שבדוח הפרימיום',
      'צילום הבניין ומפה אזורית מלאה',
      'נסח טאבו לפי דרישה',
      'מצגת להורדה ו-PDF מעוצב',
    ],
  },
];

export default function ReportRequestForm() {
  const router = useRouter();
  const [assetType, setAssetType] = useState<AssetType>('residential');
  const [tier, setTier] = useState<ReportTier>('basic');
  const [mode, setMode] = useState<Mode>('address');
  /** §1 · אילו שכבות מידע לכלול. ברירת המחדל היא הכול. */
  const [layers, setLayers] = useState<DataLayer[]>([...ALL_LAYERS]);

  // זיהוי קדסטרלי
  const [gush, setGush] = useState('');
  const [helka, setHelka] = useState('');
  const [tatHelka, setTatHelka] = useState('');

  // כתובת
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNum, setHouseNum] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [rooms, setRooms] = useState('');

  const [free, setFree] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** מה ייצא כשאילתה — מוצג ללקוח לפני ההפקה, כדי שלא יהיה הפתעות. */
  function composeQuery(): string | null {
    const g = gush.trim();
    const h = helka.trim();
    if (g && h) return `גוש ${g} חלקה ${h}`;
    const s = street.trim();
    const n = houseNum.trim();
    const c = city.trim();
    if (s) return [s, n, c].filter(Boolean).join(' ');
    const f = free.trim();
    return f || null;
  }

  const preview = composeQuery();
  const includeParam = serializeLayers(layers);
  const droppedCount = ALL_LAYERS.length - layers.length;

  function toggleLayer(k: DataLayer, locked?: boolean) {
    if (locked) return;
    setLayers((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = composeQuery();
    if (!q) {
      setErr('צריך גוש וחלקה, או רחוב, או חיפוש חופשי — אחד מהם לפחות.');
      return;
    }
    if (gush.trim() && !helka.trim()) {
      setErr('הוזן גוש בלי חלקה. גוש לבדו אינו מזהה נכס.');
      return;
    }
    if (!gush.trim() && helka.trim()) {
      setErr('הוזנה חלקה בלי גוש. מספרי חלקה חוזרים על עצמם בכל גוש.');
      return;
    }
    if (street.trim() && !city.trim() && !gush.trim()) {
      setErr('צריך גם יישוב. אותו שם רחוב קיים בעשרות יישובים.');
      return;
    }
    setErr(null);
    setBusy(true);

    const p = new URLSearchParams({ q });
    if (assetType !== 'residential') p.set('type', assetType);
    if (tier !== 'basic') p.set('tier', tier);
    if (tatHelka.trim()) p.set('tatHelka', tatHelka.trim());
    if (entrance.trim()) p.set('entrance', entrance.trim());
    if (floor.trim()) p.set('floor', floor.trim());
    if (apartment.trim()) p.set('apartment', apartment.trim());
    if (rooms.trim()) p.set('rooms', rooms.trim());
    // נכתב רק כשנבחרה תת-קבוצה — בחירה מלאה משאירה את הקישור נקי.
    if (includeParam) p.set('include', includeParam);
    router.push(`/report?${p.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-full text-right">
      {/* ===== 1 · סוג הבדיקה ===== */}
      <Step n={1} title="מה בודקים" hint="הבחירה קובעת אילו מקורות נקראים, לא רק מה מוצג.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ASSET_TYPES.map((a) => (
            <Card key={a} on={assetType === a} onClick={() => setAssetType(a)} tone="teal">
              <div className="text-[15px] font-black">{ASSET_LABEL[a]}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted">{ASSET_TAGLINE[a]}</div>
            </Card>
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {ASSET_LINES[assetType].map((l) => (
            <li key={l} className="flex items-baseline gap-1.5">
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-teal" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </Step>

      {/* ===== 2 · סוג הדוח ===== */}
      <Step
        n={2}
        title="איזה דוח"
        hint="הדוח החינמי בנוי ממקורות שאינם עולים כסף, ולכן הוא באמת חינמי — ולכן גם מצומצם."
      >
        <div className="grid gap-2 lg:grid-cols-3">
          {TIER_CARDS.map((t) => (
            <Card
              key={t.tier}
              on={tier === t.tier}
              onClick={() => setTier(t.tier)}
              tone={t.tier === 'vip' ? 'gold' : 'teal'}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[16px] font-black">
                  {t.tier === 'vip' && '✦ '}
                  דוח {TIER_LABEL[t.tier]}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-muted">{t.price}</span>
              </div>
              <div className="mt-0.5 text-[12px] font-semibold text-muted">{t.sub}</div>
              <ul className="mt-2 space-y-1">
                {t.lines.map((l) => (
                  <li key={l} className="flex gap-1.5 text-[12px] leading-relaxed text-ink">
                    <span
                      aria-hidden
                      className={`mt-[6px] h-1 w-1 shrink-0 rounded-full ${
                        t.tier === 'vip' ? 'bg-gold' : 'bg-teal'
                      }`}
                    />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Step>

      {/* ===== 3 · אילו נתונים לכלול ===== */}
      <Step
        n={3}
        title="אילו נתונים לכלול"
        hint="הכול מסומן. מה שתורידו לא ייכנס לדוח — ומה שעולה כסף גם לא יימשך."
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLayers([...ALL_LAYERS])}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-teal hover:text-tealD"
          >
            סמן הכול
          </button>
          <button
            type="button"
            onClick={() => setLayers(DATA_LAYERS.filter((l) => l.locked).map((l) => l.key))}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-bold text-ink transition hover:border-teal hover:text-tealD"
          >
            נקה הכול
          </button>
          <span aria-live="polite" className="text-[12.5px] text-muted">
            {droppedCount === 0
              ? `כל ${ALL_LAYERS.length} שכבות המידע ייכנסו לדוח`
              : `${layers.length} מתוך ${ALL_LAYERS.length} שכבות · ${droppedCount} לא ייכנסו`}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DATA_LAYERS.map((l) => {
            const on = layers.includes(l.key);
            return (
              <label
                key={l.key}
                className={`flex gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-right transition ${
                  on ? 'border-teal bg-teal/[0.07]' : 'border-line bg-white hover:border-teal/60'
                } ${l.locked ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* 24×24 ולא 16×16: יעד מגע מתחת ל-24 נכשל בבדיקת הנגישות,
                    ובמובייל הוא באמת קשה לפגיעה. */}
                <input
                  type="checkbox"
                  checked={on}
                  disabled={l.locked}
                  onChange={() => toggleLayer(l.key, l.locked)}
                  className="mt-0.5 h-6 w-6 shrink-0 accent-teal"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[14px] font-black text-navy">{l.label}</span>
                    {l.locked && (
                      <span className="rounded bg-navy/10 px-1.5 py-px text-[10.5px] font-bold text-navy">
                        תמיד נכלל
                      </span>
                    )}
                    {l.tierNote && (
                      <span className="rounded bg-gold/20 px-1.5 py-px text-[10.5px] font-bold text-[#8a6d24]">
                        {l.tierNote}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{l.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Step>

      {/* ===== 4 · שדות מובנים ===== */}
      <Step
        n={4}
        title="פרטי הנכס"
        hint="אפשר למלא את כולם או חלקם. גוש וחלקה בלבד — הכתובת תושלם מהמרשם; רחוב ומספר בלבד — הגוש והחלקה יושלמו."
      >
        <div className="mb-3 inline-flex rounded-xl border border-line bg-white p-1" role="tablist">
          {(
            [
              ['address', 'לפי כתובת'],
              ['parcel', 'לפי גוש וחלקה'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition ${
                mode === m ? 'bg-navy text-white' : 'text-ink hover:text-tealD'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'parcel' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="גוש" value={gush} onChange={setGush} numeric placeholder="7091" />
            <Field label="חלקה" value={helka} onChange={setHelka} numeric placeholder="203" />
            <Field
              label="תת-חלקה"
              value={tatHelka}
              onChange={setTatHelka}
              numeric
              placeholder="12"
              note="הדירה בתוך הבית המשותף, כפי שהיא רשומה בטאבו."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="יישוב" value={city} onChange={setCity} placeholder="ירושלים" />
              <Field label="רחוב" value={street} onChange={setStreet} placeholder="דורש טוב" />
              <Field label="מספר בית" value={houseNum} onChange={setHouseNum} numeric placeholder="17" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="כניסה" value={entrance} onChange={setEntrance} placeholder="א" />
              <Field label="קומה" value={floor} onChange={setFloor} numeric placeholder="3" />
              <Field label="מספר דירה" value={apartment} onChange={setApartment} numeric placeholder="7" />
              <Field label="חדרים" value={rooms} onChange={setRooms} numeric placeholder="4" />
            </div>
            <details className="mt-3 rounded-xl border border-line bg-bgsoft px-4 py-2.5">
              <summary className="cursor-pointer py-1 text-[13px] font-bold leading-6 text-tealD">
                יודעים גם את הגוש והחלקה? אפשר להוסיף
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="גוש" value={gush} onChange={setGush} numeric placeholder="7091" />
                <Field label="חלקה" value={helka} onChange={setHelka} numeric placeholder="203" />
                <Field label="תת-חלקה" value={tatHelka} onChange={setTatHelka} numeric placeholder="12" />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                כשמוזנים גוש וחלקה הם קובעים את הנקודה, והכתובת משמשת לאימות בלבד.
              </p>
            </details>
          </>
        )}
      </Step>

      {/* ===== 5 · חיפוש חופשי ===== */}
      <Step n={5} title="או חיפוש חופשי" hint="אם יש לכם רק מחרוזת אחת — הקלידו אותה כאן.">
        <input
          value={free}
          onChange={(e) => setFree(e.target.value)}
          aria-label="חיפוש חופשי — כתובת מלאה או גוש וחלקה"
          placeholder='דיזנגוף 100 תל אביב · גוש 7091 חלקה 203'
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none placeholder:text-muted/70 focus:border-teal"
        />
        <p className="mt-1.5 text-[12px] text-muted">
          החיפוש החופשי משמש רק כשהשדות המובנים ריקים. גם שם רחוב מוכר-בפי-הבריות יגיע לנכס הנכון.
        </p>
      </Step>

      {/* ===== הפקה ===== */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-card">
        {err && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-bold text-red-700">
            {err}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] text-muted">
            {preview ? (
              <>
                מפיקים דוח <b className="text-navy">{TIER_LABEL[tier]}</b> ({ASSET_LABEL[assetType]}) על{' '}
                <b className="text-navy">{preview}</b>
                {droppedCount > 0 && (
                  <span className="mt-1 block text-[12px]">
                    בלי:{' '}
                    <b className="text-navy">
                      {DATA_LAYERS.filter((l) => !layers.includes(l.key))
                        .map((l) => l.label)
                        .join(' · ')}
                    </b>
                  </span>
                )}
              </>

            ) : (
              'מלאו גוש וחלקה, או רחוב ויישוב, או חיפוש חופשי.'
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className={`group relative overflow-hidden rounded-xl px-8 py-3.5 text-lg font-black text-white transition ${
              busy ? 'cursor-wait bg-tealD' : 'bg-teal hover:bg-tealD hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {/* אנימציית ההפקה: ניצוץ שעובר על הכפתור במנוחה, וספינר בזמן טעינה. */}
            {!busy && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              {busy && (
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {busy ? 'מפיקים את הדוח…' : 'הפק דוח'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 first:mt-0">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[12px] font-black text-white">
          {n}
        </span>
        {/* h2, not h3: these are the form's top-level steps and the only heading
            above them is the page h1. Jumping a level is what Lighthouse flagged
            as heading-order, and for someone navigating by heading it reads as a
            missing section between the title and the first step. */}
        <h2 className="text-[16px] font-black text-navy">{title}</h2>
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-muted">{hint}</p>
      {children}
    </section>
  );
}

function Card({
  on,
  onClick,
  tone,
  children,
}: {
  on: boolean;
  onClick: () => void;
  tone: 'teal' | 'gold';
  children: React.ReactNode;
}) {
  const active = tone === 'gold' ? 'border-gold bg-gold/10' : 'border-teal bg-teal/10';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-xl border-2 px-4 py-3 text-right text-navy transition ${
        on ? `${active} shadow-card` : 'border-line bg-white hover:border-teal/60'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  note,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  note?: string;
}) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block font-bold text-ink">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={numeric ? 'numeric' : undefined}
        className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink outline-none placeholder:text-muted/60 focus:border-teal"
      />
      {note && <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">{note}</span>}
    </label>
  );
}
