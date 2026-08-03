import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/htr/jobs/:id/approve   body: { final_text, approved_by? }
// אישור אנושי — הצעד היחיד שמסמן טקסט כמוכן לשילוב בספר.
// "הטקסט קדוש": ללא צעד זה שום טקסט לא נכנס. חובה final_text לא ריק.
// ============================================================
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const finalText: string | undefined = body?.final_text;
  const approvedBy: string = body?.approved_by || 'human';

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

  const { data, error } = await supabase
    .from('htr_jobs')
    .update({
      final_text: finalText,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ job: data, message: 'הטקסט אושר ומוכן לשילוב בספר' });
}
