import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="container-rtl py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-block rounded-full bg-sand px-3 py-1 text-sm font-medium text-brand">
                מבית איגוד השיעורים
              </p>
              <h1 className="font-display text-4xl font-bold leading-tight text-brand lg:text-5xl">
                תמלול שיעורי תורה<br />במקצועיות אמיתית
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink">
                העלו הקלטה של שיעור — אנחנו מתמללים בעברית, עורכים לפי מסלול ליטאי / חסידי / אידיש,
                מזהים מקורות ומפיקים שלושה קבצי Word מוכנים לשימוש.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/upload" className="btn-primary text-base">העלאת שיעור עכשיו</Link>
                <a href="#how" className="btn-outline text-base">איך זה עובד</a>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                * דרוש קוד קופון פעיל. ניתן לקבל קוד מהמערכת המרכזית של איגוד השיעורים.
              </p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-brandsurface to-brandsurface-dark p-8 text-white shadow-card">
              <h3 className="font-display text-2xl">מה תקבל בסוף?</h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                <li className="flex gap-3"><Dot /> <span><b>original.docx</b> — תמלול נאמן למקור 100%, ללא שום עריכה</span></li>
                <li className="flex gap-3"><Dot /> <span><b>edited.docx</b> — טקסט ערוך עם פיסוק, כותרות משנה והערות שוליים</span></li>
                <li className="flex gap-3"><Dot /> <span><b>sources.docx</b> — רשימת מקורות ממוספרת לבדיקה ידנית</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-stone-200 bg-surface py-16">
          <div className="container-rtl">
            <h2 className="font-display text-3xl font-bold text-brand">איך זה עובד?</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={i} className="card">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-brand-dark font-bold">{i + 1}</div>
                  <h3 className="font-display text-xl font-semibold text-brand">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Styles */}
        <section className="border-t border-stone-200 py-16">
          <div className="container-rtl">
            <h2 className="font-display text-3xl font-bold text-brand">שלושה מסלולי סגנון</h2>
            <p className="mt-2 max-w-2xl text-ink-muted">
              לכל מסלול מילון מונחים ייחודי והנחיות עריכה ספציפיות, כדי שהטקסט הערוך יישמע אותנטי לסגנון הדיבור.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STYLES.map((s) => (
                <div key={s.key} className="card border-r-4 border-accent">
                  <div className="font-display text-xl font-bold text-brand">{s.title}</div>
                  <p className="mt-2 text-sm text-ink-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-brandsurface py-10 text-white">
          <div className="container-rtl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-display text-lg font-bold">תמלול מבית איגוד השיעורים</div>
              <div className="text-sm text-white/70">© {new Date().getFullYear()} כל הזכויות שמורות.</div>
            </div>
            <div className="text-sm text-white/80">
              <span className="ml-4">טל: 02-3131600</span>
              <a href="mailto:a023131600@gmail.com" className="inline-block py-1 hover:text-accent">a023131600@gmail.com</a>
            </div>
          </div>
        </footer>
      </main>

      {/* מערכות נוספות */}
      <section className="bg-surface border-t border-gray-200 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-primary mb-6">מערכות נוספות מבית איגוד השיעורים</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <a href="https://igud-shiurim.org" target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-5 text-right hover:shadow-md transition">
              <div className="font-display font-bold text-lg mb-1 text-primary">פלטפורמת השיעורים</div>
              <div className="text-sm text-gray-600">חיפוש שיעורים, ניהול לומדים ותרומות</div>
            </a>
            <a href="https://ads.igud-shiurim.org" target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-5 text-right hover:shadow-md transition">
              <div className="font-display font-bold text-lg mb-1 text-primary">יוצר מודעות AI</div>
              <div className="text-sm text-gray-600">מודעות מקצועיות לשיעורי תורה ואירועים — בעברית מלאה</div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Dot() {
  return <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />;
}

const STEPS = [
  { title: "מקלידים קוד קופון", desc: "מזינים את קוד הקופון שקיבלתם ובוחרים מסלול סגנון (ליטאי/חסידי/אידיש)." },
  { title: "מעלים את ההקלטה", desc: "MP3, M4A, WAV — עד 200MB. הקובץ עולה בטוח לאחסון מוצפן." },
  { title: "מקבלים 3 קבצי Word", desc: "תוך דקות: תמלול גולמי, גרסה ערוכה עם הערות שוליים, ורשימת מקורות." }
];

const STYLES = [
  { key: "litvish", title: "ליטאי", desc: "סוגיה, פלפול, שיעור כללי, ראש ישיבה — לשון צחה וישיבתית." },
  { key: "chassidish", title: "חסידי", desc: "טיש, צדיק, דביקות, עבודה פנימית — חיות ועומק קבלי." },
  { key: "yiddish", title: "אידיש", desc: "מילים וביטויים באידיש נשמרים, עם תרגום בסוגריים בעת הצורך." }
];
