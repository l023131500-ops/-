// המצגת כקובץ להורדה — A4 לרוחב, שקופית לעמוד.
//
// אותה מכונה של `/api/pdf`: דפדפן ללא ממשק מרנדר את המצגת האמיתית ומדפיס
// אותה. היתרון על פני בניית קובץ מצגת בספרייה הוא שאין כאן עותק שני של
// העיצוב שיכול להיפרד מהמסך — מה שנשלח ללקוח הוא בדיוק מה שהוא רואה.
//
// ⚠️ מרנדרים את `/present?print=1` ולא את `/present`: המצגת החיה מציגה
// שקופית אחת בכל רגע, והדפסה שלה כמו שהיא מפיקה קובץ בן עמוד אחד.

import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser } from '@/lib/browser';
import { BASE_PATH } from '@/lib/basepath';
import { logExport } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// המצגת מחכה לאותה קריאת `/api/report` שהדוח מחכה לה.
export const maxDuration = 300;

/** שם קובץ בטוח: עברית מותרת, תווים ששוברים כותרת HTTP לא. */
function safeFileName(q: string): string {
  const clean = q.replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || 'נכס';
  return `מצגת — ${clean}.pdf`;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) {
    return NextResponse.json({ error: 'לא הוזנה כתובת.' }, { status: 400 });
  }

  const target = new URL(`${BASE_PATH}/present`, req.nextUrl.origin);
  target.searchParams.set('q', q);
  target.searchParams.set('print', '1');
  // סוג הנכס עובר הלאה — אחרת מצגת של דוח שכירות הייתה מציגה את דוח המגורים.
  const type = req.nextUrl.searchParams.get('type');
  if (type) target.searchParams.set('type', type);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // ⚠️ `networkidle0` לבדו אינו מספיק: המצגת נבנית אחרי קריאת `/api/report`
    // בצד הלקוח, והעוגן הזה מופיע רק כשהשקופיות כבר צוירו.
    await page.goto(target.toString(), { waitUntil: 'networkidle0', timeout: 240_000 });
    await page.waitForSelector('[data-deck-ready]', { timeout: 240_000 });

    // ה-slug של הדוח שרונדר בפועל — כדי ש-report_exports ישויך לנכס הנכון
    // (ראה `data-permalink` ב-Presentation.tsx). best-effort בלבד.
    const slug = await page
      .$eval('[data-deck-ready]', (el) => el.getAttribute('data-permalink') || null)
      .catch(() => null);

    // תמונות המפה והצילום נטענות דרך `/api/image`. עמוד שהודפס לפני שהן
    // הגיעו מפיק שקופיות ריקות — ולכן ממתינים להשלמת כל אחת מהן.
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
        ),
      );
    });

    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      // הפריסה כבר מודדת את העמוד ב-mm; שוליים כאן היו דוחפים אותה החוצה.
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      preferCSSPageSize: true,
    });

    // לוג ההורדה — כדי ש-report_exports ישקף שימוש אמיתי בפיצ'ר, לא רק שהוא קיים.
    await logExport(slug, 'deck', []);

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        // filename* עם UTF-8 — שם קובץ בעברית נשבר ב-filename רגיל.
        'Content-Disposition': `attachment; filename="deck.pdf"; filename*=UTF-8''${encodeURIComponent(
          safeFileName(q),
        )}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'לא הצלחנו להפיק את קובץ המצגת.', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  } finally {
    await browser?.close().catch(() => null);
  }
}
