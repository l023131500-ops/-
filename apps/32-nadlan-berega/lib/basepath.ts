/**
 * קידומת הנתיב שבה האפליקציה מוגשת.
 *
 * למה זה נחוץ: `basePath` של Next.js מקדים אוטומטית את `<Link>`, את הראוטר ואת
 * `/_next`, אבל **לא** נוגע ב-`fetch()` גולמי. כשהאפליקציה מוגשת תחת
 * `more30.com/nadlan`, קריאה ל-`fetch('/api/report')` יוצאת לשורש הדומיין,
 * נופלת ל-catch-all של הפורטל, ומחזירה את דף הבית במקום JSON.
 *
 * ברירת המחדל ריקה, כך שהריפו נשאר פריס גם בשורש (nadlan-berega.vercel.app).
 * העותק שנפרס תחת הנתיב מגדיר `NEXT_PUBLIC_BASE_PATH=/nadlan` ב-next.config.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/** בונה כתובת פנימית מוחלטת שמכבדת את קידומת הנתיב. */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
