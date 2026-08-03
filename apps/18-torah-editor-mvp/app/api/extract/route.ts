// ==== חילוץ טקסט מקובץ שהועלה ====
//
// זהו הצד השרתי של "אזור העלאת ספר/קובץ". קבצי טקסט (.txt/.md) נקראים
// בדפדפן ואינם מגיעים לכאן כלל; המסלול הזה קיים בשביל **.docx**, שהוא
// ארכיון ZIP ואי אפשר לקרוא אותו כטקסט.
//
// ⚠️ מה שהמסלול הזה **אינו** עושה: הוא אינו שומר את הקובץ ואינו כותב למסד.
// הוא מקבל קובץ ומחזיר טקסט. השמירה נעשית בדפדפן, מול ההאב, עם הסשן של
// המשתמש ותחת RLS — כך שאין כאן נתיב שכותב נתוני משתמש בלי הרשאה.
//
// ⚠️ PDF אינו נתמך כאן במכוון. PDF תורני הוא כמעט תמיד סריקה, כלומר תמונה,
// והחילוץ ממנו הוא זיהוי כתב — וזה בדיוק מודול ה-HTR. להחזיר "אין טקסט"
// על PDF סרוק היה נקרא כתקלה.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** תקרה שמרנית: ספר שלם כטקסט שוקל פחות מזה בהרבה. */
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'לא התקבל קובץ.' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'לא התקבל קובץ.' }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `הקובץ גדול מ-${Math.round(MAX_BYTES / 1024 / 1024)}MB. אפשר לפצל אותו לחלקים.` },
      { status: 413 },
    );
  }

  const name = file.name || 'קובץ';
  const lower = name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    if (lower.endsWith('.docx')) {
      // mammoth מיובא דינמית כדי שהוא לא ייכנס לבאנדל של מסלולים אחרים.
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: buf });
      const text = normalize(value);
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'הקובץ נקרא, אבל לא נמצא בו טקסט. ייתכן שהוא מכיל תמונות בלבד — במקרה כזה מודול המרת כתב היד הוא הכלי הנכון.' },
          { status: 422 },
        );
      }
      return NextResponse.json({ text, name, kind: 'docx' });
    }

    if (lower.endsWith('.doc')) {
      return NextResponse.json(
        { error: 'קובץ ‎.doc‎ הוא פורמט ישן שאינו ניתן לקריאה אמינה. יש לשמור אותו כ-‎.docx‎ ולנסות שוב.' },
        { status: 415 },
      );
    }

    if (lower.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'קובצי PDF תורניים הם כמעט תמיד סריקות, כלומר תמונות. להמרה שלהם יש מודול ייעודי — "המרת כתב יד".' },
        { status: 415 },
      );
    }

    // ברירת מחדל: טקסט. UTF-8, ואם הוא לא תקין — נופלים ל-windows-1255,
    // שהוא הקידוד שבו נשמרים קובצי טקסט עבריים ישנים.
    let text = normalize(buf.toString('utf8'));
    if (text.includes('�')) {
      try {
        text = normalize(new TextDecoder('windows-1255').decode(buf));
      } catch {
        /* נשארים עם מה שיש */
      }
    }
    if (!text.trim()) return NextResponse.json({ error: 'הקובץ ריק.' }, { status: 422 });
    return NextResponse.json({ text, name, kind: 'text' });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'לא הצלחנו לקרוא את הקובץ.', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

/** BOM, סופי שורה של חלונות, ורצף שורות ריקות ארוך. */
function normalize(s: string): string {
  return (s || '')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
