import Link from 'next/link';
import SavedReportView from '@/components/report/SavedReportView';
import { readSaved } from '@/lib/savedreports';

export const dynamic = 'force-dynamic';

/**
 * §8 · הקישור הקבוע של הנכס.
 *
 * מציג את הדוח **השמור** ולא מפיק אותו מחדש: זה מה שהופך את הקישור לקבוע
 * (אותו תוכן, גם אם מקור חיצוני נפל מאז), וזה גם מה שמונע חיוב חוזר על
 * מקורות בתשלום בכל פתיחה של הקישור.
 */
export default async function PermanentReportPage({ params }: { params: { slug: string } }) {
  const saved = await readSaved(params.slug);

  if (!saved) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-2xl font-black text-navy">הקישור הזה אינו מוכר לנו</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          ייתכן שהדוח טרם הופק, או שהקישור הועתק חלקית. אפשר להפיק דוח חדש לאותו נכס — הקישור
          שיתקבל יהיה זהה, כי הוא נגזר מזהות הנכס עצמו.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-teal px-6 py-3 font-bold text-white hover:bg-tealD"
        >
          להפקת דוח
        </Link>
      </div>
    );
  }

  return (
    <SavedReportView
      report={saved.report}
      slug={params.slug}
      updatedAt={saved.updatedAt}
      generations={saved.generations}
    />
  );
}
