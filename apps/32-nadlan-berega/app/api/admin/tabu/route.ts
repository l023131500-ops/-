// ==== ׳˜׳׳‘׳• ׳‘׳ ׳™׳”׳•׳: ׳”׳¢׳׳׳× ׳ ׳¡׳—, ׳ ׳™׳×׳•׳—, ׳•׳¨׳©׳™׳׳” ====
//
// ׳”׳׳₪׳¨׳˜: ׳›׳₪׳×׳•׳¨ "׳”׳¢׳׳׳× ׳ ׳¡׳— ׳˜׳׳‘׳•" + ׳›׳₪׳×׳•׳¨ "׳ ׳™׳×׳•׳— ׳˜׳׳‘׳•" ׳©׳׳¦׳¨׳£ ׳׳“׳•׳— ׳׳₪׳™ ׳“׳™׳¨׳” /
// ׳‘׳ ׳™׳™׳ / ׳›׳ ׳™׳¡׳”. ׳©׳ ׳™ ׳”׳›׳₪׳×׳•׳¨׳™׳ ׳׳“׳‘׳¨׳™׳ ׳¢׳ ׳”׳׳¡׳׳•׳ ׳”׳–׳”.
//
// ג ן¸ ׳”׳§׳•׳‘׳¥ ׳ ׳©׳׳¨ ׳‘-bucket ׳₪׳¨׳˜׳™ (`tabu`) ׳•׳׳ ׳‘׳˜׳‘׳׳”, ׳•׳׳™׳ ׳׳• ׳©׳•׳ ׳׳¡׳׳•׳ ׳¦׳™׳‘׳•׳¨׳™:
// ׳ ׳¡׳— ׳˜׳׳‘׳• ׳׳›׳™׳ ׳©׳׳•׳× ׳‘׳¢׳׳™׳, ׳׳©׳›׳ ׳×׳׳•׳× ׳•׳¢׳™׳§׳•׳׳™׳. ׳’׳ ׳”׳˜׳‘׳׳” `tabu_documents`
// ׳”׳™׳ RLS ׳׳׳ policies ג€” ׳›׳ ׳’׳™׳©׳” ׳¢׳•׳‘׳¨׳× ׳“׳¨׳ service key ׳‘׳¦׳“ ׳”׳©׳¨׳×.

import { NextRequest, NextResponse } from 'next/server';
import { adminGate } from '@/lib/adminauth';
import {
  claimTabuAnalysis,
  failTabuAnalysis,
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
    return NextResponse.json({ error: e?.message ?? '׳©׳’׳™׳׳”' }, { status: 500 });
  }
}

/** ׳”׳¢׳׳׳× ׳ ׳¡׳— ג€” multipart/form-data ׳¢׳ ׳”׳©׳“׳” `file`. */
export async function PUT(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const db = serviceStore();
  if (!db) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_KEY ׳—׳¡׳¨ ג€” ׳׳™׳ ׳”׳¨׳©׳׳× ׳׳—׳¡׳•׳ ׳׳ ׳¡׳—׳™׳.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: '׳ ׳“׳¨׳© multipart/form-data ׳¢׳ ׳©׳“׳” file' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '׳׳ ׳ ׳‘׳—׳¨ ׳§׳•׳‘׳¥.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: `׳¡׳•׳’ ׳§׳•׳‘׳¥ ׳׳ ׳ ׳×׳׳ (${file.type || '׳׳ ׳™׳“׳•׳¢'}). ׳ ׳×׳׳›׳™׳: PDF, JPG, PNG, WEBP.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '׳”׳§׳•׳‘׳¥ ׳’׳“׳•׳ ׳-25MB.' }, { status: 400 });
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
      { error: '׳ ׳“׳¨׳©׳™׳ ׳’׳•׳© ׳•׳—׳׳§׳” ג€” ׳‘׳׳¢׳“׳™׳”׳ ׳׳™׳ ׳“׳¨׳ ׳׳©׳™׳™׳ ׳׳× ׳”׳ ׳¡׳— ׳׳“׳•׳—.' },
      { status: 400 },
    );
  }
  // ׳©׳™׳•׳ ׳‘׳׳™ ׳׳–׳”׳” ׳₪׳™׳¨׳•׳©׳• ׳ ׳×׳•׳ ׳™׳ ׳׳©׳₪׳˜׳™׳™׳ ׳©׳™׳•׳¦׳’׳• ׳׳“׳™׳¨׳” ׳”׳׳ ׳ ׳›׳•׳ ׳”.
  if (scope === 'apartment' && !str('tat_helka') && !str('apartment')) {
    return NextResponse.json(
      {
        error:
          '׳׳ ׳¡׳— ׳©׳ ׳“׳™׳¨׳” ׳ ׳“׳¨׳© ׳׳¡׳₪׳¨ ׳×׳×-׳—׳׳§׳” ׳׳• ׳׳¡׳₪׳¨ ׳“׳™׳¨׳”. ׳‘׳׳¢׳“׳™׳• ׳”׳ ׳×׳•׳ ׳™׳ ׳”׳׳©׳₪׳˜׳™׳™׳ ׳¢׳׳•׳׳™׳ ׳׳”׳™׳•׳× ׳׳•׳¦׳’׳™׳ ׳׳“׳™׳¨׳” ׳׳—׳¨׳× ׳‘׳‘׳ ׳™׳™׳.',
      },
      { status: 400 },
    );
  }
  if (scope === 'entrance' && !str('entrance')) {
    return NextResponse.json({ error: '׳׳ ׳¡׳— ׳©׳ ׳›׳ ׳™׳¡׳” ׳ ׳“׳¨׳© ׳׳¡׳₪׳¨ ׳›׳ ׳™׳¡׳”.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // ׳”׳ ׳×׳™׳‘ ׳׳™׳ ׳• ׳ ׳’׳–׳¨ ׳׳©׳ ׳”׳§׳•׳‘׳¥ ׳©׳”׳׳©׳×׳׳© ׳‘׳—׳¨ ג€” ׳©׳ ׳§׳•׳‘׳¥ ׳©׳׳’׳™׳¢ ׳׳‘׳—׳•׳¥ ׳׳ ׳ ׳›׳ ׳¡ ׳׳ ׳×׳™׳‘.
  const path = `${gush}-${helka}/${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await db.storage.from(TABU_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: `׳©׳׳™׳¨׳× ׳”׳§׳•׳‘׳¥ ׳ ׳›׳©׳׳”: ${up.error.message}` }, { status: 500 });
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
    // ׳”׳§׳•׳‘׳¥ ׳¢׳׳” ׳׳‘׳ ׳”׳©׳•׳¨׳” ׳׳ ׳ ׳›׳×׳‘׳” ג€” ׳׳¡׳™׳¨׳™׳ ׳׳× ׳”׳§׳•׳‘׳¥ ׳›׳“׳™ ׳׳ ׳׳”׳©׳׳™׳¨ ׳™׳×׳•׳.
    await db.storage.from(TABU_BUCKET).remove([path]).catch(() => null);
    return NextResponse.json({ error: e?.message ?? '׳©׳’׳™׳׳” ׳‘׳©׳׳™׳¨׳× ׳”׳¨׳©׳•׳׳”' }, { status: 500 });
  }
}

/** "׳ ׳™׳×׳•׳— ׳˜׳׳‘׳•" ג€” ׳§׳•׳¨׳ ׳׳× ׳”׳§׳•׳‘׳¥ ׳©׳ ׳©׳׳¨ ׳•׳׳—׳׳¥ ׳׳׳ ׳• ׳׳× ׳”׳ ׳×׳•׳ ׳™׳ ׳”׳׳©׳₪׳˜׳™׳™׳. */
export async function POST(req: NextRequest) {
  const gate = await adminGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '׳’׳•׳£ ׳‘׳§׳©׳” ׳׳ ׳×׳§׳™׳' }, { status: 400 });
  }
  const id = Number(body?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: '׳—׳¡׳¨ ׳׳–׳”׳” ׳׳¡׳׳' }, { status: 400 });

  if (!tabuAnalysisConfigured()) {
    return NextResponse.json(
      {
        error:
          '׳ ׳™׳×׳•׳— ׳ ׳¡׳— ׳“׳•׳¨׳© AI_API_KEY ׳¢׳ AI_PROVIDER=anthropic. ׳”׳§׳•׳‘׳¥ ׳©׳׳•׳¨, ׳׳ ׳׳ ׳ ׳¦׳™׳’ ׳ ׳×׳•׳ ׳™׳ ׳׳©׳₪׳˜׳™׳™׳ ׳‘׳׳™ ׳׳§׳¨׳•׳ ׳׳× ׳”׳ ׳¡׳— ׳‘׳׳׳×.',
      },
      { status: 503 },
    );
  }

  const db = serviceStore();
  if (!db) return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY ׳—׳¡׳¨.' }, { status: 503 });

  const existing = await getTabuDocument(id).catch(() => null);
  if (!existing) return NextResponse.json({ error: '׳”׳׳¡׳׳ ׳׳ ׳ ׳׳¦׳.' }, { status: 404 });
  if (existing.analysis_status === 'running') {
    return NextResponse.json({ error: '׳ ׳™׳×׳•׳— ׳›׳‘׳¨ ׳¨׳¥ ׳¢׳ ׳”׳׳¡׳׳ ׳”׳–׳”.' }, { status: 409 });
  }

  const claimed = await claimTabuAnalysis(id).catch(() => null);
  if (!claimed) return NextResponse.json({ error: '׳׳ ׳ ׳™׳×׳ ׳׳”׳×׳—׳™׳ ׳ ׳™׳×׳•׳—.' }, { status: 409 });

  try {
    const dl = await db.storage.from(TABU_BUCKET).download(claimed.file_path!);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? '׳”׳§׳•׳‘׳¥ ׳׳ ׳ ׳׳¦׳ ׳‘׳׳—׳¡׳•׳');
    const b64 = Buffer.from(await dl.data.arrayBuffer()).toString('base64');

    const res = await analyzeTabuFile(b64, claimed.mime_type ?? 'application/pdf', {
      gush: claimed.gush,
      helka: claimed.helka,
      tatHelka: claimed.tat_helka,
      scope: claimed.scope,
    });

    if (!res.analysis) {
      await failTabuAnalysis(id, res.error ?? '׳”׳ ׳™׳×׳•׳— ׳׳ ׳”׳—׳–׳™׳¨ ׳×׳•׳¦׳׳”');
      return NextResponse.json({ error: res.error }, { status: 502 });
    }

    await saveTabuAnalysis(id, res.analysis, res.rawText);
    return NextResponse.json({ ok: true, analysis: res.analysis });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await failTabuAnalysis(id, msg);
    return NextResponse.json({ error: `׳ ׳™׳×׳•׳— ׳”׳ ׳¡׳— ׳ ׳›׳©׳: ${msg}` }, { status: 500 });
  }
}
