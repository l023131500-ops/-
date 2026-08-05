'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ASSET_LABEL, ASSET_LINES, ASSET_TAGLINE, ASSET_TYPES } from '@/lib/assettype';
import type { AssetType } from '@/lib/assettype';

/**
 * כל הזנה — כתובת או גוש/חלקה — הולכת ישר למסך התוצאות.
 * אין מסך ביניים ואין אישור.
 *
 * ⚠️ סוג הנכס נבחר **לפני** החיפוש ולא אחריו: הוא קובע מה נמשך מהמקורות
 * (מודעות שכירות מול מודעות מכירה, עסקאות מסחריות מול עסקאות דירות), ולכן
 * הוא חלק מהשאילתה ולא מסנן תצוגה.
 *
 * שדות הנכס (כניסה/קומה/חדרים) הם **רשות**. הם מחדדים את הדוח לדירה מסוימת
 * בתוך הבניין, אבל דוח מלא מופק גם בלעדיהם — ולכן הם אינם חוסמים את החיפוש.
 */
export default function SearchBar({
  big = false,
  initial = '',
  initialType = 'residential',
  showTypes = true,
}: {
  big?: boolean;
  initial?: string;
  initialType?: AssetType;
  showTypes?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [rooms, setRooms] = useState('');
  const [type, setType] = useState<AssetType>(initialType);

  /**
   * שני מצבי הזנה: כתובת חופשית, או גוש וחלקה בשדות נפרדים.
   *
   * ⚠️ למה זה לא קישוט. `CLAUDE.md` של המערכת מתעד מלכודת אמיתית: "האתרוג 5
   * חצור הגלילית" הגיע ל**גוש 14052 במקום 13893**, כי שירות האיתור חיפש רחוב
   * שאינו במרשם ("אתרוג" הוא כינוי; הרחוב הרשמי הוא "דרך מרדכי"). מקף וה'
   * הידיעה שוברים את החיפוש בדרכים נוספות.
   *
   * מי שיודע את הגוש והחלקה שלו — והם מופיעים בכל נסח, חוזה וארנונה — יכול
   * **לעקוף את הגיאוקוד לגמרי**. זה לא קיצור דרך אלא המסלול המדויק היחיד.
   */
  const [mode, setMode] = useState<'address' | 'parcel'>('address');
  const [gush, setGush] = useState('');
  const [helka, setHelka] = useState('');

  /**
   * ⚠️ הפורמט נבחר לפי מה ש-`parseQuery` באמת מקבל, ולא לפי מה שנראה טבעי:
   * `/גוש\s*(\d{3,6})\D{0,12}?חלקה\s*(\d{1,5})/`. הרכבה לפורמט שהפרסר אינו
   * מכיר הייתה שולחת את המשתמש למסלול הכתובות עם מחרוזת חסרת פשר — כלומר
   * שדות מובנים שמייצרים תוצאה גרועה יותר מהקלט החופשי שהם באים להחליף.
   */
  const parcelQuery = () => `גוש ${gush.trim()} חלקה ${helka.trim()}`;
  const parcelReady = /^\d{3,6}$/.test(gush.trim()) && /^\d{1,5}$/.test(helka.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = mode === 'parcel' ? (parcelReady ? parcelQuery() : '') : q.trim();
    if (!v) return;
    const p = new URLSearchParams({ q: v });
    if (type !== 'residential') p.set('type', type);
    if (entrance.trim()) p.set('entrance', entrance.trim());
    if (floor.trim()) p.set('floor', floor.trim());
    if (rooms.trim()) p.set('rooms', rooms.trim());
    router.push(`/report?${p.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      {showTypes && (
        <div className="mb-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ASSET_TYPES.map((a) => {
              const on = type === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setType(a)}
                  aria-pressed={on}
                  className={`rounded-xl border-2 px-4 py-2.5 text-right transition ${
                    on
                      ? 'border-teal bg-teal/10 shadow-card'
                      : 'border-line bg-surface/95 hover:border-teal/60'
                  }`}
                >
                  <div className={`text-[15px] font-black ${on ? 'text-tealD' : 'text-navy'}`}>
                    {ASSET_LABEL[a]}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{ASSET_TAGLINE[a]}</div>
                </button>
              );
            })}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-right text-[12px] text-muted">
            {ASSET_LINES[type].map((l) => (
              <li key={l} className="flex items-baseline gap-1.5">
                <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-teal" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* בורר מצב ההזנה. שתי הדרכים שקולות — לא "מתקדם" ולא נסתר בקיפול,
          כי מי שיש לו גוש וחלקה מקבל תוצאה מדויקת יותר. */}
      <div className="mb-2 flex gap-1.5" role="tablist" aria-label="דרך ההזנה">
        {([['address', 'לפי כתובת'], ['parcel', 'לפי גוש וחלקה']] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${
              mode === m
                ? 'bg-teal text-white'
                : 'border border-line bg-surface text-muted hover:border-teal/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'parcel' ? (
        <div className="w-full">
          <div className="flex w-full flex-wrap gap-2">
            <label className="flex-1 text-[13px]" style={{ minWidth: 150 }}>
              <span className="mb-1 block font-semibold text-ink">גוש</span>
              <input
                value={gush}
                onChange={(e) => setGush(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="לדוגמה: 7091"
                aria-label="מספר גוש"
                className={`w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none placeholder:text-muted/70 focus:border-teal ${
                  big ? 'py-4 text-lg' : 'py-3'
                }`}
              />
            </label>
            <label className="flex-1 text-[13px]" style={{ minWidth: 150 }}>
              <span className="mb-1 block font-semibold text-ink">חלקה</span>
              <input
                value={helka}
                onChange={(e) => setHelka(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="לדוגמה: 203"
                aria-label="מספר חלקה"
                className={`w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none placeholder:text-muted/70 focus:border-teal ${
                  big ? 'py-4 text-lg' : 'py-3'
                }`}
              />
            </label>
            <button
              type="submit"
              disabled={!parcelReady}
              className={`shrink-0 self-end rounded-xl bg-teal font-bold text-white transition hover:bg-tealD disabled:cursor-not-allowed disabled:opacity-50 ${
                big ? 'px-7 py-4 text-lg' : 'px-5 py-3'
              }`}
            >
              הצג דוח
            </button>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            הגוש והחלקה מופיעים בנסח טאבו, בחוזה ובחשבון הארנונה. הזנה כזו מדלגת על
            זיהוי הכתובת ומגיעה ישירות לחלקה — הדרך המדויקת ביותר.
          </p>
        </div>
      ) : (
      <div className="flex w-full gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='כתובת מלאה או גוש וחלקה — למשל: דיזנגוף 100 תל אביב  ·  גוש 7091 חלקה 203'
          aria-label="כתובת או גוש וחלקה"
          className={`w-full rounded-xl border border-line bg-surface px-4 text-ink outline-none placeholder:text-muted/70 focus:border-teal ${
            big ? 'py-4 text-lg' : 'py-3'
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-xl bg-teal font-bold text-white transition hover:bg-tealD ${
            big ? 'px-7 text-lg' : 'px-5'
          }`}
        >
          הצג דוח
        </button>
      </div>
      )}

      {/* במגרש אין כניסה, קומה ומספר חדרים — השדות האלה נעלמים בדוח קרקע. */}
      <div className={`mt-2 ${type === 'land' ? 'hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-block py-1.5 text-[13px] font-bold text-tealD hover:underline"
        >
          {open ? '− פרטי הנכס (רשות)' : '+ רוצים לברר על נכס מסוים?'}
        </button>

        {!open && (
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            רוצים לברר על נכס מסוים? מומלץ להוסיף מספר כניסה, קומה וחדרים.
          </p>
        )}

        {open && (
          <div className="mt-2 rounded-xl border border-line bg-surface p-3">
            <p className="text-[12px] leading-relaxed text-muted">
              רוצים לברר על נכס מסוים? מומלץ להוסיף מספר כניסה, קומה וחדרים. כל השדות
              אינם חובה — בלעדיהם הדוח יתייחס לבניין ולסביבה.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-ink">כניסה</span>
                <input
                  value={entrance}
                  onChange={(e) => setEntrance(e.target.value)}
                  placeholder="לדוגמה: א"
                  className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal"
                />
              </label>
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-ink">קומה</span>
                <input
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  inputMode="numeric"
                  placeholder="לדוגמה: 3"
                  className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal"
                />
              </label>
              <label className="text-[13px]">
                <span className="mb-1 block font-semibold text-ink">חדרים</span>
                <input
                  value={rooms}
                  onChange={(e) => setRooms(e.target.value)}
                  inputMode="decimal"
                  placeholder="לדוגמה: 4"
                  className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
