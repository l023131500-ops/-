import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, HTR_BUCKET } from '@/lib/supabase';
import { HTR_MAX_UPLOAD_BYTES } from '@/lib/htr-types';
import type { HtrMaterial, HtrTier } from '@/lib/htr-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/htr/upload
// מקבל תמונת כתב יד (multipart/form-data), מעלה ל-Supabase Storage,
// ויוצר רשומת job חדשה בסטטוס 'uploaded'.
// לא מבצע HTR — זה נעשה ב-/api/htr/process (הפרדת אחריות).
// ============================================================

// אותה תקרה שהלקוח בודק לפני השליחה — lib/htr-types.ts.
const MAX_BYTES = HTR_MAX_UPLOAD_BYTES; // 15MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

const VALID_MATERIAL: HtrMaterial[] = [
  'modern_handwriting', 'rabbinic_18_19', 'medieval_square', 'rashi_ladino', 'print'
];
const VALID_TIER: HtrTier[] = ['regular', 'internal'];

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'נדרש multipart/form-data עם שדה file' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'חסר קובץ תמונה (שדה "file")' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 15MB)' }, { status: 413 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `סוג קובץ לא נתמך: ${file.type}. נתמכים: JPEG, PNG, WEBP, TIFF` },
      { status: 415 }
    );
  }

  const material = (form.get('material') as string) || 'modern_handwriting';
  const tier = (form.get('tier') as string) || 'regular';
  const pageLabel = (form.get('page_label') as string) || null;
  const bookId = (form.get('book_id') as string) || null;
  const chapterRef = (form.get('chapter_ref') as string) || null;

  if (!VALID_MATERIAL.includes(material as HtrMaterial)) {
    return NextResponse.json({ error: `סוג חומר לא חוקי: ${material}` }, { status: 400 });
  }
  if (!VALID_TIER.includes(tier as HtrTier)) {
    return NextResponse.json({ error: `רמת מנוי לא חוקית: ${tier}` }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // העלאת הקובץ ל-Storage תחת נתיב ייחודי
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(HTR_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

  if (uploadErr) {
    return NextResponse.json(
      { error: 'העלאת התמונה ל-Storage נכשלה', detail: uploadErr.message },
      { status: 502 }
    );
  }

  // יצירת job
  const { data: job, error: insertErr } = await supabase
    .from('htr_jobs')
    .insert({
      image_url: objectPath,
      image_bucket: HTR_BUCKET,
      page_label: pageLabel,
      material,
      tier,
      status: 'uploaded',
      book_id: bookId,
      chapter_ref: chapterRef
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: 'יצירת ה-job נכשלה', detail: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ job }, { status: 201 });
}
