'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import { apiUrl } from '@/lib/basepath';

/**
 * §2 · "סיור רחוב" — P2 FEATURE (core.projects #33, 25/08/2026) ביקש וידאו
 * MP4 מקודד-ffmpeg מדגימת פריימים לאורך הרחוב; ffmpeg אינו זמין בסביבת
 * הבנייה (ראה `buildreport.ts` על `streetWalk`). זו גרסת-ביניים כנה: רצף
 * תמונות Street View אמיתיות ומתוארכות לאורך הרחוב, מתחלפות אוטומטית —
 * מתויג בפירוש כרצף תמונות ולא כווידאו, כדי לא להטעות.
 */
export default function StreetWalkPanel({ report }: { report: PropertyReport }) {
  const streetWalk = report.streetWalk;
  const points = useMemo(() => streetWalk?.points ?? [], [streetWalk]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(true);

  const visibleCount = points.length - failed.size;

  /** המסגרת הבאה/קודמת שאינה בסט הכשלים — nextAvailable(i, 1, failed) לדילוג קדימה. */
  function nextAvailable(from: number, dir: 1 | -1, failedSet: Set<number>): number {
    let next = (from + dir + points.length) % points.length;
    let guard = 0;
    while (failedSet.has(next) && guard < points.length) {
      next = (next + dir + points.length) % points.length;
      guard += 1;
    }
    return next;
  }

  useEffect(() => {
    if (!playing || points.length < 2 || visibleCount < 2) return;
    const t = setInterval(() => {
      setIdx((i) => nextAvailable(i, 1, failed));
    }, 1400);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, points.length, visibleCount, failed]);

  // מסגרת נוכחית שנכשלה בטעינה (עדכון אחרי הרינדור שסימן אותה) — לדלג ממנה
  // מיד, במקום להשאיר תמונה שבורה על המסך עד הטיק הבא של הניגון האוטומטי.
  useEffect(() => {
    if (points.length === 0 || failed.size >= points.length) return;
    if (failed.has(idx)) setIdx((i) => nextAvailable(i, 1, failed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, idx, points.length]);

  if (!streetWalk || points.length === 0) return null;

  const step = (dir: 1 | -1) => {
    setPlaying(false);
    setIdx((i) => nextAvailable(i, dir, failed));
  };

  const current = points[idx];
  const allFailed = failed.size >= points.length;

  return (
    <figure className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
        סיור רחוב
      </figcaption>
      {allFailed ? (
        <div className="px-4 py-6">
          <div className="text-[15px] font-bold text-slate-400">אין כיסוי לאורך הרחוב</div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            נקודות הצילום שנמצאו לאורך הרחוב אינן זמינות כרגע ב-Google Street View.
          </p>
        </div>
      ) : (
        <>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={idx}
              src={apiUrl(`/api/image?kind=street&lat=${current.lat}&lng=${current.lng}&w=900&h=500`)}
              alt={`סיור רחוב — מסגרת ${idx + 1} מתוך ${points.length}`}
              className="w-full object-cover"
              /* טעינה מיידית: כמו שאר תמונות ה-VIP בקובץ הזה (PropertyImagery) —
                 טעינה עצלה מנעה מהתמונה להיכנס ל-PDF/מצגת. */
              loading="eager"
              onError={() => setFailed((s) => (s.has(idx) ? s : new Set(s).add(idx)))}
            />
            {points.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="rounded-full bg-black/40 px-2.5 py-1 text-[12px] text-white hover:bg-black/60"
                  aria-label="המסגרת הקודמת"
                >
                  ‹
                </button>
                <span className="text-[11px] font-bold text-white">
                  {idx + 1} / {points.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="rounded-full bg-black/40 px-2.5 py-1 text-[12px] text-white hover:bg-black/60"
                  >
                    {playing ? 'עצור' : 'נגן'}
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="rounded-full bg-black/40 px-2.5 py-1 text-[12px] text-white hover:bg-black/60"
                    aria-label="המסגרת הבאה"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="px-4 py-2.5 text-[11px] text-muted">
            {streetWalk.date ? `צולם ${streetWalk.date}. ` : ''}
            רצף תמונות Street View אמיתיות לאורך הרחוב — לא וידאו, ולא אינטרפולציה.
          </p>
        </>
      )}
    </figure>
  );
}
