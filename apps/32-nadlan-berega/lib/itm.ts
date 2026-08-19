// ==== המרת קואורדינטות: WGS84 <-> ITM (רשת ישראל החדשה, EPSG:2039) ====
// מימוש עצמאי של Transverse Mercator על אליפסואיד GRS80 — בלי תלות ב-proj4,
// כדי לא להוסיף תלות חיצונית לנתיב הקריטי.
//
// פרמטרים רשמיים של Israeli TM Grid (EPSG:2039):
//   ellipsoid GRS80: a = 6378137, 1/f = 298.257222101
//   lat0 = 31°44'03.817"N, lon0 = 35°12'16.261"E, k0 = 1.0000067
//   false easting = 219529.584, false northing = 626907.390
//
// 🔴 הבאג ששכב כאן, והוא שורש הגוש/חלקה השגויים:
//   EPSG:2039 יושבת על **דאטום ישראל 1993 (IG05)**, לא על WGS84. ההיטל לבדו
//   אינו מספיק — חייבת לבוא לפניו טרנספורמציית דאטום. בלעדיה כל נקודה בישראל
//   מוסטת בכ-**77 מטר**, וזה יותר מרוחב חלקה עירונית.
//
//   נמדד מול שתי נקודות בקרה בלתי תלויות לאותו מיקום פיזי ("דיזנגוף 100 תל אביב"):
//     · GovMap autocomplete מחזיר Web Mercator (3871037.03, 3773716.32)
//     · nadlan.gov.il שולח לשרת הקדסטר ITM (178828.35, 665186.31)
//   ההמרה הישנה נתנה (178894.34, 665226.82) — סטייה של 66 מ' מזרחה ו-40 צפונה.
//   התוצאה בפועל: שאילתת הקדסטר נפלה בחלקה השכנה, ו"דיזנגוף 100" הוצג כגוש
//   7091 **חלקה 203** — החלקה של דיזנגוף 102. הקדסטר החי, וגם nadlan.gov.il
//   לאותה כתובת, אומרים גוש 7091 **חלקה 7**.
//
//   עם הטרנספורמציה שלמטה השארית יורדת ל-**1.1 מ'** על אותה נקודת בקרה.
//   פגע לא רק בגוש/חלקה אלא בכל שאילתה מבוססת-ITM: תכנון (XPLAN), התחדשות
//   עירונית, וייבוא נקודות עניין.

const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = 2 * F - F * F; // eccentricity squared
const K0 = 1.0000067;
const LAT0 = (31 + 44 / 60 + 3.817 / 3600) * (Math.PI / 180);
const LON0 = (35 + 12 / 60 + 16.261 / 3600) * (Math.PI / 180);
const FE = 219529.584;
const FN = 626907.39;

/**
 * "Israel 1993 to WGS 84 (1)" — Helmert 7 פרמטרים, מוסכמת position-vector.
 * הכיוון המוצהר הוא IG05 → WGS84; לכיוון ההפוך מפעילים את ההופכי.
 */
const HELMERT = {
  dx: -24.0024, dy: -17.1032, dz: -17.8444, // מטרים
  rx: -0.33077, ry: -1.85269, rz: 1.66969, // שניות קשת
  s: 5.4262, // ppm
};
const ARCSEC = Math.PI / 648000;

/** גיאודטי -> גאוצנטרי XYZ (גובה 0; ההשפעה על מיקום אופקי זניחה). */
function toXyz(latDeg: number, lngDeg: number): { X: number; Y: number; Z: number } {
  const p = latDeg * (Math.PI / 180);
  const l = lngDeg * (Math.PI / 180);
  const s = Math.sin(p);
  const N = A / Math.sqrt(1 - E2 * s * s);
  return {
    X: N * Math.cos(p) * Math.cos(l),
    Y: N * Math.cos(p) * Math.sin(l),
    Z: N * (1 - E2) * s,
  };
}

/** גאוצנטרי XYZ -> גיאודטי (איטרציה — מתכנסת ב-3–4 סבבים בקווי רוחב של ישראל). */
function fromXyz(X: number, Y: number, Z: number): { lat: number; lng: number } {
  const lng = Math.atan2(Y, X);
  const p = Math.hypot(X, Y);
  let lat = Math.atan2(Z, p * (1 - E2));
  for (let i = 0; i < 8; i++) {
    const s = Math.sin(lat);
    const N = A / Math.sqrt(1 - E2 * s * s);
    lat = Math.atan2(Z + E2 * N * s, p);
  }
  return { lat: lat * (180 / Math.PI), lng: lng * (180 / Math.PI) };
}

/** WGS84 -> ישראל 1993 (הופכי של הטרנספורמציה המוצהרת). */
function wgs84ToIg05(latDeg: number, lngDeg: number): { lat: number; lng: number } {
  const { X, Y, Z } = toXyz(latDeg, lngDeg);
  const S = 1 + HELMERT.s * 1e-6;
  const rx = HELMERT.rx * ARCSEC, ry = HELMERT.ry * ARCSEC, rz = HELMERT.rz * ARCSEC;
  const dx = (X - HELMERT.dx) / S, dy = (Y - HELMERT.dy) / S, dz = (Z - HELMERT.dz) / S;
  return fromXyz(dx + rz * dy - ry * dz, -rz * dx + dy + rx * dz, ry * dx - rx * dy + dz);
}

/** ישראל 1993 -> WGS84. */
function ig05ToWgs84(latDeg: number, lngDeg: number): { lat: number; lng: number } {
  const { X, Y, Z } = toXyz(latDeg, lngDeg);
  const S = 1 + HELMERT.s * 1e-6;
  const rx = HELMERT.rx * ARCSEC, ry = HELMERT.ry * ARCSEC, rz = HELMERT.rz * ARCSEC;
  return fromXyz(
    HELMERT.dx + S * (X - rz * Y + ry * Z),
    HELMERT.dy + S * (rz * X + Y - rx * Z),
    HELMERT.dz + S * (-ry * X + rx * Y + Z),
  );
}

/** אורך קשת מרידיאן מקו המשווה עד קו רוחב נתון. */
function meridianArc(lat: number): number {
  const e2 = E2, e4 = e2 * e2, e6 = e4 * e2;
  const c0 = 1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256;
  const c2 = (3 / 8) * (e2 + e4 / 4 + (15 * e6) / 128);
  const c4 = (15 / 256) * (e4 + (3 * e6) / 4);
  const c6 = (35 * e6) / 3072;
  return A * (c0 * lat - c2 * Math.sin(2 * lat) + c4 * Math.sin(4 * lat) - c6 * Math.sin(6 * lat));
}

export interface ItmPoint { x: number; y: number }

/** WGS84 (מעלות) -> ITM EPSG:2039 (מטרים). כולל טרנספורמציית הדאטום. */
export function wgs84ToItm(latWgs: number, lngWgs: number): ItmPoint {
  const { lat, lng } = wgs84ToIg05(latWgs, lngWgs);
  const phi = lat * (Math.PI / 180);
  const lam = lng * (Math.PI / 180);
  const sinP = Math.sin(phi), cosP = Math.cos(phi), tanP = Math.tan(phi);

  const N = A / Math.sqrt(1 - E2 * sinP * sinP);
  const T = tanP * tanP;
  const ep2 = E2 / (1 - E2);
  const C = ep2 * cosP * cosP;
  const Aa = (lam - LON0) * cosP;
  const M = meridianArc(phi);
  const M0 = meridianArc(LAT0);

  const A2 = Aa * Aa, A3 = A2 * Aa, A4 = A3 * Aa, A5 = A4 * Aa, A6 = A5 * Aa;

  const x =
    FE +
    K0 * N * (Aa + ((1 - T + C) * A3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A5) / 120);

  const y =
    FN +
    K0 *
      (M - M0 +
        N * tanP *
          (A2 / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A4) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A6) / 720));

  return { x, y };
}

/** ITM EPSG:2039 (מטרים) -> WGS84 (מעלות). */
export function itmToWgs84(x: number, y: number): { lat: number; lng: number } {
  const M = meridianArc(LAT0) + (y - FN) / K0;
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinP = Math.sin(phi1), cosP = Math.cos(phi1), tanP = Math.tan(phi1);
  const ep2 = E2 / (1 - E2);
  const C1 = ep2 * cosP * cosP;
  const T1 = tanP * tanP;
  const N1 = A / Math.sqrt(1 - E2 * sinP * sinP);
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * sinP * sinP, 1.5);
  const D = (x - FE) / (N1 * K0);
  const D2 = D * D, D3 = D2 * D, D4 = D3 * D, D5 = D4 * D, D6 = D5 * D;

  const lat =
    phi1 -
    ((N1 * tanP) / R1) *
      (D2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D6) / 720);

  const lng =
    LON0 +
    (D -
      ((1 + 2 * T1 + C1) * D3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D5) / 120) /
      cosP;

  // ההיטל ההפוך מחזיר גיאודטי על **דאטום ישראל 1993** — עוד לא WGS84.
  return ig05ToWgs84(lat * (180 / Math.PI), lng * (180 / Math.PI));
}

/** בדיקת שפיות: האם הנקודה נופלת בתחום רשת ישראל. */
export function isPlausibleItm(x: number, y: number): boolean {
  return x > 100000 && x < 320000 && y > 350000 && y < 1000000;
}

// ---- Web Mercator (EPSG:3857) ----
// ה-API של GovMap מחזיר קואורדינטות ב-3857 (השדה `shape`), ולכן נדרשת
// חוליית ביניים: 3857 -> WGS84 -> ITM.

const MERC_R = 20037508.34;

export function mercatorToWgs84(mx: number, my: number): { lat: number; lng: number } {
  const lng = (mx / MERC_R) * 180;
  const t = (my / MERC_R) * 180;
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((t * Math.PI) / 180)) - Math.PI / 2);
  return { lat, lng };
}

export function wgs84ToMercator(lat: number, lng: number): { x: number; y: number } {
  const x = (lng / 180) * MERC_R;
  const y =
    (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180) / 180) * MERC_R;
  return { x, y };
}

/** קיצור נפוץ: נקודת Web Mercator -> ITM. */
export function mercatorToItm(mx: number, my: number): ItmPoint {
  const { lat, lng } = mercatorToWgs84(mx, my);
  return wgs84ToItm(lat, lng);
}

/** פרסור מחרוזת WKT מסוג POINT(x y) כפי שמוחזרת בשדה `shape`. */
export function parseWktPoint(wkt: string): { x: number; y: number } | null {
  const m = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(wkt ?? '');
  if (!m) return null;
  const x = Number(m[1]), y = Number(m[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
