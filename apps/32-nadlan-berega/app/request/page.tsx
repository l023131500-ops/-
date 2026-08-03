import RequestForm from '@/components/RequestForm';
import Link from 'next/link';

export const metadata = { title: 'בקשת מסמך — נדל"ן ברגע' };

export default function RequestPage({
  searchParams,
}: {
  searchParams: { docType?: string; address?: string; gush?: string; helka?: string };
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-3xl font-black text-navy">בקשת מסמך / הזמנה</h1>
      <p className="mt-2 text-muted">
        מסמכים ממקורות בתשלום/סגורים (טאבו, רמ"י, היתרי בנייה) אינם נשלפים אוטומטית. השאר פרטים ונטפל
        בהפקה, או הזמן ישירות בקישור הרשמי.
      </p>
      <div className="mt-6">
        <RequestForm
          docType={searchParams.docType || 'tabu'}
          address={searchParams.address || ''}
          gush={searchParams.gush || ''}
          helka={searchParams.helka || ''}
        />
      </div>
      <Link href="/" className="mt-6 inline-block text-sm text-tealD hover:underline">← חזרה לדף הבית</Link>
    </div>
  );
}
