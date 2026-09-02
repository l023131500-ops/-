'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import { apiUrl } from '@/lib/basepath';

/**
 * §2 · "סיור רחוב" — P2 FEATURE (core.projects #33, 25/08/2026) ביקש וידאו
 * MP4 מדגימת פריימים לאורך הרחוב. אין ffmpeg/binary בסביבת הבנייה הזו (ולא
 * ב-Vercel serverless בקלות) — לכן ברירת המחדל היא רצף תמונות Street View
 * אמיתיות ומתוארכות, מתחלפות אוטומטית, מתויג בפירוש ככזה ולא כווידאו.
 *
 * build_tasks id=2: כשהדפדפן תומך (`MediaRecorder`+`canvas.captureStream`),
 * מוצע כפתור-יוזמה שמקליט את אותן מסגרות בדיוק לקליפ אמיתי (WebM/MP4 לפי מה
 * שהדפדפן תומך בו) ומעלה אותו למטמון בשרת (`/api/street-video`, key=`slug`
 * הקבוע של הנכס) — כך שרק הצופה הראשון "משלם" בזמן-הקלטה, וכל צופה אחר של
 * אותו נכס מקבל את הקליפ השמור ישירות. ראה `lib/store.ts`.
 */
function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
  const candidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load-failed'));
    img.src = src;
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function StreetWalkPanel({
  report,
  permalink,
}: {
  report: PropertyReport;
  permalink?: string | null;
}) {
  const streetWalk = report.streetWalk;
  const points = useMemo(() => streetWalk?.points ?? [], [streetWalk]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [video, setVideo] = useState<{ url: string; mimeType: string } | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [cacheCheckFailed, setCacheCheckFailed] = useState(false);

  // בדיקת-תמיכה + בדיקת-מטמון רק בדפדפן, אחרי שהדוח כבר מוצג — אף אחת
  // מהשתיים לא חוסמת/מאיטה את רינדור הקרוסלה הקיימת.
  useEffect(() => {
    setCanGenerate(
      !!pickRecorderMimeType() &&
        typeof HTMLCanvasElement !== 'undefined' &&
        'captureStream' in HTMLCanvasElement.prototype,
    );
  }, []);

  useEffect(() => {
    if (!permalink || points.length === 0) return;
    let cancelled = false;
    setCacheCheckFailed(false);
    fetch(apiUrl(`/api/street-video?slug=${encodeURIComponent(permalink)}`))
      .then((r) => {
        if (!r.ok) throw new Error('cache-check-failed');
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        if (j?.available && j?.url) setVideo({ url: j.url, mimeType: j.mimeType });
      })
      .catch(() => {
        // כישלון-בדיקה (רשת/שרת) שונה מ"אין קליפ שמור" — לא נתקע בלי הסבר, אבל
        // גם לא חוסם את הקרוסלה: אותו עיקרון "מקור שלא נטען → לא זמין" בראש הקובץ הזה.
        if (!cancelled) setCacheCheckFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [permalink, points.length]);

  async function generateVideo() {
    if (generating || !canvasRef.current || !permalink || points.length < 2) return;
    setGenError(null);
    setGenerating(true);
    try {
      const mimeType = pickRecorderMimeType();
      if (!mimeType) throw new Error('הדפדפן הזה אינו תומך בהקלטת סרטון.');

      const w = 900;
      const h = 500;
      const canvas = canvasRef.current;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('שגיאה פנימית בציור המסגרות.');

      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream })
        .captureStream(8);
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start();

      let drawn = 0;
      for (const p of points) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const img = await loadImage(
            apiUrl(`/api/image?kind=street&lat=${p.lat}&lng=${p.lng}&heading=${p.heading}&w=${w}&h=${h}`),
          );
          ctx.drawImage(img, 0, 0, w, h);
          drawn += 1;
          // eslint-disable-next-line no-await-in-loop
          await sleep(900);
        } catch {
          // מסגרת שנכשלה נדלגת — אותו עיקרון בדיוק כמו הקרוסלה למעלה.
        }
      }
      recorder.stop();
      await stopped;

      if (drawn < 2) throw new Error('אין מספיק מסגרות זמינות ליצירת סרטון.');

      const blob = new Blob(chunks, { type: mimeType });
      const fd = new FormData();
      fd.append('slug', permalink);
      fd.append('frameCount', String(drawn));
      fd.append('file', blob, `street.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`);

      const res = await fetch(apiUrl('/api/street-video'), { method: 'POST', body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.url) throw new Error(json?.error ?? 'שמירת הסרטון נכשלה.');
      setVideo({ url: json.url, mimeType: json.mimeType ?? mimeType });
    } catch (e: any) {
      setGenError(e?.message ?? 'יצירת הסרטון נכשלה.');
    } finally {
      setGenerating(false);
    }
  }

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
      {/* קנבס נסתר — קיים תמיד (לא רק בזמן הקלטה) כדי ש-`canvasRef` יהיה זמין
          לפני שהמשתמש לוחץ "צור סרטון". */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />
      {video && !videoFailed ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={video.url}
            controls
            muted
            loop
            playsInline
            className="w-full bg-black"
            onError={() => setVideoFailed(true)}
          />
          <p className="px-4 py-2.5 text-[11px] text-muted">
            {streetWalk.date ? `צולם ${streetWalk.date}. ` : ''}
            סרטון קצר מדגימת תמונות Street View אמיתיות לאורך הרחוב.
          </p>
        </>
      ) : allFailed ? (
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
              src={apiUrl(
                `/api/image?kind=street&lat=${current.lat}&lng=${current.lng}&heading=${current.heading}&w=900&h=500`,
              )}
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
          {cacheCheckFailed && (
            <p className="px-4 pb-2.5 text-[11px] text-amber-700">
              לא ניתן היה לבדוק אם קיים סרטון שמור לנכס זה כרגע — מוצג רצף התמונות
              במקום.
            </p>
          )}
          {canGenerate && permalink && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <button
                type="button"
                onClick={generateVideo}
                disabled={generating}
                className="rounded-full bg-teal px-3 py-1.5 text-[12px] font-bold text-white hover:bg-tealD disabled:opacity-50"
              >
                {generating ? 'מקליט סרטון…' : '🎬 צור סרטון רחוב (מהדפדפן)'}
              </button>
              {genError && <span className="text-[11px] text-red-600">{genError}</span>}
            </div>
          )}
        </>
      )}
    </figure>
  );
}
