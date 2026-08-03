// ==== טעינת נקודות עניין (POI) מ-data.gov.il למטמון nadlan.poi ====
// המאגרים מוגדרים ב-ENV (DATAGOV_SCHOOLS_RESOURCE / DATAGOV_TRANSPORT_RESOURCE)
// כדי שאפשר יהיה להחליף מאגר בלי שינוי קוד. הטעינה היא idempotent: המפתח הוא
// (category, ext_id), ולכן הרצה חוזרת מעדכנת ולא משכפלת.
//
// עקרון ברזל של הפרויקט: אין נתוני דמה. רשומה ללא קואורדינטת ITM תקפה נפסלת.

import { createClient } from '@supabase/supabase-js';
import { datastoreSearch } from './datagov';
import { itmToWgs84, isPlausibleItm } from './itm';

export interface IngestResult {
  category: string;
  resourceId: string | null;
  fetched: number;
  valid: number;
  upserted: number;
  skipped: number;
  error?: string;
}

/** שמות שדות אפשריים לקואורדינטות ITM במאגרי CKAN השונים. */
const X_FIELDS = ['X', 'E_ORD', 'x', 'itm_x', 'ITM_X', 'coordX', 'MERKAZ_X'];
const Y_FIELDS = ['Y', 'N_ORD', 'y', 'itm_y', 'ITM_Y', 'coordY', 'MERKAZ_Y'];
const ID_FIELDS = ['UNIQ_ID', 'semel_mosad', 'סמל_מוסד', 'code', '_id'];
const NAME_FIELDS = ['NAME', 'shem_mosad', 'שם_מוסד', 'name', 'STOP_NAME', 'תיאור'];

function pick(rec: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    const v = rec[f];
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function num(rec: Record<string, unknown>, fields: string[]): number | null {
  const raw = pick(rec, fields);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function serviceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    db: { schema: 'nadlan' },
    auth: { persistSession: false },
  });
}

/**
 * טוען מאגר CKAN שלם (בדפים) ומכניס למטמון nadlan.poi תחת קטגוריה נתונה.
 * מחזיר ספירות אמיתיות — כולל כמה רשומות נפסלו בגלל קואורדינטה לא תקפה.
 */
export async function ingestPoi(category: string, resourceId: string | null): Promise<IngestResult> {
  const out: IngestResult = { category, resourceId, fetched: 0, valid: 0, upserted: 0, skipped: 0 };
  if (!resourceId) return { ...out, error: 'resource_id לא הוגדר ב-ENV' };

  const db = serviceClient();
  if (!db) return { ...out, error: 'SUPABASE_SERVICE_KEY חסר — אין הרשאת כתיבה למטמון' };

  const PAGE = 1000;
  const rows: {
    category: string;
    ext_id: string;
    name: string | null;
    itm_x: number;
    itm_y: number;
    lat: number | null;
    lng: number | null;
    meta: Record<string, unknown>;
  }[] = [];

  let offset = 0;
  // CKAN מחזיר total בכל עמוד — מפסיקים כשלא חוזרות רשומות נוספות.
  for (;;) {
    const page = await datastoreSearch(resourceId, { limit: PAGE, offset });
    if (page.records.length === 0) break;
    out.fetched += page.records.length;

    for (const rec of page.records as Record<string, unknown>[]) {
      const x = num(rec, X_FIELDS);
      const y = num(rec, Y_FIELDS);
      if (x === null || y === null || !isPlausibleItm(x, y)) {
        out.skipped++;
        continue;
      }
      const extId = pick(rec, ID_FIELDS);
      if (!extId) {
        out.skipped++;
        continue;
      }
      const { lat, lng } = itmToWgs84(x, y);
      rows.push({
        category,
        ext_id: extId,
        name: pick(rec, NAME_FIELDS),
        itm_x: x,
        itm_y: y,
        lat,
        lng,
        meta: { resource_id: resourceId, settlement: pick(rec, ['SETL_NAME', 'שם_ישוב', 'city']) },
      });
      out.valid++;
    }

    if (page.records.length < PAGE) break;
    offset += PAGE;
    if (offset > 200_000) break; // בלם בטיחות
  }

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from('poi').upsert(chunk, { onConflict: 'category,ext_id' });
    if (error) return { ...out, error: error.message };
    out.upserted += chunk.length;
  }

  return out;
}

/**
 * מיפוי קטגוריה → משתנה הסביבה שמחזיק את ה-resource_id שלה.
 * `education_gis` = שכבת מוסדות החינוך וההשכלה של המרכז למיפוי ישראל
 * (DATAGOV_SCHOOLS_RESOURCE) — נשמרת בנפרד מקטגוריית `school` של משרד החינוך
 * כדי שלא תיווצר ספירה כפולה של אותו מוסד בשני מאגרים.
 */
export const POI_SOURCES: Record<string, string | undefined> = {
  education_gis: 'DATAGOV_SCHOOLS_RESOURCE',
  transport: 'DATAGOV_TRANSPORT_RESOURCE',
};

export async function ingestConfiguredPoi(categories: string[] = ['education_gis']): Promise<IngestResult[]> {
  const out: IngestResult[] = [];
  for (const category of categories) {
    const envName = POI_SOURCES[category];
    if (!envName) {
      out.push({ category, resourceId: null, fetched: 0, valid: 0, upserted: 0, skipped: 0, error: 'קטגוריה לא מוכרת' });
      continue;
    }
    out.push(await ingestPoi(category, process.env[envName] ?? null));
  }
  return out;
}
