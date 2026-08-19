import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, HTR_BUCKET } from '@/lib/supabase';
import { pickEngine, HtrEngineNotConfigured } from '@/lib/htr-engine';
import { pickCorrector, CorrectorNotConfigured } from '@/lib/htr-corrector';
import type { HtrJob } from '@/lib/htr-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// שתי קריאות ראייה של דף שלם לוקחות כדקה עד שתיים; התקרה הקודמת (60) חתכה
// את הבקשה ב-FUNCTION_INVOCATION_TIMEOUT והשאירה את ה-job תקוע ב-processing.
export const maxDuration = 300;

// ============================================================
// POST /api/htr/process   body: { job_id, skip_correction? }
// מריץ את הצינור המלא על job קיים:
//   1. signed URL לתמונה
//   2. מנוע HTR (לפי tier) -> raw_text + confidence
//   3. תיקון-אחר LLM (לפי tier) -> corrected_text
//   4. שמירה + status='corrected' (ממתין לאישור אנושי)
// כל שלב מטפל ב-"מנוע לא מוגדר" בחן — שומר את מה שהושג ומעדכן סטטוס.
// ============================================================

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const jobId: string | undefined = body?.job_id;
  const skipCorrection = !!body?.skip_correction;

  if (!jobId) {
    return NextResponse.json({ error: 'חסר job_id' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const { data: job, error: fetchErr } = await supabase
    .from('htr_jobs').select('*').eq('id', jobId).single();
  if (fetchErr || !job) {
    return NextResponse.json({ error: 'job לא נמצא' }, { status: 404 });
  }
  const j = job as HtrJob;

  await supabase.from('htr_jobs').update({ status: 'processing' }).eq('id', jobId);

  // 1) signed URL (שעה)
  const { data: signed, error: signErr } = await supabase.storage
    .from(HTR_BUCKET).createSignedUrl(j.image_url, 3600);
  if (signErr || !signed?.signedUrl) {
    await fail(supabase, jobId, `יצירת signed URL נכשלה: ${signErr?.message}`);
    return NextResponse.json({ error: 'לא ניתן לגשת לתמונה' }, { status: 502 });
  }

  // 2) מנוע HTR
  const engine = pickEngine(j.tier);
  let rawText = '', meanConf = 0, confidence: any = null;
  try {
    const res = await engine.recognize(signed.signedUrl, j.material);
    rawText = res.rawText;
    meanConf = res.meanConfidence;
    confidence = res.lines;
    await supabase.from('htr_jobs').update({
      status: 'raw_ready', engine: res.engine,
      raw_text: rawText, confidence, mean_confidence: meanConf
    }).eq('id', jobId);
  } catch (e: any) {
    if (e instanceof HtrEngineNotConfigured) {
      await supabase.from('htr_jobs').update({
        status: 'failed', engine: e.engineName, error_detail: e.message
      }).eq('id', jobId);
      return NextResponse.json({
        error: 'מנוע HTR אינו מוגדר', engine: e.engineName, detail: e.message,
        hint: 'הצינור בנוי ומחכה לחיבור שרת HTR (GPU). ראה מסמך המסירה.'
      }, { status: 503 });
    }
    await fail(supabase, jobId, `שגיאת מנוע: ${e.message}`);
    return NextResponse.json({ error: 'שגיאת מנוע HTR', detail: e.message }, { status: 502 });
  }

  // 3) תיקון-אחר (אופציונלי)
  if (skipCorrection) {
    return NextResponse.json({ ok: true, stage: 'raw_ready', job_id: jobId });
  }
  const corrector = pickCorrector(j.tier);
  try {
    const c = await corrector.correct(rawText);
    await supabase.from('htr_jobs').update({
      status: 'corrected', corrector: c.corrector, corrected_text: c.correctedText
    }).eq('id', jobId);
    return NextResponse.json({ ok: true, stage: 'corrected', job_id: jobId });
  } catch (e: any) {
    // תיקון נכשל — לא נורא, הטקסט הגולמי כבר שמור. סטטוס נשאר raw_ready.
    const detail = e instanceof CorrectorNotConfigured ? e.message : `שגיאת תיקון: ${e.message}`;
    await supabase.from('htr_jobs').update({
      status: 'raw_ready', corrector: 'none', error_detail: detail
    }).eq('id', jobId);
    return NextResponse.json({
      ok: true, stage: 'raw_ready', correction_skipped: true, detail
    }, { status: 200 });
  }
}

async function fail(supabase: any, jobId: string, detail: string) {
  await supabase.from('htr_jobs').update({ status: 'failed', error_detail: detail }).eq('id', jobId);
}
