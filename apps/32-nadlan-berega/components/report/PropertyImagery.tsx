'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import type { Place } from '@/lib/googlemaps';
import { MARKER_LABELS } from '@/lib/googlemaps';
import { distanceText, tierMayUseImagery, walkText } from '@/lib/report';
import type { ReportTier } from '@/lib/report';
import { apiUrl } from '@/lib/basepath';

/**
 * הנכס והסביבה: מפה אינטראקטיבית (כל הרמות) · צילום הבניין ומפה אזורית (VIP).
 *
 * ⚠️ המפה האינטראקטיבית היא הליבה של §4, והיא חינמית — ולכן היא מוצגת בכל
 * שלוש הרמות, כולל בחינמית. שלוש התמונות של גוגל (צילום רחוב, תצלום אוויר,
 * מפה סטטית מתויגת) נגבות לכל משיכה, ולכן §2 מייחד אותן ל-VIP.
 *
 * ⚠️ כל התמונות עוברות דרך `apiUrl('/api/image')` ולא דרך `/api/image` גולמי.
 * `basePath` של Next מקדים `<Link>` ואת הראוטר, אבל **לא** את `src` של `<img>`:
 * תחת `more30.com/nadlan` כתובת גולמית יוצאת ל-`more30.com/api/image`, נופלת
 * ל-catch-all של הפורטל ומחזירה HTML עם קוד 200 — כלומר `<img>` נשבר בשקט.
 */

// המפה נטענת רק בדפדפן: Leaflet ניגש ל-window בזמן הטעינה.
const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center text-[14px] text-muted">
      טוענים את המפה…
    </div>
  ),
});

export default function PropertyImagery({
  report,
  tier,
}: {
  report: PropertyReport;
  tier: ReportTier;
}) {
  const { lat, lng } = report.location;
  const [photoFailed, setPhotoFailed] = useState(false);
  const [aerialFailed, setAerialFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  /** הסימונים והמקרא נגזרים מאותה רשימה — כדי שאות על המפה תמיד תתאים לשורה. */
  const pool = useMemo<Place[]>(
    () =>
      [...report.places.education, ...report.places.transport, ...report.places.daily]
        .slice()
        .sort((a, b) => a.straightMeters - b.straightMeters),
    [report.places],
  );
  const tagged = useMemo(
    () => pool.slice(0, MARKER_LABELS.length).map((p, i) => ({ place: p, label: MARKER_LABELS[i] })),
    [pool],
  );

  const markerParam = useMemo(
    () => tagged.map((t) => `${t.place.lat},${t.place.lng},${t.label}`).join(';'),
    [tagged],
  );

  if (lat == null || lng == null) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-lg font-black text-navy">מפה ותמונות</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          לא אותר מיקום מדויק לנכס, ולכן אין באפשרותנו להציג מפה, צילום או תצלום אוויר.
        </p>
      </section>
    );
  }

  const imagery = tierMayUseImagery(tier);
  const mapLabel = report.title.headline || report.query;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-black text-navy">הנכס על המפה</h2>

      {/* ===== §4 · מפה אינטראקטיבית — בכל הרמות ===== */}
      <figure className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
          מפה אינטראקטיבית — מיקום הנכס, הגדלה, הזזה ותצלום לוויין
        </figcaption>
        <InteractiveMap
          lat={lat}
          lng={lng}
          label={mapLabel}
          places={pool.slice(0, 40)}
          plans={report.nearbyPlans}
        />
      </figure>

      {/* ===== §2 · צילום ומפה אזורית — VIP בלבד ===== */}
      {imagery ? (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
                צילום הבניין
              </figcaption>
              {/* §3 · צילום נכון או כלום. `precise` נקבע במנוע לפי מרחק
                  הפנורמה מהנכס ולפי קיום מיקום שאפשר לחשב ממנו כיוון. */}
              {report.streetView?.available && report.streetView?.precise && !photoFailed ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiUrl(`/api/image?kind=street&lat=${lat}&lng=${lng}&w=900&h=500`)}
                    alt="צילום רחוב של הבניין"
                    className="w-full object-cover"
                    /* טעינה מיידית: טעינה עצלה מנעה מהתמונה להיכנס ל-PDF. */
                    loading="eager"
                    onError={() => setPhotoFailed(true)}
                  />
                  <p className="px-4 py-2.5 text-[11px] text-muted">
                    {report.streetView.date ? `צולם ${report.streetView.date}. ` : ''}
                    המצלמה מכוונת מנקודת הצילום אל הבניין עצמו. ייתכן שהבניין השתנה מאז.
                  </p>
                </>
              ) : (
                <div className="px-4 py-6">
                  <div className="text-[15px] font-bold text-slate-400">צילום מדויק לא זמין</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">
                    {report.streetView?.aimReason ??
                      'אין צילום רחוב זמין לנקודה הזו.'}{' '}
                    לא הצגנו תמונה חלופית: צילום של הבניין הלא נכון גרוע מהיעדר צילום.
                  </p>
                </div>
              )}
            </figure>

            <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
                תצלום אוויר
              </figcaption>
              {!aerialFailed ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiUrl(`/api/image?kind=satellite&lat=${lat}&lng=${lng}&zoom=18&w=900&h=500`)}
                    alt="תצלום אוויר של הנכס וסביבתו"
                    className="w-full object-cover"
                    loading="eager"
                    onError={() => setAerialFailed(true)}
                  />
                  <p className="px-4 py-2.5 text-[11px] text-muted">הסימון הירוק הוא הנכס.</p>
                </>
              ) : (
                <p className="px-4 py-6 text-[14px] leading-relaxed text-muted">
                  תצלום האוויר אינו זמין כרגע.
                </p>
              )}
            </figure>
          </div>

          {/* מפה אזורית מתויגת — נכנסת גם ל-PDF ולמצגת, שם אין מפה אינטראקטיבית. */}
          <figure className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
              מפה אזורית — כל סימון מתויג
            </figcaption>
            {!mapFailed ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apiUrl(
                    `/api/image?kind=map&lat=${lat}&lng=${lng}&zoom=16&w=900&h=560&markers=${encodeURIComponent(markerParam)}`,
                  )}
                  alt="מפה של סביבת הנכס עם סימונים מתויגים"
                  className="w-full object-cover"
                  loading="eager"
                  onError={() => setMapFailed(true)}
                />
                <p className="px-4 pt-2.5 text-[11px] text-muted">
                  הסימון הירוק הגדול הוא הנכס. כל סימון זהוב נושא אות, והאות מופיעה במקרא שמתחת.
                </p>
              </>
            ) : (
              <p className="px-4 py-6 text-[14px] leading-relaxed text-muted">המפה אינה זמינה כרגע.</p>
            )}

            {tagged.length > 0 && (
              <ul className="grid gap-x-6 gap-y-1.5 px-4 pb-4 pt-3 sm:grid-cols-2">
                {tagged.map(({ place, label }) => (
                  <li key={label} className="flex items-baseline gap-2 text-[13px]">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/25 text-[11px] font-black text-[#7a5f1f]">
                      {label}
                    </span>
                    <span className="text-ink">
                      <b className="text-navy">{place.kind}</b> · {place.name} ·{' '}
                      {distanceText(place.straightMeters) ?? '—'}
                      {place.walkSeconds != null && (
                        <span className="text-muted"> · {walkText(place.walkSeconds)} הליכה</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </figure>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/[0.07] p-5">
          <div className="text-[15px] font-black text-[#8a6d24]">
            ✦ צילום הבניין ומפה אזורית — בדוח VIP
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
            צילום הרחוב מכוון אל הבניין עצמו, תצלום האוויר והמפה האזורית המתויגת נמשכים משירות
            שנגבה לכל תמונה. לכן הם נכללים בדוח ה-VIP בלבד — וכך הדוח החינמי נשאר באמת חינמי.
            המפה האינטראקטיבית שלמעלה זמינה בכל הרמות, כולל תצלום לוויין.
          </p>
        </div>
      )}
    </section>
  );
}
