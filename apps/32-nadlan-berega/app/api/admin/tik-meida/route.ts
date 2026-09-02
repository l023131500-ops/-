// ==== תיק מידע להיתר בניהול: העלאה + רשימה ====
//
// בשונה מנסח טאבו (app/api/admin/tabu), אין כאן שלב "ניתוח" נפרד: תיק מידע
// הוא מסמך רשמי שהוועדה המקומית עצמה מנפיקה, וההעלאה שלו (עם הערת-תמצות
// קצרה, אופציונלית, שהצוות מקליד) *היא* ה"הנפקה" — ומיד משייכת אותו לכל
// בקשת-לקוח ממתינה/שנשלחה לאותה חלקה (`fulfillMatchingTikMeidaRequests`).
//
// ⚠️ הקובץ נשמר ב-bucket פרטי (`tik-meida`), אין לו מסלול ציבורי: תיק מידע
// יכול לכלול פרטי בקשה/מגיש אמיתיים. גם הטבלה `tik_meida_documents` היא RLS
// ללא policies — כל גישה עוברת דרך service key בצד השרת.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import {
  fulfillMatchingTikMeidaRequests,
  listTikMeidaDocuments,
  saveTikMeidaDocument,
  serviceStore,
  TIK_MEIDA_BUCKET,
} from '@/lib/requests';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const p = req.nextUrl.searchParams;
  try {
    const documents = await listTikMeidaDocuments({ gush: p.get('gush'), helka: p.get('helka') });
    return NextResponse.json({ documents });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה' }, { status: 500 });
  }
}

/** העלאת תיק מידע — multipart/form-data עם השדה `file`. */
export async function PUT(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = serviceStore();
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_KEY חסר — אין הרשאת אחסון לתיקי מידע.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'נדרש multipart/form-data עם שדה file' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'לא נבחר קובץ.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: `סוג קובץ לא נתמך (${file.type || 'לא ידוע'}). נתמכים: PDF, JPG, PNG, WEBP.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'הקובץ גדול מ-25MB.' }, { status: 400 });
  }

  const str = (k: string, max = 300) => {
    const v = form.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s ? s.slice(0, max) : null;
  };
  const gush = str('gush', 60);
  const helka = str('helka', 60);
  if (!gush || !helka) {
    return NextResponse.json(
      { error: 'נדרשים גוש וחלקה — בלעדיהם אין דרך לשייך את התיק לדוח.' },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${gush}-${helka}/${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await db.storage.from(TIK_MEIDA_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: `שמירת הקובץ נכשלה: ${up.error.message}` }, { status: 500 });
  }

  try {
    const row = await saveTikMeidaDocument({
      requestId: form.get('request_id') ? Number(form.get('request_id')) : null,
      gush,
      helka,
      address: str('address'),
      city: str('city', 120),
      fileName: file.name.slice(0, 200),
      filePath: path,
      mimeType: file.type,
      sizeBytes: file.size,
      note: str('note', 2000),
      uploadedBy: 'admin',
    });
    // ההעלאה עצמה היא ה"הנפקה" — משייכת מיד לכל בקשה ממתינה/שנשלחה לאותה
    // חלקה. best-effort: אם השיוך נכשל, המסמך כבר נשמר בהצלחה ולא נחסום עליו.
    await fulfillMatchingTikMeidaRequests({ id: row.id, gush, helka }).catch(() => null);
    return NextResponse.json({ ok: true, document: row });
  } catch (e: any) {
    // הקובץ עלה אבל השורה לא נכתבה — מסירים את הקובץ כדי לא להשאיר יתום.
    await db.storage.from(TIK_MEIDA_BUCKET).remove([path]).catch(() => null);
    return NextResponse.json({ error: e?.message ?? 'שגיאה בשמירת הרשומה' }, { status: 500 });
  }
}
