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
  /** נסח מרוכז עם כמה תתי-חלקות/קומות — פירוט קצר לכל יחידה בנפרד. ריק לנסח דירה בודדת. */
  perFloorRights: { floor: string | null; tatHelka: string | null; summary: string }[];
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

// ---------- בקשות נסח טאבו (מהלקוח, מתוך דוח VIP) ----------
//
// ⚠️ הטבלה נקראת אך ורק עם service key — בדיוק כמו tabu_documents/
// report_requests. anon יכול **להכניס** בקשה (RLS: INSERT בלבד ל-public,
// with check(true)) אבל לא לקרוא אף שורה, כולל את זו שהוא עצמו יצר: הטבלה
// מכילה שם/מייל/טלפון אמיתיים של לקוח, ואין לה מסלול ציבורי לקריאה — אותו
// עיקרון בדיוק ש-tabudoc.ts כבר כתב על tabu_documents עצמו.

export type TabuRequestGrade = 'normal' | 'urgent';
export type TabuRequestStatus = 'pending' | 'sent' | 'fulfilled' | 'failed';

export interface TabuRequestInput {
  gush: string;
  helka: string;
  tatHelka?: string | null;
  entrance?: string | null;
  apartment?: string | null;
  address?: string | null;
  city?: string | null;
  assetType?: string | null;
  grade: TabuRequestGrade;
  requesterName?: string | null;
  requesterEmail: string;
  requesterPhone?: string | null;
  notes?: string | null;
}

export interface TabuRequestRow {
  id: number;
  gush: string;
  helka: string;
  tat_helka: string | null;
  entrance: string | null;
  apartment: string | null;
  address: string | null;
  city: string | null;
  asset_type: string | null;
  grade: TabuRequestGrade;
  requester_name: string | null;
  requester_email: string;
  requester_phone: string | null;
  notes: string | null;
  status: TabuRequestStatus;
  admin_email_sent: boolean;
  admin_email_error: string | null;
  created_at: string;
  sent_at: string | null;
  sent_by: string | null;
  fulfilled_at: string | null;
  tabu_document_id: number | null;
  /** לא בטבלה — מולא ע"י `attachFulfilledTabuDocumentNames` להצגה בלבד. */
  fulfilled_document_name?: string | null;
}

const TABU_REQUEST_FIELDS =
  'id,gush,helka,tat_helka,entrance,apartment,address,city,asset_type,grade,requester_name,' +
  'requester_email,requester_phone,notes,status,admin_email_sent,admin_email_error,created_at,' +
  'sent_at,sent_by,fulfilled_at,tabu_document_id';

/**
 * יצירת בקשת נסח — המסלול הציבורי, עם anon key.
 * ⚠️ אין `.select()` בכוונה — אותה סיבה בדיוק כמו `createReportRequest`.
 */
export async function createTabuRequest(input: TabuRequestInput): Promise<void> {
  const db = anonStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_ANON_KEY).');
  if (!input.gush?.trim() || !input.helka?.trim()) {
    throw new Error('נדרשים גוש וחלקה כדי לבקש נסח טאבו.');
  }
  if (!looksLikeEmail(input.requesterEmail)) {
    throw new Error('כתובת המייל אינה תקינה.');
  }
  const { error } = await db.from('tabu_requests').insert({
    gush: input.gush.trim(),
    helka: input.helka.trim(),
    tat_helka: input.tatHelka ?? null,
    entrance: input.entrance ?? null,
    apartment: input.apartment ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    asset_type: input.assetType ?? null,
    grade: input.grade === 'urgent' ? 'urgent' : 'normal',
    requester_name: input.requesterName ?? null,
    requester_email: input.requesterEmail.trim(),
    requester_phone: input.requesterPhone ?? null,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

/**
 * הבקשה שזה עתה נוצרה — לצורך רישום תוצאת מייל-ההתראה בלבד (§admin_email_sent).
 * `createTabuRequest` לא עושה `.select()` (אין הרשאת קריאה ל-anon), ולכן הצעד
 * הזה משתמש ב-service key ומאתר לפי email+gush+helka+הזמן האחרון — לא מדויק
 * תיאורטית מול הגשה כפולה בו-זמנית, אבל אותה סובלנות "best effort" בדיוק כמו
 * שאר הבקשות בקובץ הזה, ורק לצורך תיוג-מייל ולא לצורך נכונות הבקשה עצמה.
 */
async function latestTabuRequestId(email: string, gush: string, helka: string): Promise<number | null> {
  const db = serviceStore();
  if (!db) return null;
  const { data } = await db
    .from('tabu_requests')
    .select('id')
    .eq('requester_email', email)
    .eq('gush', gush)
    .eq('helka', helka)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: number } | null)?.id ?? null;
}

export async function listTabuRequests(
  opts: { status?: TabuRequestStatus; limit?: number } = {},
): Promise<TabuRequestRow[]> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת קריאה לבקשות נסח.');
  let q = db
    .from('tabu_requests')
    .select(TABU_REQUEST_FIELDS)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TabuRequestRow[];
}

/**
 * מצרפת את שם-הקובץ של הנסח שהשלים כל בקשה `fulfilled` (`tabu_document_id`
 * כבר נכתב ע"י `fulfillMatchingTabuRequests`, אבל שום קורא לא הציג אותו —
 * לוח הבקשות הראה "הושלם" בלי לגלות איזה מסמך זה היה או מתי).
 * best-effort טהור: כשלון-שליפה משאיר `fulfilled_document_name` כ-`null`,
 * לא זורק — הלוח עצמו כבר מציג `fulfilled_at`/הסטטוס בלי תלות בזה.
 */
export async function attachFulfilledTabuDocumentNames(
  rows: TabuRequestRow[],
): Promise<TabuRequestRow[]> {
  const ids = Array.from(
    new Set(rows.map((r) => r.tabu_document_id).filter((id): id is number => id != null)),
  );
  if (ids.length === 0) return rows;
  const db = serviceStore();
  if (!db) return rows;
  const { data } = await db.from('tabu_documents').select('id,file_name').in('id', ids);
  const names = new Map<number, string | null>((data ?? []).map((d: any) => [d.id, d.file_name ?? null]));
  return rows.map((r) =>
    r.tabu_document_id != null ? { ...r, fulfilled_document_name: names.get(r.tabu_document_id) ?? null } : r,
  );
}

/** ספירת בקשות ממתינות — ההתראה בניהול, אותו דפוס כמו `pendingCount`. */
export async function pendingTabuRequestCount(): Promise<number | null> {
  const db = serviceStore();
  if (!db) return null;
  const { count, error } = await db
    .from('tabu_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return null;
  return count ?? 0;
}

/**
 * סימון בקשה כ"נשלחה לרשם המקרקעין" — הפעולה האנושית שאי אפשר לבצע אוטומטית
 * (אין API ציבורי לנסח, ראה `lib/tabu.ts`). מותנה ב-`status='pending'` כדי
 * שלחיצה כפולה לא תדרוס `sent_at`/`sent_by` של הפעם הראשונה.
 */
export async function markTabuRequestSent(id: number, sentBy: string): Promise<TabuRequestRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db
    .from('tabu_requests')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: sentBy })
    .eq('id', id)
    .eq('status', 'pending')
    .select(TABU_REQUEST_FIELDS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TabuRequestRow) ?? null;
}

/**
 * best-effort — נכתב גם כשהמייל נכשל, כדי שהניהול יראה שהבקשה "תקועה" ולא
 * "ממתין" סתם. מאתר את הבקשה שזה עתה נוצרה דרך `latestTabuRequestId` (ראו שם
 * למה אין ID ישיר מ-`createTabuRequest`).
 */
export async function recordTabuRequestEmailResult(
  email: string,
  gush: string,
  helka: string,
  sent: boolean,
  error: string | null,
): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  const id = await latestTabuRequestId(email, gush, helka);
  if (id == null) return;
  await db
    .from('tabu_requests')
    .update({ admin_email_sent: sent, admin_email_error: error })
    .eq('id', id);
}

/**
 * שיוך נסח שנותח בפועל לבקשות-לקוח ממתינות/שנשלחו לאותו נכס — "הושלם" הופך
 * זמין ללקוח (`tabuForProperty`/`tabuBlock` במייל) רק אחרי ניתוח, לא רק
 * העלאה גולמית; ראו ההערה על `tabu_document_id` ב-`0150_nadlan_tabu_requests.sql`:
 * "Set once the extract that answers this request is uploaded+analyzed".
 * לכן זה נקרא מ-`POST /api/admin/tabu` (אחרי `saveTabuAnalysis`), לא מ-`PUT`
 * (העלאה גולמית) — בקשה לא מסומנת "הושלם" על סמך קובץ שעדיין לא נקרא.
 *
 * ⚠️ בכוונה לא נועל/לא נוגע ב-`TabuPanel` הקיים (`RequestsBoard.tsx`, העלאה
 * יזומה ע"י צוות ללא בקשת-לקוח קודמת) — זו יכולת קיימת שממשיכה לעבוד זהה גם
 * כשאין שום בקשה תואמת (0 שורות מתעדכנות, לא שגיאה).
 *
 * כלל ההתאמה משקף בדיוק את דירוג-הרלוונטיות הקיים כבר ב-`tabuForProperty`:
 * נסח בהיקף "בניין שלם" עונה על כל בקשה לאותו גוש/חלקה; נסח "דירה"/"כניסה"
 * עונה רק על בקשה שלא ציינה תת-חלקה/כניסה, או ציינה בדיוק את אותה אחת.
 */
export async function fulfillMatchingTabuRequests(doc: {
  id: number;
  gush: string | null;
  helka: string | null;
  tatHelka: string | null;
  entrance: string | null;
  scope: TabuScope;
}): Promise<void> {
  if (!doc.gush || !doc.helka) return;
  const db = serviceStore();
  if (!db) return;
  const { data, error } = await db
    .from('tabu_requests')
    .select('id, tat_helka, entrance')
    .eq('gush', doc.gush)
    .eq('helka', doc.helka)
    .in('status', ['pending', 'sent']);
  if (error || !data) return;

  const covers = (r: { tat_helka: string | null; entrance: string | null }): boolean => {
    if (doc.scope === 'building') return true;
    if (doc.scope === 'apartment') return !r.tat_helka || r.tat_helka === doc.tatHelka;
    if (doc.scope === 'entrance') return !r.entrance || r.entrance === doc.entrance;
    return false;
  };

  const ids = (data as { id: number; tat_helka: string | null; entrance: string | null }[])
    .filter(covers)
    .map((r) => r.id);
  if (!ids.length) return;

  await db
    .from('tabu_requests')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString(), tabu_document_id: doc.id })
    .in('id', ids);
}

// ---------- תיק מידע להיתר (מהלקוח, מתוך דוח VIP) ----------
//
// אותו דפוס בדיוק כמו בקשות נסח טאבו למעלה: anon יכול **להכניס** בקשה בלבד
// (RLS: INSERT ל-public, with check(true)), כל קריאה/עדכון עוברים דרך service
// key. בשונה מנסח טאבו, תיק מידע הוא ברמת גוש/חלקה שלמה (לא לפי דירה/כניסה) —
// הוועדה המקומית מנפיקה אותו לחלקה, לא ליחידה בתוכה.

export type TikMeidaRequestGrade = 'normal' | 'urgent';
export type TikMeidaRequestStatus = 'pending' | 'sent' | 'fulfilled' | 'failed';

export interface TikMeidaRequestInput {
  gush: string;
  helka: string;
  address?: string | null;
  city?: string | null;
  assetType?: string | null;
  purpose?: string | null;
  grade: TikMeidaRequestGrade;
  requesterName?: string | null;
  requesterEmail: string;
  requesterPhone?: string | null;
  notes?: string | null;
}

export interface TikMeidaRequestRow {
  id: number;
  gush: string;
  helka: string;
  address: string | null;
  city: string | null;
  asset_type: string | null;
  purpose: string | null;
  grade: TikMeidaRequestGrade;
  requester_name: string | null;
  requester_email: string;
  requester_phone: string | null;
  notes: string | null;
  status: TikMeidaRequestStatus;
  admin_email_sent: boolean;
  admin_email_error: string | null;
  created_at: string;
  sent_at: string | null;
  sent_by: string | null;
  fulfilled_at: string | null;
  tik_meida_document_id: number | null;
  /** לא בטבלה — מולא ע"י `attachFulfilledTikMeidaDocumentNames` להצגה בלבד. */
  fulfilled_document_name?: string | null;
}

const TIK_MEIDA_REQUEST_FIELDS =
  'id,gush,helka,address,city,asset_type,purpose,grade,requester_name,requester_email,' +
  'requester_phone,notes,status,admin_email_sent,admin_email_error,created_at,sent_at,sent_by,' +
  'fulfilled_at,tik_meida_document_id';

/**
 * יצירת בקשת תיק מידע — המסלול הציבורי, עם anon key.
 * ⚠️ אין `.select()` בכוונה — אותה סיבה בדיוק כמו `createTabuRequest`.
 */
export async function createTikMeidaRequest(input: TikMeidaRequestInput): Promise<void> {
  const db = anonStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_ANON_KEY).');
  if (!input.gush?.trim() || !input.helka?.trim()) {
    throw new Error('נדרשים גוש וחלקה כדי לבקש תיק מידע להיתר.');
  }
  if (!looksLikeEmail(input.requesterEmail)) {
    throw new Error('כתובת המייל אינה תקינה.');
  }
  const { error } = await db.from('tik_meida_requests').insert({
    gush: input.gush.trim(),
    helka: input.helka.trim(),
    address: input.address ?? null,
    city: input.city ?? null,
    asset_type: input.assetType ?? null,
    purpose: input.purpose ?? null,
    grade: input.grade === 'urgent' ? 'urgent' : 'normal',
    requester_name: input.requesterName ?? null,
    requester_email: input.requesterEmail.trim(),
    requester_phone: input.requesterPhone ?? null,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
}

/** אותו רעיון בדיוק כמו `latestTabuRequestId` — לתיוג תוצאת מייל-ההתראה בלבד. */
async function latestTikMeidaRequestId(email: string, gush: string, helka: string): Promise<number | null> {
  const db = serviceStore();
  if (!db) return null;
  const { data } = await db
    .from('tik_meida_requests')
    .select('id')
    .eq('requester_email', email)
    .eq('gush', gush)
    .eq('helka', helka)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { id: number } | null)?.id ?? null;
}

export async function listTikMeidaRequests(
  opts: { status?: TikMeidaRequestStatus; limit?: number } = {},
): Promise<TikMeidaRequestRow[]> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת קריאה לבקשות תיק מידע.');
  let q = db
    .from('tik_meida_requests')
    .select(TIK_MEIDA_REQUEST_FIELDS)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TikMeidaRequestRow[];
}

/** אותו רעיון בדיוק כמו `attachFulfilledTabuDocumentNames`, לתיק מידע. */
export async function attachFulfilledTikMeidaDocumentNames(
  rows: TikMeidaRequestRow[],
): Promise<TikMeidaRequestRow[]> {
  const ids = Array.from(
    new Set(rows.map((r) => r.tik_meida_document_id).filter((id): id is number => id != null)),
  );
  if (ids.length === 0) return rows;
  const db = serviceStore();
  if (!db) return rows;
  const { data } = await db.from('tik_meida_documents').select('id,file_name').in('id', ids);
  const names = new Map<number, string | null>((data ?? []).map((d: any) => [d.id, d.file_name ?? null]));
  return rows.map((r) =>
    r.tik_meida_document_id != null
      ? { ...r, fulfilled_document_name: names.get(r.tik_meida_document_id) ?? null }
      : r,
  );
}

/** ספירת בקשות ממתינות — ההתראה בניהול, אותו דפוס כמו `pendingTabuRequestCount`. */
export async function pendingTikMeidaRequestCount(): Promise<number | null> {
  const db = serviceStore();
  if (!db) return null;
  const { count, error } = await db
    .from('tik_meida_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) return null;
  return count ?? 0;
}

/**
 * סימון בקשה כ"נשלחה לוועדה המקומית" — הפעולה האנושית שאי אפשר לבצע אוטומטית
 * (אין API ציבורי להגשת בקשת תיק מידע). מותנה ב-`status='pending'` כדי שלחיצה
 * כפולה לא תדרוס `sent_at`/`sent_by` של הפעם הראשונה.
 */
export async function markTikMeidaRequestSent(id: number, sentBy: string): Promise<TikMeidaRequestRow | null> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  const { data, error } = await db
    .from('tik_meida_requests')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: sentBy })
    .eq('id', id)
    .eq('status', 'pending')
    .select(TIK_MEIDA_REQUEST_FIELDS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TikMeidaRequestRow) ?? null;
}

/** best-effort — אותו דפוס בדיוק כמו `recordTabuRequestEmailResult`. */
export async function recordTikMeidaRequestEmailResult(
  email: string,
  gush: string,
  helka: string,
  sent: boolean,
  error: string | null,
): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  const id = await latestTikMeidaRequestId(email, gush, helka);
  if (id == null) return;
  await db
    .from('tik_meida_requests')
    .update({ admin_email_sent: sent, admin_email_error: error })
    .eq('id', id);
}

// ---------- מסמכי תיק מידע להיתר ----------

export interface TikMeidaDocRow {
  id: number;
  request_id: number | null;
  gush: string;
  helka: string;
  address: string | null;
  city: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

const TIK_MEIDA_DOC_FIELDS =
  'id,request_id,gush,helka,address,city,file_name,file_path,mime_type,size_bytes,note,uploaded_by,uploaded_at';

export const TIK_MEIDA_BUCKET = 'tik-meida';

export async function saveTikMeidaDocument(row: {
  requestId?: number | null;
  gush: string;
  helka: string;
  address?: string | null;
  city?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  note?: string | null;
  uploadedBy?: string | null;
}): Promise<TikMeidaDocRow> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר — אין הרשאת כתיבה לתיקי מידע.');
  const { data, error } = await db
    .from('tik_meida_documents')
    .insert({
      request_id: row.requestId ?? null,
      gush: row.gush,
      helka: row.helka,
      address: row.address ?? null,
      city: row.city ?? null,
      file_name: row.fileName,
      file_path: row.filePath,
      mime_type: row.mimeType,
      size_bytes: row.sizeBytes,
      note: row.note ?? null,
      uploaded_by: row.uploadedBy ?? null,
    })
    .select(TIK_MEIDA_DOC_FIELDS)
    .single();
  if (error) throw new Error(error.message);
  return data as TikMeidaDocRow;
}

export async function listTikMeidaDocuments(
  opts: { gush?: string | null; helka?: string | null; limit?: number } = {},
): Promise<TikMeidaDocRow[]> {
  const db = serviceStore();
  if (!db) throw new Error('SUPABASE_SERVICE_KEY חסר.');
  let q = db
    .from('tik_meida_documents')
    .select(TIK_MEIDA_DOC_FIELDS)
    .order('uploaded_at', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.gush) q = q.eq('gush', opts.gush);
  if (opts.helka) q = q.eq('helka', opts.helka);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TikMeidaDocRow[];
}

/** תיקי המידע ששייכים לחלקה — לצירוף לדוח/מייל, החדש ביותר קודם. */
export async function tikMeidaForProperty(opts: {
  gush?: string | null;
  helka?: string | null;
}): Promise<TikMeidaDocRow[]> {
  if (!opts.gush || !opts.helka) return [];
  const db = serviceStore();
  if (!db) return [];
  const { data, error } = await db
    .from('tik_meida_documents')
    .select(TIK_MEIDA_DOC_FIELDS)
    .eq('gush', opts.gush)
    .eq('helka', opts.helka)
    .order('uploaded_at', { ascending: false });
  if (error || !data) return [];
  return data as TikMeidaDocRow[];
}

/**
 * שיוך תיק-מידע שהועלה בפועל לבקשות-לקוח ממתינות/שנשלחו לאותה חלקה —
 * ברמת גוש/חלקה בלבד (בשונה מ-`fulfillMatchingTabuRequests`, אין כאן דירוג
 * דירה/כניסה/בניין: תיק מידע חל תמיד על כל החלקה). נקרא מ-`PUT
 * /api/admin/tik-meida` מיד אחרי שההעלאה עצמה הצליחה — אין שלב "ניתוח" נפרד
 * (בשונה מטאבו): תיק מידע הוא מסמך רשמי מהוועדה, וההעלאה עצמה היא ה"הנפקה".
 */
export async function fulfillMatchingTikMeidaRequests(doc: {
  id: number;
  gush: string;
  helka: string;
}): Promise<void> {
  const db = serviceStore();
  if (!db) return;
  await db
    .from('tik_meida_requests')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString(), tik_meida_document_id: doc.id })
    .eq('gush', doc.gush)
    .eq('helka', doc.helka)
    .in('status', ['pending', 'sent']);
}

