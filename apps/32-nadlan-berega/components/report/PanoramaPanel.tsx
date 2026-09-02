'use client';

import type { PropertyReport } from '@/lib/buildreport';
import { apiUrl } from '@/lib/basepath';

/**
 * §2 · פנורמה אינטראקטיבית 360° בנקודה המדויקת של הנכס — לצד צילום הבניין
 * הקבוע (מכוון) שכבר קיים ב-PropertyImagery. גוגל (Street View חי, בגרירה)
 * כשיש כיסוי; Mapillary (תצלום סטטי) כנפילה חזרה כשאין. `report.panorama`
 * כבר `null` כשאין שום כיסוי בשני המקורות — מוצג כ"לא זמין", לא כתמונה ריקה.
 */
export default function PanoramaPanel({ report }: { report: PropertyReport }) {
  const panorama = report.panorama;

  return (
    <figure className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <figcaption className="border-b border-line px-4 py-3 font-black text-navy">
        פנורמה אינטראקטיבית 360°
      </figcaption>
      {!panorama ? (
        <div className="px-4 py-6">
          <div className="text-[15px] font-bold text-slate-400">אין כיסוי פנורמה</div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            אין תצוגת רחוב בנקודה המדויקת הזו — לא ב-Google Street View ולא ב-Mapillary.
          </p>
        </div>
      ) : panorama.source === 'google' ? (
        <>
          <iframe
            title="פנורמת רחוב אינטראקטיבית"
            src={apiUrl(`/api/panorama-embed?lat=${panorama.lat}&lng=${panorama.lng}`)}
            className="h-[420px] w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <p className="px-4 py-2.5 text-[11px] text-muted">
            {panorama.date ? `צולם ${panorama.date}. ` : ''}
            ניתן לגרור כדי להסתובב ולהתקרב — תצוגה חיה מ-Google Street View.
          </p>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={panorama.mapillaryImageUrl}
            alt="תצלום רחוב מ-Mapillary"
            className="w-full object-cover"
            loading="lazy"
          />
          <p className="px-4 py-2.5 text-[11px] text-muted">
            {panorama.date ? `צולם ${panorama.date}. ` : ''}
            תצלום רחוב סטטי מ-Mapillary — אין כיסוי Google Street View בנקודה זו.
          </p>
        </>
      )}
    </figure>
  );
}
