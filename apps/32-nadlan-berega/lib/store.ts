// ==== שכבת אחסון (Supabase) — אופציונלית ====
// אם SUPABASE_URL + SUPABASE_SERVICE_KEY מוגדרים — המערכת מאחסנת/מקַשה נכסים ועסקאות
// (היסטוריה רב-שנתית) בסכימת nadlan. אם לא מוגדרים — המערכת פועלת רגיל (חי בלבד).
// הכתיבה היא best-effort: כישלון אחסון לעולם אינו שובר את התגובה למשתמש.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PropertyProfile } from './types';
import { env } from './env';

// הטיפוס נושא את שם הסכימה, אחרת TS מניח 'public' ומתלונן.
type NadlanClient = SupabaseClient<any, 'nadlan', any>;

let client: NadlanClient | null = null;

export function getStore(): NadlanClient | null {
  if (client) return client;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_KEY');
  if (!url || !key) return null;
  client = createClient(url, key, {
    db: { schema: 'nadlan' },
    auth: { persistSession: false },
  });
  return client;
}

export async function cacheProfile(profile: PropertyProfile): Promise<void> {
  const db = getStore();
  if (!db) return;
  try {
    const k = profile.key;
    const { data: prop } = await db
      .from('properties')
      .upsert(
        {
          gush: k.gush ?? null,
          helka: k.helka ?? null,
          tat_helka: k.tatHelka ?? null,
          address: k.address ?? null,
          city: k.city ?? null,
          itm_x: k.itmX ?? null,
          itm_y: k.itmY ?? null,
          opportunity_score: profile.opportunityScore ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'gush,helka,tat_helka' },
      )
      .select('id')
      .maybeSingle();

    const propertyId = prop?.id;
    if (!propertyId || profile.transactions.length === 0) return;

    // אחסון עסקאות (היסטוריה) — best-effort.
    const rows = profile.transactions.slice(0, 500).map((t) => ({
      property_id: propertyId,
      gush: k.gush ?? null,
      helka: k.helka ?? null,
      deal_date: t.dealDate ? t.dealDate.slice(0, 10) : null,
      price: t.price,
      area_sqm: t.areaSqm,
      rooms: t.rooms,
      floor: t.floor,
      build_year: t.buildYear,
      deal_type: t.dealType,
      address: t.address ?? null,
      source: 'carmen',
      raw: t.raw ?? null,
    }));
    await db.from('transactions').insert(rows);
  } catch {
    // מתעלמים — האחסון אופציונלי.
  }
}

// לקוח ציבורי (anon) — לטופס בקשת מסמך. RLS מאפשר insert בלבד.
let publicClient: NadlanClient | null = null;
function getPublicStore(): NadlanClient | null {
  if (publicClient) return publicClient;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  publicClient = createClient(url, key, {
    db: { schema: 'nadlan' },
    auth: { persistSession: false },
  });
  return publicClient;
}

/**
 * ספירת נקודות עניין (בתי ספר וכד') ברדיוס אמיתי סביב נקודת הנכס.
 * מסננים קודם bbox ב-Supabase (מהיר, אינדקס), ואז מסננים למעגל לפי מרחק
 * אוקלידי ב-ITM (רשת מטרית — המרחק במטרים ישירות). מחזיר null אם המטמון לא זמין.
 */
export async function countPoiWithinRadius(
  category: string,
  itmX: number,
  itmY: number,
  radiusM = 1000,
): Promise<number | null> {
  const db = getPublicStore();
  if (!db) return null;
  const { data, error } = await db
    .from('poi')
    .select('itm_x,itm_y')
    .eq('category', category)
    .gte('itm_x', itmX - radiusM)
    .lte('itm_x', itmX + radiusM)
    .gte('itm_y', itmY - radiusM)
    .lte('itm_y', itmY + radiusM)
    .limit(10000);
  if (error || !data) return null;
  const r2 = radiusM * radiusM;
  return data.filter((p: any) => (p.itm_x - itmX) ** 2 + (p.itm_y - itmY) ** 2 <= r2).length;
}

/**
 * נקודות העניין הקרובות ביותר מהמטמון, עם שם ומרחק — **בלי לשלם על כלום**.
 *
 * זה המקור של סעיף "סביבה ומוסדות" בדוח החינמי. הנתונים הם המרשמים הפתוחים
 * שכבר נטענו לטבלת `poi` (מוסדות חינוך של משרד החינוך, תחנות התחבורה הארציות,
 * מוסדות ההשכלה של מפ"י ומקוואות) — ולכן שאילתה כאן היא קריאה למסד שלנו,
 * לא רכישה מספק.
 *
 * המרחק מחושב ב-ITM, שהיא רשת מטרית: הפרש הקואורדינטות **הוא** המרחק במטרים.
 * זהו מרחק אווירי ולא מרחק הליכה — מי שקורא את התוצאה חייב לומר זאת ללקוח,
 * כי זמני הליכה אמיתיים דורשים מקור בתשלום שאינו זמין ברמה הזו.
 */
export async function nearestPoiFromCache(
  category: string,
  itmX: number,
  itmY: number,
  opts: { radiusM?: number; limit?: number } = {},
): Promise<{ name: string | null; meters: number; lat: number | null; lng: number | null; meta: Record<string, unknown> | null }[]> {
  const radiusM = opts.radiusM ?? 1500;
  const limit = opts.limit ?? 12;
  const db = getPublicStore();
  if (!db) return [];
  const { data, error } = await db
    .from('poi')
    .select('name,itm_x,itm_y,lat,lng,meta')
    .eq('category', category)
    .gte('itm_x', itmX - radiusM)
    .lte('itm_x', itmX + radiusM)
    .gte('itm_y', itmY - radiusM)
    .lte('itm_y', itmY + radiusM)
    .limit(5000);
  if (error || !data) return [];
  return data
    .map((p: any) => ({
      name: p.name ?? null,
      meters: Math.round(Math.hypot(Number(p.itm_x) - itmX, Number(p.itm_y) - itmY)),
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      meta: p.meta ?? null,
    }))
    .filter((p) => p.meters <= radiusM)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, limit);
}

export interface CachedPoi {
  extId: string;
  name: string | null;
  itmX: number;
  itmY: number;
  lat: number | null;
  lng: number | null;
  meta: Record<string, unknown> | null;
}

/**
 * קריאת נקודות מהמטמון לפי קטגוריה וקידומת מזהה.
 *
 * משמש למיקומי קלפיות: הגיאוקוד שלהן חינמי אבל איטי (155 קריאות ליישוב כמו
 * רחובות), והמיקומים אינם משתנים בין דוחות. בלי מטמון כל דוח היה משלם את
 * הזמן הזה מחדש.
 */
export async function readPoiCache(category: string, extIdPrefix: string): Promise<CachedPoi[]> {
  const db = getPublicStore();
  if (!db) return [];
  const { data, error } = await db
    .from('poi')
    .select('ext_id,name,itm_x,itm_y,lat,lng,meta')
    .eq('category', category)
    .like('ext_id', `${extIdPrefix}%`)
    .limit(5000);
  if (error || !data) return [];
  return data.map((r: any) => ({
    extId: String(r.ext_id),
    name: r.name ?? null,
    itmX: Number(r.itm_x),
    itmY: Number(r.itm_y),
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    meta: r.meta ?? null,
  }));
}

/** כתיבה למטמון — best-effort. דורש service key; בלעדיו פשוט לא נשמר. */
export async function writePoiCache(
  category: string,
  rows: { extId: string; name?: string | null; itmX: number; itmY: number; lat?: number | null; lng?: number | null; meta?: Record<string, unknown> }[],
): Promise<void> {
  const db = getStore();
  if (!db || !rows.length) return;
  try {
    await db.from('poi').upsert(
      rows.map((r) => ({
        category,
        ext_id: r.extId,
        name: r.name ?? null,
        itm_x: r.itmX,
        itm_y: r.itmY,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        meta: r.meta ?? {},
      })),
      { onConflict: 'category,ext_id' },
    );
  } catch {
    /* המטמון אופציונלי */
  }
}

export interface DocRequest {
  doc_type: string;
  gush?: string | null;
  helka?: string | null;
  tat_helka?: string | null;
  address?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export async function submitDocumentRequest(payload: DocRequest): Promise<void> {
  const db = getPublicStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_ANON_KEY).');
  const { error } = await db.from('document_requests').insert(payload);
  if (error) throw new Error(error.message);
}

export interface AreaAlert {
  email: string;
  address?: string | null;
  gush?: string | null;
  helka?: string | null;
  city?: string | null;
}

export async function submitAreaAlert(payload: AreaAlert): Promise<void> {
  const db = getPublicStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_ANON_KEY).');
  const { error } = await db.from('area_alerts').insert(payload);
  if (error) throw new Error(error.message);
}

/**
 * מטמון שכ"ד היסטורי לפי אזור/חודש — `nadlan.rental_data`.
 *
 * best-effort בלבד ולא מעכב את הדוח בכישלון — כמו `logExport`.
 * נכתבת רק כשיש נתון אמיתי (median_rent/rent_per_sqm), לא שורת null.
 * upsert לפי (area_code, month) — הפקה שנייה באותו אזור ובאותו חודש מרעננת
 * את השורה במקום להוסיף כפילות (אינדקס ייחודי `rental_data_area_month_key`).
 */
export async function cacheRentalData(row: {
  areaCode: string;
  month: string;
  medianRent: number | null;
  rentPerSqm: number | null;
  source: string;
}): Promise<void> {
  const db = getStore();
  if (!db) return;
  try {
    await db.from('rental_data').upsert(
      {
        area_code: row.areaCode,
        month: row.month,
        median_rent: row.medianRent,
        rent_per_sqm: row.rentPerSqm,
        source: row.source,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'area_code,month' },
    );
  } catch {
    /* אופציונלי */
  }
}

export interface CachedRental {
  month: string;
  medianRent: number | null;
  rentPerSqm: number | null;
  source: string | null;
}

/**
 * הצד הקורא של `cacheRentalData` — שכ"ד האזורי האחרון שנמדד בפועל.
 *
 * עד עכשיו המטמון היה write-only: אף מסלול לא קרא ממנו, וכשמכסת מושך
 * המודעות (Apify) נוצלה — שכבת השכירות נשארה ריקה גם אם נמדד שכ"ד אמיתי
 * באותו אזור שבוע קודם. מגבילים ל-12 החודשים האחרונים: נתון ישן מזה אינו
 * "שכ"ד באזור היום" והצגתו הייתה מפרה את כלל אין-נתוני-דמה.
 * קריאה דרך ה-anon (RLS `public_read_rental` פתוחה לקריאה) עם נפילה
 * ל-service — כך זה עובד גם כשרק אחד המפתחות מוגדר.
 */
export async function latestCachedRental(areaCode: string): Promise<CachedRental | null> {
  const db = getPublicStore() ?? getStore();
  if (!db) return null;
  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    const { data, error } = await db
      .from('rental_data')
      .select('month,median_rent,rent_per_sqm,source')
      .eq('area_code', areaCode)
      .not('rent_per_sqm', 'is', null)
      .gte('month', cutoff.toISOString().slice(0, 7))
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data || !data.month) return null;
    return {
      month: data.month,
      medianRent: data.median_rent != null ? Number(data.median_rent) : null,
      rentPerSqm: data.rent_per_sqm != null ? Number(data.rent_per_sqm) : null,
      source: data.source ?? null,
    };
  } catch {
    return null;
  }
}

export async function logExport(
  propertyKey: string,
  reportType: string,
  selectedLayers: string[],
): Promise<void> {
  const db = getStore();
  if (!db) return;
  try {
    await db.from('report_exports').insert({
      report_type: reportType,
      selected_layers: selectedLayers,
    });
  } catch {
    /* אופציונלי */
  }
}
