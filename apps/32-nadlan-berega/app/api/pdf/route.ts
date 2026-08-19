// PDF להורדה — לא הדפסה.
//
// `window.print()` פותח את תיבת ההדפסה ומשאיר ללקוח לבחור "שמור כ-PDF". כאן
// השרת מרנדר את הדוח ומחזיר קובץ עם `Content-Disposition: attachment`, כך
// שהלחיצה מורידה קובץ מעוצב ישירות.

import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser } from '@/lib/browser';
import { BASE_PATH } from '@/lib/basepath';
import { logExport } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// רינדור דוח מלא בתוך דפדפן — ארוך יותר מהפקת הדוח עצמה.
export const maxDuration = 300;

/** שם קובץ בטוח: עברית מותרת, תווים ששוברים כותרת HTTP לא. */
function safeFileName(q: string): string {
  const clean = q.replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || 'דוח';
  return `נדלן-ברגע — ${clean}.pdf`;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const tier = req.nextUrl.searchParams.get('tier')?.trim() || 'basic';
  if (!q) {
    return NextResponse.json({ error: 'לא הוזנה כתובת.' }, { status: 400 });
  }

  // הכתובת שאותה מרנדרים — אותו origin, כולל קידומת הנתיב.
  const target = new URL(`${BASE_PATH}/report`, req.nextUrl.origin);
  target.searchParams.set('q', q);
  target.searchParams.set('tier', tier);
  for (const k of ['type', 'entrance', 'floor', 'rooms']) {
    const v = req.nextUrl.searchParams.get(k);
    if (v) target.searchParams.set(k, v);
  }

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // ⚠️ הדוח נטען בצד הלקוח אחרי קריאת רשת. `networkidle0` לבדו הסתיים לפעמים
    // לפני שהמקטעים צוירו, ולכן ממתינים גם לעוגן שמופיע רק בדוח מוכן.
    await page.goto(target.toString(), { waitUntil: 'networkidle0', timeout: 240_000 });
    await page.waitForSelector('[data-cat]', { timeout: 240_000 });

    // גיליון ההדפסה הקיים כבר מסתיר ניווט וכפתורים.
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#64748b;padding:0 10mm;' +
        'display:flex;justify-content:space-between;direction:rtl">' +
        '<span>נדל"ן ברגע — עולם הסטארטאפים</span>' +
        '<span class="pageNumber"></span>/<span class="totalPages"></span>' +
        '</div>',
    });

    // לוג ההורדה — כדי ש-report_exports ישקף שימוש אמיתי בפיצ'ר, לא רק שהוא קיים.
    // לא חוסם את התגובה: logExport בולעת שגיאות שלה.
    await logExport(q, `pdf_${tier}`, []);

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        // filename* עם UTF-8 — שם קובץ בעברית נשבר ב-filename רגיל.
        'Content-Disposition': `attachment; filename="report.pdf"; filename*=UTF-8''${encodeURIComponent(
          safeFileName(q),
        )}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'לא הצלחנו להפיק את קובץ ה-PDF.', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  } finally {
    await browser?.close().catch(() => null);
  }
}
