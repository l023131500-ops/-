// ==== בקשות דוח ומסמכי טאבו — שכבת האחסון בצד השרת ====
//
// מודל האספקה של המפרט: הלקוח מזין כתובת ומייל → הבקשה נשמרת → מופיעה בניהול
// → מעובדת → נשלחת למייל. הטבלה מכילה כתובות מייל, ולכן:
//   · ההכנסה נעשית עם anon key ומותרת ב-RLS (insert בלבד, בלי קריאה).
//   · כל קריאה, עדכון ושליחה נעשים כאן, בצד השרת, עם service key.
// אין שום מסלול שבו anon key קורא בקשות של לקוחות.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

type NadlanClient = SupabaseClient<any, 'nadlan', any>;

let service: NadlanClient | null = null;

/** לקוח service — לקריאה, לעדכון ולאחסון. מחזיר null כשאין מפתח. */
export function serviceStore(): NadlanClient | null {
  if (service) return service;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_KEY');
  if (!url || !key) return null;
  service = createClient(url, key, {
    db: { schema: 'nadlan' },
    auth: { persistSession: false },
  });
  return service;
}

let anon: NadlanClient | null = null;
function anonStore(): NadlanClient | null {
  if (anon) return anon;
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  anon = createClient(url, key, {
    db: { schema: 'nadlan' },
    auth: { persistSession: false },
  });
  return anon;
}

export type RequestStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface ReportRequestInput {
  query: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  tier?: 'basic' | 'premium' | 'vip';
  entrance?: string | null;
  floor?: string | null;
  rooms?: string | null;
  notes?: string | null;
}

export interface ReportRequestRow {
  id: number;
  query: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  tier: 'basic' | 'premium' | 'vip';
  entrance: string | null;
  floor: string | null;
  rooms: string | null;
  notes: string | null;
  gush: string | null;
  helka: string | null;
  city: string | null;
  status: RequestStatus;
  requested_at: string;
  processed_at: string | null;
  sent_at: string | null;
  error: string | null;
  email_provider_id: string | null;
  cost_usd: number | null;
}

const ROW_FIELDS =
  'id,query,email,full_name,phone,tier,entrance,floor,rooms,notes,gush,helka,city,status,requested_at,processed_at,sent_at,error,email_provider_id,cost_usd';

/** בדיקת מייל בסיסית. לא רגולריות מהספרות — רק מה שנדרש כדי לא לשלוח לכלום. */
export function looksLikeEmail(v: string): boolean {
  const s = (v ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254;
}

/**
 * יצירת בקשה — המסלול הציבורי, עם anon key.
 * ⚠️ אין `.select()` בכוונה: ל-anon אין הרשאת קריאה על הטבלה, וצירוף select
 * היה מפיל את ההכנסה על הרשאות במקום להצליח.
 */
export async function createReportRequest(input: ReportRequestInput): Promise<void> {
  const db = anonStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_ANON_KEY).');
  const { error } = await db.from('report_requests').insert({
    query: input.query,
    email: input.email,
    full_name: input.fullName ?? null,
    phone: input.phone ?? null,
    tier: input.tier ?? 'premium',
    entrance: input.entrance ?? null,
    floor: input.floor ?? null,
    rooms: input.rooms ?? null,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listReportRequests(
  opts: { status?: RequestStatus; limit?: number } = {},
): Promise<ReportRequestRow[]> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת קריאה לבקשות.');
  let q = db
    .from('report_requests')
    .select(ROW_FIELDS)
    .order('requested_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRequestRow[];
}

export async function getReportRequest(id: number): Promise<ReportRequestRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db.from('report_requests').select(ROW_FIELDS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ReportRequestRow) ?? null;
}

/** ספירת בקשות ממתינות — ההתראה בניהול. */
export async function pendingCount(): Promise<number | null> {
  const db = serviceStore();
  if (!db) return null;
  const { count, error } = await db
    .from('report_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return null;
  return count ?? 0;
}

/**
 * נעילת בקשה לעיבוד.
 *
 * ⚠️ העדכון מותנה ב-`status='pending'`. לחיצה כפולה על "הפק ושלח" הייתה מפיקה
 * את הדוח פעמיים ושולחת שני מיילים ללקוח; התניה על הסטטוס הופכת את הלחיצה
 * השנייה לכשל שקט ולא לשליחה כפולה.
 */
export async function claimForProcessing(id: number): Promise<ReportRequestRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db
    .from('report_requests')
    .update({ status: 'processing', error: null })
    .eq('id', id)
    .eq('status', 'pending')
    .select(ROW_FIELDS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ReportRequestRow) ?? null;
}

export async function markSent(
  id: number,
  opts: { providerId: string | null; costUsd: number | null; snapshot: unknown },
): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  await db
    .from('report_requests')
    .update({
      status: 'sent',
      processed_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      email_provider_id: opts.providerId,
      cost_usd: opts.costUsd,
      report_snapshot: opts.snapshot ?? null,
      error: null,
    })
    .eq('id', id);
}

export async function markFailed(id: number, message: string): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  await db
    .from('report_requests')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      error: message.slice(0, 2000),
    })
    .eq('id', id);
}

/** החזרת בקשה שנכשלה למצב ממתין, כדי לנסות שוב. */
export async function resetToPending(id: number): Promise<void> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { error } = await db
    .from('report_requests')
    .update({ status: 'pending', error: null })
    .eq('id', id)
    .in('status', ['failed', 'processing']);
  if (error) throw new Error(error.message);
}

// ---------- מסמכי טאבו ----------

export type TabuScope = 'apartment' | 'entrance' | 'building';
export type TabuAnalysisStatus = 'none' | 'running' | 'done' | 'failed';

export interface TabuDocRow {
  id: number;
  request_id: number | null;
  gush: string | null;
  helka: string | null;
  tat_helka: string | null;
  address: string | null;
  scope: TabuScope;
  entrance: string | null;
  apartment: string | null;
  doc_type: string | null;
  file_name: string | null;
  file_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  analysis_status: TabuAnalysisStatus;
  analysis: TabuAnalysis | null;
  analysis_error: string | null;
  analyzed_at: string | null;
}

/** מה שמחלצים מנסח טאבו. כל שדה יכול להיות ריק — נסח אינו טופס אחיד. */
export interface TabuAnalysis {
  owners: { name: string; share: string | null; note: string | null }[];
  mortgages: { holder: string; amount: string | null; note: string | null }[];
  cautionNotes: { kind: string; inFavourOf: string | null; note: string | null }[];
  leases: { holder: string; until: string | null; note: string | null }[];
  otherEncumbrances: string[];
  parcelArea: string | null;
  subParcelArea: string | null;
  sharedAreas: string | null;
  extractDate: string | null;
  identifiedGush: string | null;
  identifiedHelka: string | null;
  identifiedTatHelka: string | null;
  /** מה שהמנתח לא הצליח לקרוא — נאמר במפורש ולא מושלם בניחוש. */
  unreadable: string[];
  summary: string;
}

const TABU_FIELDS =
  'id,request_id,gush,helka,tat_helka,address,scope,entrance,apartment,doc_type,file_name,file_path,mime_type,size_bytes,uploaded_at,analysis_status,analysis,analysis_error,analyzed_at';

export const TABU_BUCKET = 'tabu';

export async function saveTabuDocument(row: {
  requestId?: number | null;
  gush?: string | null;
  helka?: string | null;
  tatHelka?: string | null;
  address?: string | null;
  scope: TabuScope;
  entrance?: string | null;
  apartment?: string | null;
  docType?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy?: string | null;
}): Promise<TabuDocRow> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת כתיבה למסמכי טאבו.');
  const { data, error } = await db
    .from('tabu_documents')
    .insert({
      request_id: row.requestId ?? null,
      gush: row.gush ?? null,
      helka: row.helka ?? null,
      tat_helka: row.tatHelka ?? null,
      address: row.address ?? null,
      scope: row.scope,
      entrance: row.entrance ?? null,
      apartment: row.apartment ?? null,
      doc_type: row.docType ?? 'regular',
      file_name: row.fileName,
      file_path: row.filePath,
      mime_type: row.mimeType,
      size_bytes: row.sizeBytes,
      uploaded_by: row.uploadedBy ?? null,
    })
    .select(TABU_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  return data as TabuDocRow;
}

export async function listTabuDocuments(
  opts: { gush?: string | null; helka?: string | null; requestId?: number | null; limit?: number } = {},
): Promise<TabuDocRow[]> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  let q = db
    .from('tabu_documents')
    .select(TABU_FIELDS)
    .order('uploaded_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.requestId != null) q = q.eq('request_id', opts.requestId);
  if (opts.gush) q = q.eq('gush', opts.gush);
  if (opts.helka) q = q.eq('helka', opts.helka);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TabuDocRow[];
}

export async function getTabuDocument(id: number): Promise<TabuDocRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db.from('tabu_documents').select(TABU_FIELDS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TabuDocRow) ?? null;
}

/** נעילת מסמך לניתוח — אותה הגנה מפני לחיצה כפולה כמו בבקשות. */
export async function claimTabuAnalysis(id: number): Promise<TabuDocRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db
    .from('tabu_documents')
    .update({ analysis_status: 'running', analysis_error: null })
    .eq('id', id)
    .in('analysis_status', ['none', 'failed', 'done'])
    .select(TABU_FIELDS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TabuDocRow) ?? null;
}

export async function saveTabuAnalysis(
  id: number,
  analysis: TabuAnalysis,
  rawText: string | null,
): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  await db
    .from('tabu_documents')
    .update({
      analysis_status: 'done',
      analysis,
      raw_text: rawText,
      analyzed_at: new Date().toISOString(),
      analysis_error: null,
    })
    .eq('id', id);
}

export async function failTabuAnalysis(id: number, message: string): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  await db
    .from('tabu_documents')
    .update({ analysis_status: 'failed', analysis_error: message.slice(0, 2000) })
    .eq('id', id);
}

/**
 * הנסחים ששייכים לנכס מסוים, בסדר הרלוונטיות לדוח.
 *
 * ⚠️ הסדר הזה הוא הדרישה במפורש: נסח של הדירה עצמה קודם לנסח כניסה, וזה קודם
 * לנסח של הבניין כולו. בנסח מרוכז יש את כל תתי-החלקות, ובלי שיוך היו מוצגים
 * בעלים ושעבודים של דירה אחרת.
 */
export async function tabuForProperty(opts: {
  gush?: string | null;
  helka?: string | null;
  tatHelka?: string | null;
  entrance?: string | null;
}): Promise<TabuDocRow[]> {
  if (!opts.gush || !opts.helka) return [];
  const db = serviceStore();
  if (!db) return [];
  const { data, error } = await db
    .from('tabu_documents')
    .select(TABU_FIELDS)
    .eq('gush', opts.gush)
    .eq('helka', opts.helka)
    .eq('analysis_status', 'done')
    .order('uploaded_at', { ascending: false });
  if (error || !data) return [];

  const rows = data as TabuDocRow[];
  const rank = (d: TabuDocRow): number => {
    if (d.scope === 'apartment') {
      if (opts.tatHelka && d.tat_helka === opts.tatHelka) return 0;
      if (opts.tatHelka && d.tat_helka && d.tat_helka !== opts.tatHelka) return 90; // דירה אחרת
      return 10;
    }
    if (d.scope === 'entrance') {
      if (opts.entrance && d.entrance === opts.entrance) return 20;
      if (opts.entrance && d.entrance && d.entrance !== opts.entrance) return 91; // כניסה אחרת
      return 30;
    }
    return 40; // בניין שלם — תמיד רלוונטי
  };

  return rows
    .map((d) => ({ d, r: rank(d) }))
    .filter((x) => x.r < 90)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.d);
}
