import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="container-rtl py-16">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-serif font-bold text-brand-blue mb-3">
            ההקלטה התקבלה בהצלחה
          </h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            השיעור נכנס לתור התמלול. התהליך כולל זיהוי דיבור על ידי Whisper, עריכה ספרותית
            ובניית 3 קבצי DOCX מוכנים להדפסה.
            <br />
            הקבצים יישלחו אליך בדוא"ל בתוך מספר דקות עד שעות, בהתאם לאורך השיעור.
          </p>

          {searchParams.id && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 text-sm">
              <div className="text-slate-500">מספר עיבוד</div>
              <div className="font-mono text-brand-blue font-bold tracking-wider">
                {searchParams.id}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload" className="btn-outline">
              העלאה נוספת
            </Link>
            <Link href="/" className="btn-primary">
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
