import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-blue to-brand-dark text-white">
      {/* כפתור הכניסה המשותף של more30 יושב `fixed` בפינה השמאלית העליונה
          (הקצה האינליין-סופי ב-RTL), ושם `justify-between` מניח את
          "התחברות". נמדד ב-390px אחרי שהכפתור נוסף למערכת הזו: חפיפה 54×4
          והלחיצה מגיעה לכדור. `--more30-auth-inset` הוא הרוחב שהכדור
          מפרסם בפועל; החיסור מקזז את השוליים שה-container כבר נותן. */}
      <header
        className="container mx-auto px-6 py-6 flex items-center justify-between"
        style={{
          paddingInlineEnd:
            'max(1.5rem, calc(var(--more30-auth-inset, 124px) - max(0px, (100vw - 1400px) / 2)))',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-gold/20 flex items-center justify-center">
            <span className="text-brand-gold font-serif font-bold text-xl">א</span>
          </div>
          <div>
            <div className="font-serif text-lg font-bold leading-tight">איגוד השיעורים</div>
            <div className="text-xs text-brand-gold/90">יוצר מודעות AI</div>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/create" className="inline-block py-1 hover:text-brand-gold transition">צור מודעה</Link>
          <Link href="/transcribe/upload" className="inline-block py-1 hover:text-brand-gold transition">תמלול שיעור</Link>
          <Link href="/login" className="inline-block py-1 hover:text-brand-gold transition">התחברות</Link>
        </nav>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <p className="text-brand-gold font-semibold tracking-wider mb-4">מבית איגוד השיעורים</p>
        <h1 className="font-serif text-5xl md:text-6xl font-bold leading-tight mb-6">
          מודעות מקצועיות לשיעורי תורה
          <br />
          <span className="text-brand-gold">ביצירת בינה מלאכותית</span>
        </h1>
        <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-10">
          בנו תוך דקות מודעה מעוצבת לשיעור, גמ"ח, בית כנסת או אירוע — ללא ידע בעיצוב, בעברית מלאה, בכבוד הראוי.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/create" className="btn-gold">התחילו כאן</Link>
          <Link href="#how" className="btn-outline border-white text-white hover:bg-surface hover:text-brand-blue">איך זה עובד</Link>
        </div>
      </section>

      <section id="how" className="bg-brand-cream text-brand-dark py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-12">איך זה עובד</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { n: "1", t: "מזינים פרטים", d: "שם הרב, שם השיעור, יום, שעה, מקום, ופלטת צבעים." },
              { n: "2", t: "AI מייצר 3 ווריאציות", d: "המערכת בונה שלוש אפשרויות עיצוב — בוחרים את המוצלחת." },
              { n: "3", t: "מורידים PNG / PDF / WhatsApp", d: "ברזולוציה גבוהה להדפסה ולשליחה ברשת." },
            ].map((s) => (
              <div key={s.n} className="card">
                <div className="w-12 h-12 rounded-full bg-brand-goldsurface text-brand-dark font-bold text-xl flex items-center justify-center mb-4">{s.n}</div>
                <h3 className="font-serif text-xl font-bold mb-2">{s.t}</h3>
                <p className="text-gray-700 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">מערכות נוספות מבית איגוד השיעורים</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-8">
          <a href="https://igud-shiurim.org" className="card text-brand-dark hover:shadow-md transition text-right block">
            <div className="font-serif font-bold text-lg mb-1">פלטפורמת השיעורים</div>
            <div className="text-sm text-gray-600">חיפוש שיעורים, ניהול לומדים ותרומות</div>
          </a>
          <a href="https://transcribe.igud-shiurim.org" className="card text-brand-dark hover:shadow-md transition text-right block">
            <div className="font-serif font-bold text-lg mb-1">תמלול שיעורים</div>
            <div className="text-sm text-gray-600">מקובץ שמע ל-3 קבצי Word ערוכים</div>
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 mt-10 py-8 text-center text-white/70 text-sm">
        © איגוד השיעורים · 02-3131600 · a023131600@gmail.com
      </footer>
    </main>
  );
}
