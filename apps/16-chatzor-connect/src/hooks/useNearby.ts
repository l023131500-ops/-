import { useCallback, useState } from "react";
import type { Synagogue } from "@/lib/types";

/**
 * "מצא בית כנסת קרוב" — מרחק אמיתי מהמבקר לכל בית כנסת.
 *
 * המיקום מגיע מהדפדפן באישור המשתמש, והמרחק מחושב מהקואורדינטות שנרשמו
 * לכל בית כנסת. אין כאן שירות חיצוני, אין מפתח ואין שליחה של המיקום לשום
 * מקום — הוא נשאר בדפדפן.
 *
 * ⚠️ זהו מרחק אווירי, ולא מרחק הליכה. ההפרש משמעותי ביישוב הררי, ולכן הוא
 * נאמר במפורש במסך ולא מוצג כאילו הוא זמן הליכה.
 */

export type NearbyState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; lat: number; lng: number }
  | { status: "denied" }
  | { status: "unavailable" };

const EARTH_RADIUS_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

/** מרחק אווירי במטרים בין שתי נקודות. */
export function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} מ׳`;
  return `${(meters / 1000).toFixed(1)} ק״מ`;
}

/** קישור ניווט. פותח את אפליקציית המפות של המכשיר — בלי מפתח ובלי SDK. */
export function navigationUrl(s: Pick<Synagogue, "name" | "latitude" | "longitude">): string | null {
  if (s.latitude == null || s.longitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
}

export function useNearby() {
  const [state, setState] = useState<NearbyState>({ status: "idle" });

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({ status: "ready", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  /**
   * מוסיף מרחק לכל בית כנסת וממיין מהקרוב לרחוק.
   * בית כנסת בלי מיקום רשום נשאר ברשימה, בסופה, בלי מרחק — הוא קיים,
   * פשוט לא ידוע כמה הוא רחוק.
   */
  const withDistance = useCallback(
    <T extends Pick<Synagogue, "latitude" | "longitude">>(items: T[]): (T & { meters: number | null })[] => {
      if (state.status !== "ready") return items.map((s) => ({ ...s, meters: null }));
      return items
        .map((s) => ({
          ...s,
          meters:
            s.latitude != null && s.longitude != null
              ? metersBetween(state.lat, state.lng, s.latitude, s.longitude)
              : null,
        }))
        .sort((a, b) => {
          if (a.meters == null) return 1;
          if (b.meters == null) return -1;
          return a.meters - b.meters;
        });
    },
    [state],
  );

  return { state, locate, withDistance };
}
