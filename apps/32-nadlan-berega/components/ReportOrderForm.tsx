'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import { TIER_LABEL } from '@/lib/report';
import type { ReportTier } from '@/lib/report';

/**
 * הטופס שהמפרט מגדיר: כתובת או גוש/חלקה + מייל, ושדות רשות כניסה / קומה /
 * מספר חדרים. הדוח נשלח למייל שמזינים — לא נפתח מיד באתר.
 *
 * ⚠️ שדות הרשות אינם קוסמטיים: הם מה שמאפשר לזהות את הדירה המסוימת בבניין
 * (תת-חלקה) ולשייך אליה נסח טאבו. הטופס אומר את זה במפורש, כי לקוח שלא ידע
 * למה זה חשוב פשוט ידלג.
 */
export default function ReportOrderForm({
  defaultQuery = '',
  defaultTier = 'premium',
  compact = false,
}: {
  defaultQuery?: string;
  defaultTier?: ReportTier;
  compact?: boolean;
}) {
  const [form, setForm] = useState({
    query: defaultQuery,
    email: '',
    full_name: '',
    phone: '',
    entrance: '',
    floor: '',
    rooms: '',
    notes: '',
  });
  const [tier, setTier] = useState<ReportTier>(defaultTier);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setMsg('');
    try {
      const res = await fetch(apiUrl('/api/report-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tier }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'שגיאה');
      setState('done');
      setMsg(j.message ?? '');
    } catch (err: any) {
      setState('error');
      setMsg(String(err?.message ?? err));
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-teal/40 bg-teal/[0.06] p-7 text-center shadow-card">
        <div className="text-xl font-black text-tealD">הבקשה נרשמה ✓</div>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink">
          הדוח על <b>{form.query}</b> יישלח לכתובת <b>{form.email}</b>.
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
          איסוף הנתונים ממקורות רשמיים לוקח זמן, ולכן הדוח נשלח במייל ולא נפתח מיד במסך.
          אם לא הגיע — כדאי לבדוק בתיקיית הספאם.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-surface p-6 text-right shadow-card"
    >
      {!compact && (
        <>
          <h2 className="text-xl font-black text-navy">קבלת הדוח למייל</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            הדוח נשלח לכתובת המייל שתזינו, אחרי שנאסוף את הנתונים מכל המקורות הרשמיים.
          </p>
        </>
      )}

      <div className="mt-4 grid gap-3">
        <label className="text-sm font-semibold text-ink">
          כתובת או גוש וחלקה <span className="text-red-600">*</span>
          <input
            required
            value={form.query}
            onChange={set('query')}
            placeholder='למשל: הבעל שם טוב 9 רחובות · או "גוש 3704 חלקה 331"'
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-teal"
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          כתובת מייל לשליחת הדוח <span className="text-red-600">*</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="name@example.com"
            dir="ltr"
            className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-teal"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">
            שם
            <input
              value={form.full_name}
              onChange={set('full_name')}
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            טלפון
            <input
              value={form.phone}
              onChange={set('phone')}
              dir="ltr"
              className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-teal"
            />
          </label>
        </div>
      </div>

      {/* ===== שדות הרשות, עם ההסבר למה כדאי למלא אותם ===== */}
      <div className="mt-5 rounded-xl border border-gold/40 bg-gold/[0.08] p-4">
        <div className="text-[14px] font-bold text-[#7a5f1f]">
          רוצים לברר על נכס מסוים? מומלץ להוסיף מספר כניסה, קומה ומספר חדרים.
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7a5f1f]">
          זה מה שמאפשר לנו לזהות את הדירה שלכם בתוך הבניין — ולא רק את הבניין — כולל
          מספר תת-החלקה שלה, שהוא המזהה שבו רשומה הדירה בטאבו.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-ink">
            מספר כניסה
            <input
              value={form.entrance}
              onChange={set('entrance')}
              placeholder="א / 1"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] font-normal outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            קומה
            <input
              value={form.floor}
              onChange={set('floor')}
              placeholder="שניה / 2"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] font-normal outline-none focus:border-teal"
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            מספר חדרים
            <input
              value={form.rooms}
              onChange={set('rooms')}
              placeholder="4"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-[15px] font-normal outline-none focus:border-teal"
            />
          </label>
        </div>
      </div>

      {/* ===== רמת הדוח ===== */}
      <div className="mt-5">
        <div className="text-sm font-semibold text-ink">רמת הדוח</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(['basic', 'premium', 'vip'] as ReportTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`rounded-xl border-2 px-4 py-2.5 text-right text-[14px] font-bold transition ${
                tier === t
                  ? t === 'vip'
                    ? 'border-gold bg-gold/15 text-[#8a6d24]'
                    : 'border-teal bg-teal/10 text-tealD'
                  : 'border-line bg-surface text-navy hover:border-teal/60'
              }`}
            >
              {t === 'vip' && '✦ '}
              דוח {TIER_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-sm font-semibold text-ink">
        משהו שכדאי שנדע
        <input
          value={form.notes}
          onChange={set('notes')}
          placeholder="למשל: מעניין אותי בעיקר פוטנציאל ההשבחה"
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-teal"
        />
      </label>

      {state === 'error' && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-5 w-full rounded-xl bg-teal px-6 py-3 text-[16px] font-bold text-white transition hover:bg-tealD disabled:opacity-60"
      >
        {state === 'sending' ? 'שולח…' : 'שלחו לי את הדוח למייל'}
      </button>
    </form>
  );
}
