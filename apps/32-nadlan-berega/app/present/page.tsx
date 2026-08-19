import Presentation from '@/components/report/Presentation';
import { isAssetType } from '@/lib/assettype';

export const dynamic = 'force-dynamic';

export default function PresentPage({
  searchParams,
}: {
  searchParams: { q?: string; print?: string; type?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  // `print=1` — פריסת כל השקופיות לקובץ. משמש את `/api/deck`.
  const print = searchParams.print === '1';
  const assetType = isAssetType(searchParams.type) ? searchParams.type : 'residential';
  if (!q) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-navy">
        <h1 className="text-2xl font-black">אין נכס להצגה</h1>
        <p className="mt-2 text-muted">חזור לדוח ולחץ על "פתח מצגת".</p>
      </div>
    );
  }
  return <Presentation q={q} print={print} assetType={assetType} />;
}
