/**
 * גאומטריית פוליגונים טהורה — בלי import לשום דבר, כמו aim.ts.
 *
 * הצעד הבא (§12 במפרט: "אתרי בנייה ותכנון באזור הנכס") צריך למקם כל תכנית
 * שנמצאת ברדיוס על המפה — לא רק לדעת שהיא קיימת. ArcGIS מחזיר את הפוליגון
 * של התכנית (`geometry.rings`), לא נקודה בודדת, ולכן צריך למצוא נקודת ייצוג
 * אחת ממנו. **ממוצע הקודקודים אינו מרכז המסה** של פוליגון לא-סימטרי — לדוגמה
 * פוליגון עם קודקוד אחד רחוק "מושך" את הממוצע אליו יותר משטח הפוליגון האמיתי
 * מצדיק. `polygonCentroid` מחשבת את מרכז השטח (shoelace), לא ממוצע קודקודים.
 */

export interface Point {
  x: number;
  y: number;
}

/** שטח מסומן (חיובי בכיוון נגד השעון) וסכומי ה-shoelace לחישוב המרכז. */
function ringMoments(ring: number[][]): { area2: number; cx6: number; cy6: number } | null {
  if (!ring || ring.length < 3) return null;
  // ArcGIS סוגר את הטבעת בעצמו (הנקודה הראשונה = האחרונה), אבל לא מניחים זאת.
  const pts = ring;
  let area2 = 0;
  let cx6 = 0;
  let cy6 = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx6 += (x0 + x1) * cross;
    cy6 += (y0 + y1) * cross;
  }
  return { area2, cx6, cy6 };
}

/**
 * מרכז השטח (centroid) של פוליגון ArcGIS (`geometry.rings`).
 *
 * ⚠️ `rings` יכול להכיל כמה טבעות (פוליגון עם חור, או multipart) — נבחרת
 * הטבעת עם השטח הגדול ביותר, כי היא זו שמייצגת את גוף התכנית ולא חור/רסיס.
 *
 * מחזירה `null` על פוליגון מנוון (שטח 0, למשל קו שנשלח בטעות כפוליגון) —
 * במקרה הזה עדיף "אין מיקום" על פני ניחוש.
 */
export function polygonCentroid(rings: number[][][] | null | undefined): Point | null {
  if (!rings || !rings.length) return null;

  let best: { area2: number; cx6: number; cy6: number } | null = null;
  for (const ring of rings) {
    const m = ringMoments(ring);
    if (!m) continue;
    if (!best || Math.abs(m.area2) > Math.abs(best.area2)) best = m;
  }
  if (!best || best.area2 === 0) return null;

  const area2 = best.area2;
  return { x: best.cx6 / (3 * area2), y: best.cy6 / (3 * area2) };
}

/** מרחק אוקלידי במטרים — תקף כי ITM היא הטלה מטרית, בלי לעבור דרך WGS84. */
export function planarDistanceM(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
