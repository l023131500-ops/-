'use client';

import Link from 'next/link';
import ReportView from './ReportView';
import type { PropertyReport } from '@/lib/buildreport';

/**
 * §8 · תצוגת הדוח השמור מאחורי הקישור הקבוע.
 *
 * ⚠️ אין כאן הפקה מחדש. הדוח מוגש כפי שנשמר, עם התאריך שבו הופק — כדי
 * שהקישור יציג תמיד את אותו תוכן, וכדי שפתיחה שלו לא תחייב אותנו שוב על
 * מקורות בתשלום. מי שרוצה נתונים טריים לוחץ "הפק דוח מעודכן".
 */
export default function SavedReportView({
  report,
  slug,
  updatedAt,
  generations,
}: {
  report: PropertyReport;
  slug: string;
  updatedAt: string;
  generations: number;
}) {
  const when = new Date(updatedAt).toLocaleString('he-IL');
  const params = new URLSearchParams({ q: report.query, tier: report.tier });
  if (report.assetType !== 'residential') params.set('type', report.assetType);
  // §8 · המלצה 5 — לחיצה מפורשת על "מעודכן" חייבת לעקוף את מטמון ההפקה-
  // החוזרת-קצרת-הטווח שנוסף ל-`/api/report`, אחרת הכפתור הזה עלול להחזיר
  // בשקט עותק בן כמה שעות במקום הפקה אמיתית חדשה.
  params.set('refresh', '1');

  return (
    <ReportView
      q={report.query}
      tier={report.tier}
      assetType={report.assetType}
      preloaded={report}
      preloadedSlug={slug}
      savedNote={
        <div className="mt-6 rounded-2xl border border-line bg-bgsoft p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13.5px] leading-relaxed text-ink">
              <b className="text-navy">דוח שמור.</b> זהו הקישור הקבוע של הנכס. התוכן שמוצג כאן
              הופק ב-{when}
              {generations > 1 ? ` (הפקה מספר ${generations} לנכס הזה)` : ''} ואינו משתנה מאליו.
            </div>
            <Link
              href={`/report?${params.toString()}`}
              className="shrink-0 rounded-xl bg-teal px-5 py-2.5 text-[14px] font-bold text-white hover:bg-tealD"
            >
              הפק דוח מעודכן
            </Link>
          </div>
          <div className="mt-2 text-[11.5px] text-muted">מזהה: {slug}</div>
        </div>
      }
    />
  );
}
