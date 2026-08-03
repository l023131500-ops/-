import PropertyIdCard from '@/components/PropertyIdCard';
import SearchBar from '@/components/SearchBar';
import Link from 'next/link';

export default function PropertyPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || '').trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="text-xl font-black text-navy">לא הוזנה כתובת</div>
        <p className="mt-2 text-muted">הקלד כתובת כדי להפיק תעודת זהות לנכס.</p>
        <div className="mt-6">
          <SearchBar />
        </div>
        <Link href="/" className="mt-4 inline-block text-sm text-tealD hover:underline">
          ← חזרה לדף הבית
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-5xl px-5 pt-6 print:hidden">
        <SearchBar initial={q} />
      </div>
      <PropertyIdCard q={q} />
    </div>
  );
}
