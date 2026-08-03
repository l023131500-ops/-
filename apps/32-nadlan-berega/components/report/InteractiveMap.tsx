'use client';

import { useEffect, useRef, useState } from 'react';
// ⚠️ ה-CSS מיובא סטטית ולא בייבוא דינמי: `import()` של קובץ סגנון אינו נתמך
// כמודול, ובלי הקובץ הזה האריחים נערמים זה על זה ובורר השכבות בלתי קריא.
import 'leaflet/dist/leaflet.css';
import type { Place } from '@/lib/googlemaps';
import { distanceText } from '@/lib/report';

/**
 * §4 במפרט — מפה אינטראקטיבית אמיתית.
 *
 * למה לא המפה הסטטית שהייתה כאן: תמונה אינה מאפשרת הגדלה, הזזה או מעבר
 * ללווין, ובדיוק שלושת אלה נדרשים. המפה כאן היא Leaflet על אריחים פתוחים,
 * ולכן היא גם **חינמית לחלוטין** — מה שמאפשר להציג אותה גם בדוח החינמי
 * מבלי להפר את §2.
 *
 * שתי שכבות: מפת רחובות (OpenStreetMap) ותצלום לווין (Esri World Imagery).
 * שתיהן ללא מפתח וללא רישום, ושתיהן נושאות ייחוס כפי שרישיונן מחייב.
 *
 * ⚠️ הסימונים של נקודות העניין הם עיגולים קטנים (10 פיקסלים) ולא סיכות —
 * המפרט מבקש במפורש "איקונים קטנים שלא יסתירו את המפה". רק הנכס עצמו מקבל
 * סימון גדול ובולט, כי הוא מה שהמפה באה להראות.
 *
 * ⚠️ Leaflet נטען בייבוא דינמי בתוך `useEffect` ולא בראש הקובץ: הוא ניגש
 * ל-`window` בזמן הטעינה, ורינדור בצד השרת של Next היה נופל עליו.
 */

const OSM = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap',
  maxZoom: 19,
};
const SAT = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Esri · Maxar · Earthstar Geographics',
  maxZoom: 19,
};

export default function InteractiveMap({
  lat,
  lng,
  label,
  places,
  height = 460,
}: {
  lat: number;
  lng: number;
  /** מה כתוב בבועה של הנכס — הכתובת או הגוש/חלקה. */
  label: string;
  places: Place[];
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        if (cancelled || !boxRef.current || mapRef.current) return;

        map = L.map(boxRef.current, {
          center: [lat, lng],
          zoom: 17,
          scrollWheelZoom: false, // גלילה בעמוד לא אמורה להזיז את המפה בטעות
          zoomControl: true,
          attributionControl: true,
        });
        mapRef.current = map;

        const streets = L.tileLayer(OSM.url, {
          maxZoom: OSM.maxZoom,
          attribution: OSM.attribution,
        }).addTo(map);
        const satellite = L.tileLayer(SAT.url, {
          maxZoom: SAT.maxZoom,
          attribution: SAT.attribution,
        });
        L.control
          .layers({ 'מפת רחובות': streets, 'תצלום לוויין': satellite }, undefined, {
            collapsed: false,
            position: 'topleft',
          })
          .addTo(map);

        // לחיצה אחת מפעילה גלגלת — כדי שהמפה תהיה שלטת כשעובדים בה,
        // ולא תחטוף את הגלילה בזמן קריאת הדוח.
        map.on('click', () => map.scrollWheelZoom.enable());
        map.on('mouseout', () => map.scrollWheelZoom.disable());

        // ===== איקון הנכס עצמו =====
        const propertyIcon = L.divIcon({
          className: '',
          html:
            '<div style="position:relative;width:34px;height:44px">' +
            '<div style="position:absolute;inset:0;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">' +
            '<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M17 43C17 43 32 26.5 32 16A15 15 0 1 0 2 16c0 10.5 15 27 15 27z" fill="#0f766e" stroke="#fff" stroke-width="2.5"/>' +
            '<circle cx="17" cy="16" r="6" fill="#fff"/></svg></div></div>',
          iconSize: [34, 44],
          iconAnchor: [17, 43],
          popupAnchor: [0, -38],
        });
        L.marker([lat, lng], { icon: propertyIcon, title: label, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(`<b>מיקום הנכס</b><br>${escapeHtml(label)}`)
          .openPopup();

        // ===== נקודות עניין — עיגולים קטנים =====
        //
        // §4 בגרסה 2: "איקונים קטנים יותר ובצבע יפה ואחיד". הרדיוס ירד מ-5
        // ל-3.5 והמסגרת מ-2 ל-1.5, והצבע אחיד לכל הסוגים — טורקיז כהה
        // (`#0f766e`) שהוא צבע המותג, במקום זהב שנבלע ברקע של תצלום הלוויין.
        // ⚠️ צבע לפי קטגוריה נשקל ונדחה: הוא היה מחזיר את הבעיה שהמפרט מבקש
        // לפתור — מפה מנוקדת בצבעים שמושכים את העין מהמפה עצמה.
        for (const p of places) {
          if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
          if (p.lat === 0 && p.lng === 0) continue;
          L.circleMarker([p.lat, p.lng], {
            radius: 3.5,
            weight: 1.5,
            color: '#ffffff',
            fillColor: '#0f766e',
            fillOpacity: 0.95,
          })
            .addTo(map)
            .bindPopup(
              `<b>${escapeHtml(p.name)}</b><br>${escapeHtml(p.kind)}` +
                `<br>${escapeHtml(distanceText(p.straightMeters) ?? '')} מהנכס`,
            );
        }

        // גודל המפה נמדד אחרי שהיא נכנסה לפריסה — בלי זה חצי מהאריחים
        // נשארים אפורים כשהיא מרונדרת בתוך רשת שעדיין לא התייצבה.
        setTimeout(() => map && map.invalidateSize(), 200);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, label, places]);

  if (failed) {
    return (
      <p className="px-4 py-6 text-[14px] leading-relaxed text-muted">
        המפה האינטראקטיבית לא נטענה. הקואורדינטות של הנכס הן {lat.toFixed(6)}, {lng.toFixed(6)}.
      </p>
    );
  }

  return (
    <>
      <div
        ref={boxRef}
        style={{ height }}
        className="w-full print:hidden"
        role="application"
        aria-label="מפה אינטראקטיבית של מיקום הנכס וסביבתו"
      />
      <p className="px-4 py-2.5 text-[11.5px] leading-relaxed text-muted print:hidden">
        הסימון הגדול הוא מיקום הנכס. הנקודות הקטנות הן מוסדות ותחנות בסביבה — לחיצה מציגה שם
        ומרחק. אפשר להגדיל ולהקטין, לגרור לצדדים, ולעבור לתצלום לוויין בבורר השכבות שמימין למעלה.
        גלגלת העכבר מזיזה את המפה רק אחרי לחיצה עליה, כדי שלא תקפוץ בזמן קריאה.
      </p>
    </>
  );
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
