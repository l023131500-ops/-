import ReportRequestForm from '@/components/ReportRequestForm';
import Link from 'next/link';

const CATEGORIES: [string, string][] = [
  ['הנכס', 'כתובת, גוש וחלקה, גודל ומחיר — מה בדיוק אתה קונה.'],
  ['הבניין והכניסה', 'כמה קומות, מתי נבנה, וכמה דירות נמכרו בו.'],
  ['עסקאות שנמכרו', 'מחירים שנסגרו בפועל, מהבניין עצמו והלאה.'],
  ['דירות מוצעות כרגע', 'מה מוצע היום באזור, וכמה זמן המודעות באוויר.'],
  ['היתרים, זכויות ומסמכים', 'אילו תוכניות חלות, מה הן מתירות, מי הוועדה ואיפה התקנון והתשריט.'],
  ['סביבה ומוסדות', 'כל מוסד בשמו ובמרחק המדויק ממנו.'],
  ['תחבורה', 'תחנות, קווים וזמני הליכה אמיתיים.'],
  ['פוטנציאל', 'התחדשות עירונית ותוכניות שעשויות לשנות את הערך.'],
];

/** ארבע זרימות הדוח — אותו מנוע נתונים, סעיף ייעודי לכל תחום. */
const FLOWS: [string, string][] = [
  ['מגורים', 'דירה או בית: מה נמכר כאן באמת, בבניין ובסביבה, ומה יש מסביב.'],
  ['שכירות', 'כמה עולה לשכור כאן, מול מדד שכר הדירה של הלמ"ס, ומה התשואה.'],
  ['מסחרי', 'משרד או חנות: זכויות מסחר ותעסוקה, עסקאות מסחריות וסביבה עסקית.'],
  ['קרקעות ומגרשים', 'ייעוד המגרש היום, מה בהליך שעשוי לשנות אותו, ומדיניות רמ"י.'],
];

/**
 * שלוש הרמות, בדיוק כפי שהן מסוננות במנוע (`tierAllows` ב-lib/report.ts).
 * כל שורה כאן מתארת יכולת שקיימת בפועל בדוח — אין כאן הבטחה בלי כיסוי.
 */
const TIERS: {
  key: string;
  title: string;
  sub: string;
  lines: string[];
  featured?: boolean;
}[] = [
  {
    key: 'basic',
    title: 'דוח חינמי',
    sub: 'הזיהוי של הנכס, והמפה',
    lines: [
      'כתובת מלאה, גוש, חלקה ותת-חלקה — בשני הכיוונים',
      'מפה אינטראקטיבית עם מיקום הנכס, כולל תצלום לוויין',
      'עסקאות אחרונות ומחיר ממוצע באזור',
      'מוסדות ותחנות מהמרשמים הפתוחים, לפי מרחק אווירי',
    ],
  },
  {
    key: 'premium',
    title: 'דוח פרימיום',
    sub: 'כל מה שידוע על הנכס',
    featured: true,
    lines: [
      'כל מה שבדוח החינמי',
      'כל העסקאות שנסגרו — ללא הגבלה — וגרף מגמת מחירים',
      'גיל הבניין, היתרים, תוכניות והתשריט התכנוני המוטמע',
      'רשימת המוסדות המלאה, עם זמני הליכה אמיתיים',
      'דירות שמוצעות למכירה כרגע, עם כמה זמן הן באוויר',
    ],
  },
  {
    key: 'vip',
    title: 'דוח VIP',
    sub: 'הכול, כולל צילום ומצגת',
    lines: [
      'כל מה שבדוח הפרימיום',
      'צילום הבניין — המצלמה מכוונת אל הבניין עצמו',
      'מפה אזורית מלאה ותצלום אוויר',
      'תשואת שכירות משוערת ונסח טאבו לפי דרישה',
      'מצגת להצגה מול לקוח, וגרסה מעוצבת להדפסה',
    ],
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="hero-gradient text-white">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-bold tracking-widest text-goldL">
            תעודת זהות דיגיטלית לכל נכס בישראל
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            כל מה שצריך לדעת על נכס — <span className="text-goldL">ברגע</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
            לפני שחותמים, כדאי לדעת מה באמת נמכר כאן, מה מותר לבנות, ומה עומד לקרות בסביבה.
            הכול ממקורות רשמיים, כל נתון עם המקור שלו — ומה שאין, כתוב שאין.
          </p>

          <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/15 bg-white/95 p-5 text-right shadow-2xl sm:p-7">
            <ReportRequestForm />
          </div>

          <div className="mt-4 text-sm opacity-80">
            גם שם רחוב ישן או מוכר-בפי-הבריות יביא אותך לנכס הנכון
          </div>

          <div className="mt-5 text-sm">
            <Link
              href="/order"
              className="inline-block rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 font-bold text-white transition hover:bg-white/20"
            >
              או שנשלח לך את הדוח המלא למייל ←
            </Link>
          </div>
        </div>
      </section>

      {/* ===== ארבעה תחומים ===== */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center text-2xl font-black text-navy">ארבעה תחומים, אותו עומק</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
            כל תחום מקבל את הסעיף שרלוונטי לו, ואת אותם מקורות רשמיים: מרשם העסקאות, מרשם
            החלקות ומנהל התכנון. סעיף ההיתרים והמסמכים מופיע בכל ארבעתם.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLOWS.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-line bg-surface p-5 shadow-card">
                <div className="text-lg font-extrabold text-navy">{t}</div>
                <div className="mt-1 text-sm leading-relaxed text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== מודל האספקה: דוח מלא במייל ===== */}
      <section className="border-b border-line bg-bgsoft">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-black text-navy">הדוח המלא נשלח למייל</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              איסוף הנתונים נעשה מול מרשם העסקאות של רשות המסים, מרשם החלקות, מנהל התכנון,
              לוח הזמנים הארצי של התחבורה הציבורית ולוחות המודעות. זה לוקח זמן, ולכן הדוח
              המלא נשלח במייל — מלא ומוכן.
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                'הזנת כתובת או גוש וחלקה, ומייל שאליו יישלח הדוח',
                'מוסיפים מספר כניסה, קומה ומספר חדרים — וזה מזהה את הדירה שלכם בתוך הבניין',
                'אם הופק נסח טאבו לנכס, הניתוח שלו מצורף לדוח לפי הדירה או הכניסה',
                'כל נתון בשורה נפרדת, עם המקור שלו ועם דרגת הוודאות שלו',
              ].map((l) => (
                <li key={l} className="flex gap-2.5 text-[14px] leading-relaxed text-ink">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/order"
              className="mt-6 inline-block rounded-xl bg-teal px-6 py-3 font-bold text-white hover:bg-tealD"
            >
              להזמנת דוח למייל ←
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <div className="text-[15px] font-black text-navy">מה נשלח בפועל</div>
            <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed">
              {[
                ['הנכס', 'גוש, חלקה, תת-חלקה, שטח, מחיר אחרון שנסגר בבניין ומחיר למ״ר'],
                ['הבניין', 'שנת בנייה, גיל, האם נבנה מחדש, קומות, וכמה דירות נמכרו בו'],
                ['עסקאות', 'כל מה שנמכר בבניין ובסביבה, מהקרוב והלאה, עם סימון חריגות'],
                ['סביבה', 'בתי כנסת, מקוואות, בתי ספר, גנים, מסחר ובריאות — בשם ובמטרים'],
                ['תחבורה', 'תחנות בטווח הליכה, והקווים שעוצרים בכל אחת'],
                ['פוטנציאל', 'התחדשות עירונית, ייעוד הקרקע והתוכניות שחלות על הנכס'],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-line/70 pb-2.5 last:border-0 last:pb-0">
                  <span className="font-bold text-navy">{k}:</span>{' '}
                  <span className="text-muted">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== שלוש הרמות ===== */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center text-2xl font-black text-navy">שלוש רמות של דוח</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
            אותה כתובת, שלושה עומקים. הדוח החינמי בנוי אך ורק ממקורות שאינם עולים לנו כסף —
            מרשם העסקאות, מרשם החלקות, מינהל התכנון ומפה פתוחה — ולכן הוא באמת חינמי, וגם
            מצומצם. מה שדורש משיכה בתשלום מופיע בפרימיום וב-VIP.
          </p>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.key}
                className={`flex flex-col rounded-2xl border-2 p-6 shadow-card ${
                  t.featured ? 'border-teal bg-teal/[0.06]' : 'border-line bg-surface'
                } ${t.key === 'vip' ? 'border-gold bg-gold/[0.07]' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div
                    className={`text-xl font-black ${
                      t.key === 'vip' ? 'text-[#8a6d24]' : t.featured ? 'text-tealD' : 'text-navy'
                    }`}
                  >
                    {t.key === 'vip' && '✦ '}
                    {t.title}
                  </div>
                  {t.featured && (
                    <span className="shrink-0 rounded-full bg-teal px-2.5 py-0.5 text-[11px] font-bold text-white">
                      הנפוץ ביותר
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[13px] font-semibold text-muted">{t.sub}</div>

                <ul className="mt-5 space-y-2.5">
                  {t.lines.map((l) => (
                    <li key={l} className="flex gap-2.5 text-[14px] leading-relaxed text-ink">
                      <span
                        aria-hidden
                        className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                          t.key === 'vip' ? 'bg-gold' : 'bg-teal'
                        }`}
                      />
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-2xl font-black text-navy">מה יש בדוח</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[15px] text-muted">
          שמונה קטגוריות, בכל רמה, ועוד סעיף ייעודי לתחום שבחרת — מה שמשתנה בין הרמות הוא
          כמה עומק יש בכל אחת.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-5 shadow-card">
              <div className="text-lg font-extrabold text-navy">{t}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted">{d}</div>
            </div>
          ))}
        </div>

        {/* ===== שמות רחוב כפולים ===== */}
        <div className="mt-10 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h3 className="text-lg font-black text-navy">לרחוב אחד יש לפעמים שני שמות</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            הרבה רחובות מוכרים בפי התושבים בשם אחד, ורשומים במרשם הרשמי בשם אחר — ומרשם
            העסקאות רושם דווקא לפי הכינוי. מי שמחפש רק לפי השם הרשמי מפספס חלק מהעסקאות,
            ולפעמים מגיע לגוש הלא נכון.
          </p>
          <div className="mt-4 rounded-xl border border-line bg-bgsoft px-4 py-3 text-[15px]">
            <span className="font-bold text-navy">דרך מרדכי</span>{' '}
            <span className="text-muted">(מוכר גם כרחוב אתרוג)</span>
            <span className="mx-2 text-line">|</span>
            <span className="text-[13px] text-muted">חצור הגלילית</span>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">
            אצלנו החיפוש מזהה את שני השמות ומגיע לאותו נכס, השוואת העסקאות נעשית מול{' '}
            <b>כל</b> שמות הרחוב, וכותרת הדוח מציגה את שניהם — כדי שתדע שזה אותו מקום. אותו
            דבר עובד גם על שמות שכונות ועל צמתים.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h3 className="text-lg font-black text-navy">איך אנחנו מציגים נתונים</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            לכל נתון בדוח יש מקור, ולכל נתון יש רמת ודאות:{' '}
            <b className="text-tealD">אמת</b> — נתון רשמי על הנכס עצמו;{' '}
            <b className="text-[#8a6d24]">מקורב</b> — נתון אמיתי על הסביבה, לא על הנכס;{' '}
            <b className="text-slate-600">הערכה</b> — חישוב שלנו.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            כשאין נתון, אנחנו כותבים למה אין אותו. אנחנו לא ממציאים ולא משלימים בניחוש.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/sources"
            className="inline-block py-1.5 text-sm font-bold text-tealD hover:underline"
          >
            מאיפה מגיעים הנתונים ←
          </Link>
        </div>
      </section>
    </div>
  );
}
