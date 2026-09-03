// ==== שכבת אחסון (Supabase) — אופציונלית ====
// אם SUPABASE_URL + SUPABASE_SERVICE_KEY מוגדרים — המערכת מאחסנת/מקַשה נכסים ועסקאות
// (היסטוריה רב-שנתית) בסכימת nadlan. אם לא מוגדרים — המערכת פועלת רגיל (חי בלבד).
// הכתיבה היא best-effort: כישלון אחסון לעולם אינו שובר את התגובה למשתמש.

import { createHash } from 'node:crypto';
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

export interface DocumentRequestRow {
  id: number;
  doc_type: string;
  gush: string | null;
  helka: string | null;
  tat_helka: string | null;
  address: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const DOCUMENT_REQUEST_FIELDS =
  'id,doc_type,gush,helka,tat_helka,address,full_name,email,phone,notes,status,created_at';

/**
 * `RequestForm` (דף הבית + `/request`) שולחת לכאן דרך `submitDocumentRequest`
 * מאז ומתמיד — אבל עד לתוספת הזו שום קוד לא קרא בחזרה מ-`document_requests`,
 * ולא הייתה שום מסך-ניהול. לקוח ששלח שם+טלפון/מייל לבקשת נסח/רמ"י/היתר קיבל
 * "הבקשה נשמרה ✓" בממשק, אבל הבקשה נעלמה לצמיתות מבחינת הצוות — בדיוק אותה
 * מחלקת-פער שנמצאה שוב ושוב היום (03/09) בבקשות טאבו/תיק-מידע, רק שכאן זה
 * הטופס הכללי-יותר והישן-יותר שקדם לשניהם.
 */
export async function listDocumentRequests(
  opts: { status?: string; limit?: number } = {},
): Promise<DocumentRequestRow[]> {
  const db = getStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת קריאה לבקשות מסמכים.');
  let q = db
    .from('document_requests')
    .select(DOCUMENT_REQUEST_FIELDS)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as DocumentRequestRow[];
}

export async function pendingDocumentRequestCount(): Promise<number | null> {
  const db = getStore();
  if (!db) return null;
  const { count, error } = await db
    .from('document_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) return null;
  return count ?? 0;
}

/** אין CHECK constraint על העמודה — שני הערכים האלה בלבד משמשים בפועל. */
export type DocumentRequestStatus = 'new' | 'contacted';

/** מותנה ב-`status='new'` כדי שלחיצה כפולה לא תדרוס תיוג קודם. */
export async function markDocumentRequestContacted(id: number): Promise<DocumentRequestRow | null> {
  const db = getStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db
    .from('document_requests')
    .update({ status: 'contacted' satisfies DocumentRequestStatus })
    .eq('id', id)
    .eq('status', 'new')
    .select(DOCUMENT_REQUEST_FIELDS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DocumentRequestRow) ?? null;
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

export async function logExport(
  slug: string | null,
  reportType: string,
  selectedLayers: string[],
): Promise<void> {
  const db = getStore();
  if (!db) return;
  try {
    await db.from('report_exports').insert({
      slug: slug || null,
      report_type: reportType,
      selected_layers: selectedLayers,
    });
  } catch {
    /* אופציונלי */
  }
}

/** §8 · יומן ההורדות (PDF/מצגת) לנכס נתון — חלק מ"יומן הביקורת" במרכז השליטה. */
export interface ExportLogRow {
  reportType: string;
  createdAt: string;
}

export async function listExportsBySlug(slug: string): Promise<ExportLogRow[]> {
  const db = getStore();
  if (!db) return [];
  const { data } = await db
    .from('report_exports')
    .select('report_type,created_at')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({ reportType: String(r.report_type), createdAt: String(r.created_at) }));
}

// ==== §2 · מטמון "סיור רחוב" כווידאו — build_tasks id=2 (core.projects #33) ====
//
// אין ffmpeg/node_modules בסביבת הבנייה הזו (ראה CLAUDE.md על סבבים קודמים
// שדחו את הפריט הזה שוב ושוב מהסיבה הזו) — ולכן הקידוד עצמו לא קורה כאן: הוא
// קורה בדפדפן הצופה (`canvas.captureStream()`+`MediaRecorder`, ראה
// `StreetWalkPanel.tsx`). מה שכן שייך לשרת הוא המטמון עצמו: ברגע שדפדפן אחד
// הפיק קליפ לנכס נתון, הוא מועלה לכאן ונשמר, כך שכל צופה הבא מקבל אותו ישירות
// בלי להקליט מחדש — זה בדיוק מה ש"cached per property" מבקש.
const STREET_VIDEO_BUCKET = 'nadlan-street-video';

export interface StreetVideoCacheRow {
  storagePath: string;
  mimeType: string;
  frameCount: number;
  url: string;
}

export async function getStreetVideo(slug: string): Promise<StreetVideoCacheRow | null> {
  const db = getStore();
  if (!db) return null;
  const { data } = await db
    .from('street_video_cache')
    .select('storage_path,mime_type,frame_count')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const { data: pub } = db.storage.from(STREET_VIDEO_BUCKET).getPublicUrl(data.storage_path);
  return {
    storagePath: data.storage_path,
    mimeType: data.mime_type,
    frameCount: data.frame_count,
    url: pub.publicUrl,
  };
}

/** שמירת קליפ שהופק בדפדפן. דורסת קליפ קודם לאותו נכס (רענון) ומנקה את הישן. */
export async function saveStreetVideo(
  slug: string,
  bytes: Buffer,
  mimeType: string,
  frameCount: number,
): Promise<StreetVideoCacheRow> {
  const db = getStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין אחסון לסרטון.');

  const { data: existing } = await db
    .from('street_video_cache')
    .select('storage_path')
    .eq('slug', slug)
    .maybeSingle();

  // מפתח הנתיב הוא hash של ה-slug ולא ה-slug עצמו: הוא יכול לכלול עברית
  // (נכס בלי גוש/חלקה, ראה slugOf ב-savedreports.ts) — ואין תקדים בקוד הזה
  // לתווים לא-ASCII בנתיב אחסון (tabu/nadlan-pro-media שניהם gush-helka/uuid
  // בלבד). ה-slug עצמו עדיין מפתח החיפוש ב-DB, רק לא חלק מהנתיב הפיזי.
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const pathKey = createHash('sha256').update(slug).digest('base64url').slice(0, 20);
  const path = `${pathKey}/${Date.now()}.${ext}`;

  const up = await db.storage.from(STREET_VIDEO_BUCKET).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (up.error) throw new Error(`שמירת הסרטון נכשלה: ${up.error.message}`);

  const { error } = await db
    .from('street_video_cache')
    .upsert(
      { slug, storage_path: path, mime_type: mimeType, frame_count: frameCount },
      { onConflict: 'slug' },
    );
  if (error) {
    await db.storage.from(STREET_VIDEO_BUCKET).remove([path]).catch(() => null);
    throw new Error(`שמירת רשומת המטמון נכשלה: ${error.message}`);
  }

  if (existing?.storage_path && existing.storage_path !== path) {
    await db.storage.from(STREET_VIDEO_BUCKET).remove([existing.storage_path]).catch(() => null);
  }

  const { data: pub } = db.storage.from(STREET_VIDEO_BUCKET).getPublicUrl(path);
  return { storagePath: path, mimeType, frameCount, url: pub.publicUrl };
}
