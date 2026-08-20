import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, HTR_BUCKET } from '@/lib/supabase';
import { getHubUserFromRequest } from '@/lib/hub-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/htr/jobs?limit=50  — רשימת ה-jobs האחרונים
export async function GET(req: NextRequest) {
  if (!(await getHubUserFromRequest(req))) {
    return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 200);
  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('htr_jobs')
    .select('id,created_at,updated_at,page_label,material,tier,status,engine,corrector,mean_confidence,approved_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ jobs: data ?? [] });
}
