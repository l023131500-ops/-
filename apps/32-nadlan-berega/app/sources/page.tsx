import { SOURCE_LIST } from '@/lib/sources';

export const metadata = { title: 'מקורות ותמחור — נדל"ן ברגע' };

export default function SourcesPage() {
  const gov = SOURCE_LIST.filter((s) => s.category === 'ממשלתי');
  const com = SOURCE_LIST.filter((s) => s.category === 'מסחרי');

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-black text-navy">מקורות הנתונים והתמחור</h1>
      <p className="mt-2 max-w-3xl text-muted">
        שקיפות מלאה: כל מקור שהמערכת מצליבה, אם הוא חינמי או כרוך בתשלום, וזמינות ה-API שלו. מקורות
        בתשלום מסומנים גם בכרטיס הנכס עצמו, ומופקים רק לפי דרישה.
      </p>

      <SourceTable title="מקורות ממשלתיים" items={gov} />
      <SourceTable title="פלטפורמות מסחריות" items={com} />

      {/* מודל מנויים */}
      <h2 className="mt-12 text-2xl font-black text-navy">מודל מנויים</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <PlanCard
          name="חינם"
          price="0 ₪"
          features={['חיפוש כתובת', 'כרטיס נכס בסיסי', 'עסקאות אחרונות', 'מדד למ"ס']}
        />
        <PlanCard
          name="Pro — מתווכים ושמאים"
          price="בקרוב"
          highlight
          features={['תעודת זהות מלאה (7 שכבות)', 'היסטוריה רב-שנתית + גרפים', 'ייצוא PDF סלקטיבי', 'דו"ח איכות עסקה']}
        />
        <PlanCard
          name="עסקי / API"
          price="לפי שימוש"
          features={['גישה תוכניתית (API)', 'כמות מוגברת', 'אינטגרציות', 'תמיכה']}
        />
      </div>
      <p className="mt-4 text-xs text-muted">
        * נסחי טאבו ואישורי רמ"י בתשלום נפרד (pass-through) — נגבים לפי עלות ההפקה בפועל, רק כשהמשתמש מזמין.
      </p>
    </div>
  );
}

function SourceTable({ title, items }: { title: string; items: typeof SOURCE_LIST }) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-xl font-extrabold text-indigo">{title}</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-navysurface text-white">
              <th className="px-3 py-2.5">מקור</th>
              <th className="px-3 py-2.5">API</th>
              <th className="px-3 py-2.5">עלות</th>
              <th className="px-3 py-2.5">עדכניות</th>
              <th className="px-3 py-2.5">הערות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.key} className="border-b border-line/70 align-top">
                {/* עמוד ציבורי — השם הפונה ללקוח, לא השם הפנימי. */}
                <td className="px-3 py-2.5 font-semibold text-navy">
                  {s.publicName ?? s.displayName}
                </td>
                <td className="px-3 py-2.5">
                  {s.apiAvailable ? (
                    <span className="rounded-full bg-[#e6f6ee] px-2 py-0.5 text-xs font-bold text-[#1a9e6a]">זמין</span>
                  ) : (
                    <span className="rounded-full bg-[#fce8ec] px-2 py-0.5 text-xs font-bold text-[#d6455b]">אין</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {s.isPaid ? (
                    <span className="rounded-full bg-[#fbf1dc] px-2 py-0.5 text-xs font-bold text-[#d99a1a]">
                      {s.costIls || 'בתשלום'}
                    </span>
                  ) : (
                    <span className="text-[#1a9e6a]">חינם</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted">{s.refreshCadence}</td>
                <td className="px-3 py-2.5 text-xs text-muted">{s.publicNotes ?? s.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  features,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-card ${
        highlight ? 'border-teal bg-[#eef7f7]' : 'border-line bg-surface'
      }`}
    >
      <div className="text-lg font-black text-navy">{name}</div>
      <div className="mt-1 text-2xl font-black text-tealD">{price}</div>
      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
