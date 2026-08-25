// ==== §8 · שמירת הדוחות וקישור קבוע לכל נכס ====
//
// המפרט מבקש שני דברים נפרדים:
//   1. **קישור ייעודי קבוע לכל נכס** — שאותו נכס יקבל תמיד את אותה כתובת,
//      גם אם הדוח יופק שוב בעוד חצי שנה. לכן ה-slug **נגזר** מזהות הנכס
//      ואינו מוגרל: הגרלה הייתה יוצרת קישור חדש בכל הפקה, ואז "קבוע" הוא
//      רק שם.
//   2. **שהמידע לא ייעלם** — לכן כל הפקה נשמרת גם כגרסה נפרדת, וניתן לחזור
//      ולראות מה הדוח אמר בתאריך מסוים.
//
// ⚠️ השמירה היא best-effort ולעולם אינה שוברת את התשובה ללקוח: כישלון אחסון
// אינו סיבה לא להציג דוח שכבר הופק.

import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import type { PropertyReport } from './buildreport';
import { TIER_ORDER, type ReportTier } from './report';
import { isAssetType } from './assettype';

type NadlanClient = SupabaseClient<any, 'nadlan', any>;

let admin: NadlanClient | null = null;
function store(): NadlanClient | null {
  if (admin) return admin;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  admin = createClient(url, key, { db: { schema: 'nadlan' }, auth: { persistSession: false } });
  return admin;
}

const tidy = (s: string | null | undefined) =>
  (s ?? '').replace(/["'`״׳]/g, '').replace(/\s+/g, ' ').trim();

/**
 * זהות הנכס — המפתח שעליו נבנה הקישור הקבוע.
 *
 * ⚠️ גוש/חלקה/תת-חלקה קודמים לכתובת. אותה דירה נכתבת ב-חמש צורות ("הבעש\"ט 9",
 * "הבעשט 9", "בעל שם טוב 9"), ואילו גוש וחלקה הם מזהה יחיד. כשאין גוש/חלקה
 * נופלים לכתובת מנורמלת — וזה הרע במיעוטו, לא בחירה.
 */
export function propertyKeyOf(report: PropertyReport, input: {
  tatHelka?: string | null;
  entrance?: string | null;
  apartment?: string | null;
}): string {
  const t = report.title;
  const unitPart = [
    input.tatHelka ? `t${tidy(input.tatHelka)}` : '',
    input.entrance ? `e${tidy(input.entrance)}` : '',
    input.apartment ? `a${tidy(input.apartment)}` : '',
  ]
    .filter(Boolean)
    .join('-');

  const base =
    t.gush && t.helka
      ? `p:${tidy(t.gush)}/${tidy(t.helka)}`
      : `a:${tidy(t.city)}|${tidy(t.streetOfficial ?? t.streetDisplay)}|${tidy(t.houseNumber)}`;

  return [base, unitPart, report.assetType].filter(Boolean).join('|');
}

/**
 * ה-slug של הקישור הקבוע: קידומת קריאה + טביעת אצבע יציבה של המפתח.
 * הקידומת קיימת כדי שקישור שנשלח בוואטסאפ יגיד משהו לפני שפותחים אותו.
 */
export function slugOf(report: PropertyReport, propertyKey: string): string {
  const hash = createHash('sha256').update(propertyKey).digest('base64url').slice(0, 10);
  const t = report.title;
  const readable =
    t.gush && t.helka
      ? `${t.gush}-${t.helka}`
      : tidy([t.streetOfficial ?? t.streetDisplay, t.houseNumber, t.city].filter(Boolean).join('-'))
          .replace(/\s+/g, '-')
          .replace(/[^֐-׿a-zA-Z0-9-]/g, '')
          .slice(0, 40) || 'nechs';
  return `${readable}-${hash}`;
}

export interface SavedReportRow {
  slug: string;
  headline: string | null;
  gush: string | null;
  helka: string | null;
  tat_helka: string | null;
  city: string | null;
  street: string | null;
  house_num: string | null;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  asset_type: string;
  best_tier: string;
  generations: number;
  views: number;
  first_seen_at: string;
  updated_at: string;
}

/**
 * שמירת דוח שהופק. מחזירה את ה-slug כדי שהדוח יוכל להציג את הקישור הקבוע
 * מיד, גם בהפקה הראשונה.
 */
export async function saveReport(
  report: PropertyReport,
  input: {
    tatHelka?: string | null;
    entrance?: string | null;
    floor?: string | null;
    apartment?: string | null;
  } = {},
): Promise<string | null> {
  const propertyKey = propertyKeyOf(report, input);
  const slug = slugOf(report, propertyKey);
  const db = store();
  if (!db) return slug; // בלי מפתח שירות אין אחסון — אבל הקישור עדיין דטרמיניסטי

  try {
    const t = report.title;
    const { data: existing } = await db
      .from('saved_reports')
      .select('id,best_tier,generations')
      .eq('property_key', propertyKey)
      .maybeSingle();

    const bestTier: ReportTier =
      existing && TIER_ORDER[existing.best_tier as ReportTier] > TIER_ORDER[report.tier]
        ? (existing.best_tier as ReportTier)
        : report.tier;

    const row = {
      slug,
      property_key: propertyKey,
      gush: t.gush ?? null,
      helka: t.helka ?? null,
      tat_helka: input.tatHelka ?? null,
      city: t.city ?? null,
      street: t.streetOfficial ?? t.streetDisplay ?? null,
      house_num: t.houseNumber ?? null,
      entrance: input.entrance ?? null,
      floor: input.floor ?? null,
      apartment: input.apartment ?? null,
      asset_type: report.assetType,
      best_tier: bestTier,
      headline: t.headline ?? null,
      lat: report.location.lat ?? null,
      lng: report.location.lng ?? null,
      itm_x: report.location.itmX ?? null,
      itm_y: report.location.itmY ?? null,
      // ⚠️ נשמר רק כשהוא לפחות טוב כמו מה שכבר שמור. אחרת הפקה חינמית אחת
      // הייתה דורסת דוח VIP שהופק קודם, והקישור הקבוע היה מציג פחות ממה שכבר
      // שולם עליו.
      ...(bestTier === report.tier ? { report: report as unknown as Record<string, unknown> } : {}),
      generations: (existing?.generations ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };

    const { data: saved } = await db
      .from('saved_reports')
      .upsert(row, { onConflict: 'property_key' })
      .select('id')
      .maybeSingle();

    if (saved?.id) {
      // כל הפקה נשמרת כגרסה — זה מה שהופך "ניתן לבדיקה חוזרת בכל עת" לאמיתי.
      await db.from('saved_report_versions').insert({
        saved_report_id: saved.id,
        tier: report.tier,
        asset_type: report.assetType,
        report: report as unknown as Record<string, unknown>,
      });
    }
  } catch {
    /* אחסון הוא best-effort */
  }
  return slug;
}

/** קריאת דוח שמור לפי הקישור הקבוע. מגדילה מונה צפיות. */
export async function readSaved(
  slug: string,
): Promise<{ report: PropertyReport; updatedAt: string; generations: number } | null> {
  const db = store();
  if (!db) return null;
  const { data } = await db
    .from('saved_reports')
    .select('id,report,updated_at,generations,views')
    .eq('slug', slug)
    .maybeSingle();
  if (!data?.report) return null;
  // מונה הצפיות מתעדכן best-effort ואינו חוסם את ההגשה.
  try {
    await db
      .from('saved_reports')
      .update({ views: (Number(data.views) || 0) + 1 })
      .eq('id', data.id);
  } catch {
    /* מונה בלבד */
  }
  return {
    report: data.report as PropertyReport,
    updatedAt: String(data.updated_at),
    generations: Number(data.generations) || 1,
  };
}

/**
 * §8 · המלצה 5 ("מטמון לדוח") · מפתח-זהות מהיר לחיפוש גוש/חלקה בלבד, בלי
 * להריץ את כל מנוע ההפקה (גיאוקוד+קדסטר) רק כדי לדעת אם כבר יש דוח שמור.
 *
 * ⚠️ תואם בדיוק את הענף `p:` שבונה `propertyKeyOf` — ומתאים **רק** לצורה
 * `גוש X חלקה Y` שבה `ReportRequestForm.composeQuery()` שולח `q` כשמולאו שני
 * השדות (ואינה שולחת שום טקסט נוסף באותו מקרה, ראה שם). כל צורה אחרת —
 * כתובת חופשית, שם רחוב — לא ניתנת לזיהוי בלי גיאוקוד, ומחזירה `null` כאן
 * כדי שהנתיב הרגיל (בניית דוח מלאה) ירוץ בלי שינוי, כמו היום.
 *
 * ⚠️ קומה/חדרים מפעילים `matchedUnit` ב-`buildReport` (זיהוי דירה ספציפית
 * בתוך הבניין לפי התאמת עסקה, ולא רק זהות הבניין כולו) — בניגוד לתת-
 * חלקה/כניסה/דירה, שהם חלק מ-`unitPart` וממילא מבדילים בין דירות. אם
 * קומה ו/או חדרים סופקו בלי תת-חלקה/כניסה/דירה, מחזירים `null` כדי שהנתיב
 * הרגיל ירוץ — אחרת שתי פניות לאותו גוש/חלקה בדירות שונות (אחת בקומה 2,
 * שנייה בקומה 5, בלי תת-חלקה) היו מקבלות זו את הדוח הספציפי-לדירה של זו,
 * בניגוד לעיקרון "אין נתוני דמה".
 */
export function fastParcelKey(
  q: string,
  assetTypeRaw: string | null,
  input: {
    tatHelka?: string | null;
    entrance?: string | null;
    apartment?: string | null;
    floor?: string | null;
    rooms?: string | null;
  },
): string | null {
  if (input.floor || input.rooms) return null;
  const m = /^גוש\s+(\S+)\s+חלקה\s+(\S+)$/.exec(q.trim());
  if (!m) return null;
  const assetType = isAssetType(assetTypeRaw) ? assetTypeRaw : 'residential';
  const unitPart = [
    input.tatHelka ? `t${tidy(input.tatHelka)}` : '',
    input.entrance ? `e${tidy(input.entrance)}` : '',
    input.apartment ? `a${tidy(input.apartment)}` : '',
  ]
    .filter(Boolean)
    .join('-');
  return [`p:${tidy(m[1])}/${tidy(m[2])}`, unitPart, assetType].filter(Boolean).join('|');
}

/**
 * §8 · המלצה 5 · דוח שמור **טרי** לאותו מפתח-זהות **וברמה זהה בדיוק**.
 *
 * ⚠️ שתי שמירות מכוונות:
 * 1. התאמת רמה מדויקת בלבד — `report` נשמר רק כשהיא ה-`best_tier`, כך
 *    שדוח VIP שמור לעולם לא יוגש בתשובה לבקשת רמה חינמית/פרימיום: זו הייתה
 *    חושפת תוכן ששולם עליו למי שלא ביקש/שילם עליו.
 * 2. חלון-טריות — לא "קבוע" כמו הקישור ב-`readSaved` (§8 הקישור הקבוע
 *    מתעדכן רק בלחיצה מפורשת), אלא חיסכון על הפקה **חוזרת תוך זמן קצר**
 *    לאותו נכס/רמה (מסך → PDF → מצגת, ששלושתם מבקשים בדיוק אותו q/tier
 *    תוך שניות-דקות).
 */
export async function readFreshByParcelKey(
  propertyKey: string,
  tier: ReportTier,
  maxAgeMs: number,
): Promise<{ report: PropertyReport; slug: string; updatedAt: string } | null> {
  const db = store();
  if (!db) return null;
  const { data } = await db
    .from('saved_reports')
    .select('slug,report,best_tier,updated_at')
    .eq('property_key', propertyKey)
    .maybeSingle();
  if (!data?.report || data.best_tier !== tier) return null;
  const ageMs = Date.now() - new Date(data.updated_at).getTime();
  if (!(ageMs >= 0) || ageMs > maxAgeMs) return null;
  return { report: data.report as PropertyReport, slug: data.slug, updatedAt: String(data.updated_at) };
}

/** רשימת כל הדוחות השמורים — למרכז השליטה. */
export async function listSaved(limit = 200): Promise<SavedReportRow[]> {
  const db = store();
  if (!db) return [];
  const { data } = await db
    .from('saved_reports')
    .select(
      'slug,headline,gush,helka,tat_helka,city,street,house_num,entrance,floor,apartment,asset_type,best_tier,generations,views,first_seen_at,updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as SavedReportRow[];
}
