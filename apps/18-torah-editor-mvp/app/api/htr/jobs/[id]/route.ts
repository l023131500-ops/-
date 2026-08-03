import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, HTR_BUCKET } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/htr/jobs/:id — job מלא + signed URL לתמונה
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const { data: job, error } = await supabase
    .from('htr_jobs').select('*').eq('id', params.id).single();
  if (error || !job) {
    return NextResponse.json({ error: 'job לא נמצא' }, { status: 404 });
  }

  let imageSignedUrl: string | null = null;
  const { data: signed } = await supabase.storage
    .from(HTR_BUCKET).createSignedUrl(job.image_url, 3600);
  if (signed?.signedUrl) imageSignedUrl = signed.signedUrl;

  return NextResponse.json({ job, imageSignedUrl });
}

// PATCH /api/htr/jobs/:id — עדכון final_text ע"י עורך אנושי (עריכה ידנית)
// לא משנה raw_text / corrected_text — "הטקסט קדוש".
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const finalText: string | undefined = body?.final_text;
  if (typeof finalText !== 'string') {
    return NextResponse.json({ error: 'final_text חייב להיות מחרוזת' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('htr_jobs').update({ final_text: finalText }).eq('id', params.id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ job: data });
}
