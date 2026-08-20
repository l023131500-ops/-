import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { getHubUserFromRequest } from '@/lib/hub-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/htr/jobs/:id/approve   body: { final_text, approved_by? }
// אישור אנושי — הצעד היחיד שמסמן טקסט כמוכן לשילוב בספר.
// "הטקסט קדוש": ללא צעד זה שום טקסט לא נכנס. חובה final_text לא ריק.
// ============================================================
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getHubUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'נדרשת התחברות' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const finalText: string | undefined = body?.final_text;
  const approvedBy: string = user.email || body?.approved_by || 'human';

  if (!finalText || !finalText.trim()) {
    return NextResponse.json(
      { error: 'לא ניתן לאשר טקסט ריק — יש להזין את הטקסט הסופי המאושר' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // .neq('status','approved') הופך את העדכון לאידמפוטנטי: קריאה כפולה
  // (רשת חוזרת / טאב שני) לא תדרוס approved_at/approved_by קיימים.
  const { data, error } = await supabase
    .from('htr_jobs')
    .update({
      final_text: finalText,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('id', params.id)
    .neq('status', 'approved')
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    const { data: existing } = await supabase
      .from('htr_jobs')
      .select()
      .eq('id', params.id)
      .maybeSingle();
    if (existing?.status === 'approved') {
      return NextResponse.json({ job: existing, message: 'הטקסט כבר אושר קודם לכן' });
    }
    return NextResponse.json({ error: 'המשימה לא נמצאה' }, { status: 404 });
  }

  return NextResponse.json({ job: data, message: 'הטקסט אושר ומוכן לשילוב בספר' });
}
