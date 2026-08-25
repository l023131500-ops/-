// ==== טאבו בניהול: העלאת נסח, ניתוח, ורשימה ====
//
// המפרט: כפתור "העלאת נסח טאבו" + כפתור "ניתוח טאבו" שמצרף לדוח לפי דירה /
// בניין / כניסה. שני הכפתורים מדברים עם המסלול הזה.
//
// ⚠️ הקובץ נשמר ב-bucket פרטי (`tabu`) ולא בטבלה, ואין לו שום מסלול ציבורי:
// נסח טאבו מכיל שמות בעלים, משכנתאות ועיקולים. גם הטבלה `tabu_documents`
// היא RLS ללא policies — כל גישה עוברת דרך service key בצד השרת.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import {
  claimTabuAnalysis,
  failTabuAnalysis,
  fulfillMatchingTabuRequests,
  getTabuDocument,
  listTabuDocuments,
  saveTabuAnalysis,
  saveTabuDocument,
  serviceStore,
  TABU_BUCKET,
  type TabuScope,
} from '@/lib/requests';
import { analyzeTabuFile, tabuAnalysisConfigured } from '@/lib/tabudoc';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SCOPES: TabuScope[] = ['apartment', 'entrance', 'building'];
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 25 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const p = req.nextUrl.searchParams;
  const requestId = p.get('request_id');
  try {
    const docs = await listTabuDocuments({
      gush: p.get('gush'),
      helka: p.get('helka'),
      requestId: requestId ? Number(requestId) : null,
    });
    return NextResponse.json({ documents: docs, analysisConfigured: tabuAnalysisConfigured() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'שגיאה' }, { status: 500 });
  }
}

/** העלאת נסח — multipart/form-data עם השדה `file`. */
export async function PUT(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = serviceStore();
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_KEY חסר — אין הרשאת אחסון לנסחים.' },
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

  const str = (k: string) => {
    const v = form.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s ? s.slice(0, 60) : null;
  };
  const scopeRaw = str('scope') ?? 'apartment';
  const scope: TabuScope = SCOPES.includes(scopeRaw as TabuScope) ? (scopeRaw as TabuScope) : 'apartment';
  const gush = str('gush');
  const helka = str('helka');

  if (!gush || !helka) {
    return NextResponse.json(
      { error: 'נדרשים גוש וחלקה — בלעדיהם אין דרך לשייך את הנסח לדוח.' },
      { status: 400 },
    );
  }
  // שיוך בלי מזהה פירושו נתונים משפטיים שיוצגו לדירה הלא נכונה.
  if (scope === 'apartment' && !str('tat_helka') && !str('apartment')) {
    return NextResponse.json(
      {
        error:
          'לנסח של דירה נדרש מספר תת-חלקה או מספר דירה. בלעדיו הנתונים המשפטיים עלולים להיות מוצגים לדירה אחרת בבניין.',
      },
      { status: 400 },
    );
  }
  if (scope === 'entrance' && !str('entrance')) {
    return NextResponse.json({ error: 'לנסח של כניסה נדרש מספר כניסה.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // הנתיב אינו נגזר משם הקובץ שהמשתמש בחר — שם קובץ שמגיע מבחוץ לא נכנס לנתיב.
  const path = `${gush}-${helka}/${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await db.storage.from(TABU_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: `שמירת הקובץ נכשלה: ${up.error.message}` }, { status: 500 });
  }

  try {
    const row = await saveTabuDocument({
      requestId: form.get('request_id') ? Number(form.get('request_id')) : null,
      gush,
      helka,
      tatHelka: str('tat_helka'),
      address: str('address'),
      scope,
      entrance: str('entrance'),
      apartment: str('apartment'),
      docType: str('doc_type') ?? 'regular',
      fileName: file.name.slice(0, 200),
      filePath: path,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: 'admin',
    });
    return NextResponse.json({ ok: true, document: row, analysisConfigured: tabuAnalysisConfigured() });
  } catch (e: any) {
    // הקובץ עלה אבל השורה לא נכתבה — מסירים את הקובץ כדי לא להשאיר יתום.
    await db.storage.from(TABU_BUCKET).remove([path]).catch(() => null);
    return NextResponse.json({ error: e?.message ?? 'שגיאה בשמירת הרשומה' }, { status: 500 });
  }
}

/** "ניתוח טאבו" — קורא את הקובץ שנשמר ומחלץ ממנו את הנתונים המשפטיים. */
export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }
  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'חסר מזהה מסמך' }, { status: 400 });

  if (!tabuAnalysisConfigured()) {
    return NextResponse.json(
      {
        error:
          'ניתוח נסח דורש AI_API_KEY עם AI_PROVIDER=anthropic. הקובץ שמור, אך לא נציג נתונים משפטיים בלי לקרוא את הנסח באמת.',
      },
      { status: 503 },
    );
  }

  const db = serviceStore();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY חסר.' }, { status: 503 });

  const existing = await getTabuDocument(id).catch(() => null);
  if (!existing) return NextResponse.json({ error: 'המסמך לא נמצא.' }, { status: 404 });
  if (existing.analysis_status === 'running') {
    return NextResponse.json({ error: 'ניתוח כבר רץ על המסמך הזה.' }, { status: 409 });
  }

  const claimed = await claimTabuAnalysis(id).catch(() => null);
  if (!claimed) return NextResponse.json({ error: 'לא ניתן להתחיל ניתוח.' }, { status: 409 });

  try {
    const dl = await db.storage.from(TABU_BUCKET).download(claimed.file_path!);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? 'הקובץ לא נמצא באחסון');
    const b64 = Buffer.from(await dl.data.arrayBuffer()).toString('base64');

    const res = await analyzeTabuFile(b64, claimed.mime_type ?? 'application/pdf', {
      gush: claimed.gush,
      helka: claimed.helka,
      tatHelka: claimed.tat_helka,
      scope: claimed.scope,
    });

    if (!res.analysis) {
      await failTabuAnalysis(id, res.error ?? 'הניתוח לא החזיר תוצאה');
      return NextResponse.json({ error: res.error }, { status: 502 });
    }

    await saveTabuAnalysis(id, res.analysis, res.rawText);
    await fulfillMatchingTabuRequests({
      id,
      gush: claimed.gush,
      helka: claimed.helka,
      tatHelka: claimed.tat_helka,
      entrance: claimed.entrance,
      scope: claimed.scope,
    }).catch(() => null); // best-effort — ניתוח כבר הצליח ונשמר, אין לחסום עליו
    return NextResponse.json({ ok: true, analysis: res.analysis });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await failTabuAnalysis(id, msg);
    return NextResponse.json({ error: `ניתוח הנסח נכשל: ${msg}` }, { status: 500 });
  }
}
