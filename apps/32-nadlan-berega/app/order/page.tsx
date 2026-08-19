import ReportOrderForm from '@/components/ReportOrderForm';
import type { ReportTier } from '@/lib/report';

export const metadata = { title: 'הזמנת דוח למייל — נדל״ן ברגע' };

const TIERS: ReportTier[] = ['basic', 'premium', 'vip'];

export default function OrderPage({
  searchParams,
}: {
  searchParams: { q?: string; tier?: string };
}) {
  const tier = TIERS.includes(searchParams.tier as ReportTier)
    ? (searchParams.tier as ReportTier)
    : 'premium';

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-black text-navy">הדוח נשלח למייל</h1>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
          איסוף הנתונים נעשה מול מרשם העסקאות, מרשם החלקות, מנהל התכנון, לוח הזמנים הארצי
          של התחבורה הציבורית ולוחות המודעות. זה לוקח זמן — ולכן הדוח נשלח אליכם במייל,
          מלא ומוכן, ולא נפתח חצי-אפוי במסך.
        </p>
      </header>

      <div className="mt-8">
        <ReportOrderForm defaultQuery={searchParams.q ?? ''} defaultTier={tier} />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-[13px] leading-relaxed text-muted shadow-card">
        <div className="text-[15px] font-black text-navy">מה קורה אחרי שתשלחו</div>
        <ol className="mt-2 list-decimal space-y-1 pr-5">
          <li>הבקשה נרשמת ומופיעה מיד בלוח הניהול שלנו.</li>
          <li>הדוח מופק — כל נתון נשלף מהמקור שלו, עם דרגת הוודאות שלו.</li>
          <li>אם הוזמן נסח טאבו לנכס, הניתוח שלו מצורף לדוח לפי הדירה או הכניסה.</li>
          <li>הדוח נשלח לכתובת המייל שהזנתם.</li>
        </ol>
        <p className="mt-3">
          נתון שלא נמצא במקור לא מומצא — במקומו כתוב למה הוא חסר ואיפה כן אפשר להשיג אותו.
        </p>
      </div>
    </div>
  );
}
