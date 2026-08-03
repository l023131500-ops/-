'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';

/**
 * §7 · התשריט התכנוני הרשמי — מוטמע בדוח, לא כקישור.
 *
 * זו לא איור שלנו: זו שכבת ייעודי הקרקע והקווים הכחולים של מינהל התכנון,
 * מרונדרת מהשירות שלו עצמו סביב נקודת הנכס. המקרא נמשך מאותו שירות ומסונן
 * לערכים שבאמת חלים כאן, כדי שהצבעים יהיו קריאים.
 *
 * ⚠️ קובצי התקנון והתשריט של MAVAT אינם ניתנים להטמעה: ההורדה שם מוגנת
 * ב-reCAPTCHA, ועמוד התכנית מחזיר `X-Frame-Options: SAMEORIGIN` (נמדד).
 * לכן להם — ורק להם — מוצג קישור, כפי שהמפרט מתיר.
 */
export default function PlanMap({
  lat,
  lng,
  landUses,
}: {
  lat: number;
  lng: number;
  /** התוויות שמופיעות בפועל על החלקה — לסינון המקרא. */
  landUses: string[];
}) {
  const [failed, setFailed] = useState(false);
  const [legend, setLegend] = useState<{ label: string; image: string }[]>([]);
  const [zoomed, setZoomed] = useState(false);

  const labels = Array.from(new Set(landUses.filter(Boolean)));

  useEffect(() => {
    if (!labels.length) return;
    let cancelled = false;
    fetch(apiUrl(`/api/planlegend?labels=${encodeURIComponent(labels.join('|'))}`))
      .then((r) => r.json())
      .then((d) => !cancelled && setLegend(Array.isArray(d?.items) ? d.items : []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels.join('|')]);

  if (failed) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-white p-5 text-[14px] leading-relaxed text-muted shadow-card">
        התשריט התכנוני לא נטען כרגע משירות המפות של מינהל התכנון. הנתונים התכנוניים שמוצגים
        למעלה נמשכו מאותו שירות והם תקפים.
      </div>
    );
  }

  // span קטן = מבט צמוד לחלקה; גדול = הקשר שכונתי.
  const span = zoomed ? 0.0006 : 0.0016;

  return (
    <figure className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="font-black text-navy">התשריט התכנוני על החלקה</span>
        <button
          type="button"
          onClick={() => setZoomed((v) => !v)}
          className="rounded-lg border border-line bg-bgsoft px-3 py-1.5 text-[12px] font-bold text-tealD hover:border-teal print:hidden"
        >
          {zoomed ? 'הצג הקשר רחב יותר' : 'התקרב לחלקה'}
        </button>
      </figcaption>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={apiUrl(`/api/planmap?lat=${lat}&lng=${lng}&w=900&h=560&span=${span}`)}
        alt="תשריט תכנוני: ייעודי קרקע, קווי בניין וקווים כחולים של התכניות סביב הנכס"
        className="w-full"
        loading="eager"
        onError={() => setFailed(true)}
      />

      {legend.length > 0 && (
        <ul className="grid gap-x-6 gap-y-1.5 px-4 pb-1 pt-3 sm:grid-cols-2">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-2 text-[13px] text-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt="" aria-hidden className="h-4 w-4 shrink-0 rounded-sm border border-line" />
              <span>{l.label}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="px-4 py-3 text-[11.5px] leading-relaxed text-muted">
        התשריט מרונדר משכבות ייעודי הקרקע, הישויות הקוויות (ובהן קווי הבניין) והקווים הכחולים
        של מינהל התכנון, סביב נקודת הנכס. הקו הכחול הוא גבול התכנית; הצבע הוא ייעוד תא השטח.
      </p>
    </figure>
  );
}
