import ReportView from '@/components/report/ReportView';
import SearchBar from '@/components/SearchBar';
import type { ReportTier } from '@/lib/report';
import { isAssetType } from '@/lib/assettype';
import { parseLayers } from '@/lib/datalayers';

export const dynamic = 'force-dynamic';

export default function ReportPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    tier?: string;
    type?: string;
    entrance?: string;
    floor?: string;
    rooms?: string;
    /**
     * תת-חלקה ומספר דירה.
     *
     * ⚠️ שניהם היו נתמכים בכל מקום **חוץ** מכאן: `PropertyInput` מכיר אותם,
     * `tabu.ts` משייך לפיהם נסח לדירה הנכונה, `requests.ts` מדרג לפיהם התאמה,
     * ו-`savedreports.ts` בונה מהם את מפתח הקישור הקבוע. רק עמוד הדוח המיידי
     * לא קרא אותם מהכתובת, ולכן הם מעולם לא הגיעו למנוע.
     *
     * לזה הייתה תוצאה שקטה: מפתח הדוח השמור נבנה בלי דירה, ולכן **שתי דירות
     * שונות באותו בניין נשמרו לאותו קישור קבוע** — הדוח השני דרס את הראשון.
     */
    tatHelka?: string;
    apartment?: string;
    /** §1 · אילו שכבות מידע נבחרו בעמוד התדמית. חסר → הכול. */
    include?: string;
    /** §8 · המלצה 5 — עוקף את מטמון הפקה-חוזרת-קצרת-טווח, ראה `/api/report`. */
    refresh?: string;
  };
}) {
  const q = (searchParams.q ?? '').trim();
  const tier = (['basic', 'premium', 'vip'].includes(searchParams.tier ?? '')
    ? searchParams.tier
    : 'basic') as ReportTier;
  const assetType = isAssetType(searchParams.type) ? searchParams.type : 'residential';
  const layers = parseLayers(searchParams.include);
  const refresh = searchParams.refresh === '1';
  const input = {
    entrance: searchParams.entrance?.trim() || '',
    floor: searchParams.floor?.trim() || '',
    rooms: searchParams.rooms?.trim() || '',
    tatHelka: searchParams.tatHelka?.trim() || '',
    apartment: searchParams.apartment?.trim() || '',
  };

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-2xl font-black text-navy">מה תרצה לבדוק?</h1>
        <p className="mt-2 text-muted">הקלד כתובת מלאה, או גוש וחלקה.</p>
        <div className="mt-6">
          <SearchBar big initialType={assetType} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-5 pt-5 print:hidden">
        {/* בעמוד התוצאות בוחרים את סוג הנכס בכפתורים שמעל הדוח עצמו — שתי
            שורות כפתורים זהות באותו מסך רק היו מבלבלות. */}
        <SearchBar initial={q} initialType={assetType} showTypes={false} />
      </div>
      <ReportView q={q} tier={tier} assetType={assetType} input={input} layers={layers} refresh={refresh} />
    </>
  );
}
