'use client';

import { useState } from 'react';
import type { PropertyReport } from '@/lib/buildreport';
import { apiUrl } from '@/lib/basepath';

/**
 * P2 FEATURE (core.projects #33, build_tasks id=4/11) · "TABU workflow" §1-2:
 * checkbox+grade בדוח ה-VIP → משימת ניהול + מייל(גוש/חלקה). VIP בלבד — אותו
 * שער בדיוק כמו `VipPanel`/`PropertyImagery` (§2 במפרט).
 *
 * ⚠️ הפאנל הזה **כותב** בלבד (`POST /api/tabu-request`) ולעולם לא קורא נתוני
 * טאבו קיימים: לנסח יש שמות בעלים ומשכנתאות אמיתיים, ואין להם מסלול ציבורי
 * (ראה ההערה ב-`lib/tabudoc.ts`). דף הדוח עצמו ציבורי/משותף (גם הקישור הקבוע
 * ב-`/p/[slug]` נגזר דטרמיניסטית מהכתובת, לא סוד אישי) — כך שהצגת נתוני נסח
 * *כאן* הייתה חושפת אותם לכל מי שיודע/מנחש את הכתובת. הנסח המנותח מגיע ללקוח
 * רק בערוץ הסגור: המייל שנשלח לכתובת שהוא עצמו הזין (`reportEmailHtml` כבר
 * מצרף את `tabuBlock`, ראה `lib/reporthtml.ts`).
 */
export default function TabuRequestPanel({ report }: { report: PropertyReport }) {
  const gush = report.title.gush;
  const helka = report.building.registeredHelka ?? report.title.helka;
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState<'normal' | 'urgent'>('normal');
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  if (!gush || !helka) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setMsg('');
    try {
      const res = await fetch(apiUrl('/api/tabu-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gush,
          helka,
          tatHelka: report.unit?.tatHelka ?? report.propertyInput?.tatHelka ?? null,
          entrance: report.propertyInput?.entrance ?? null,
          apartment: report.propertyInput?.apartment ?? null,
          address: report.title.streetDisplay
            ? `${report.title.streetDisplay} ${report.title.houseNumber ?? ''}`.trim()
            : null,
          city: report.title.city,
          assetType: report.assetType,
          grade,
          requesterName: form.name,
          requesterEmail: form.email,
          requesterPhone: form.phone,
          notes: form.notes,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'שגיאה');
      setState('done');
    } catch (err: any) {
      setState('error');
      setMsg(String(err?.message ?? err));
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
        <div className="text-lg font-black text-[#1a9e6a]">הבקשה נקלטה ✓</div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          נזמין את הנסח הרשמי מרשם המקרקעין עבור גוש {gush} חלקה {helka}, ונשלח אליך במייל את
          הניתוח המשפטי המלא ברגע שהוא מוכן.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="mt-1 h-4 w-4 accent-teal"
        />
        <span>
          <span className="block text-[15px] font-black text-navy">בקשה להפקת נסח טאבו רשמי</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
            אין API ציבורי לנסח טאבו — נזמין אותו ידנית מרשם המקרקעין עבור גוש {gush} חלקה {helka},
            ונשלח אליך במייל ניתוח משפטי (בעלות, משכנתאות, הערות אזהרה) ברגע שהוא מוכן.
          </span>
        </span>
      </label>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-ink sm:col-span-2">
            עדיפות
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value === 'urgent' ? 'urgent' : 'normal')}
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal sm:w-auto"
            >
              <option value="normal">רגילה</option>
              <option value="urgent">דחופה</option>
            </select>
          </label>
          <label className="text-[12px] font-semibold text-ink">
            שם מלא
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal"
            />
          </label>
          <label className="text-[12px] font-semibold text-ink">
            אימייל *
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal"
            />
          </label>
          <label className="text-[12px] font-semibold text-ink">
            טלפון
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal"
            />
          </label>
          <label className="text-[12px] font-semibold text-ink">
            הערות
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-teal"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={state === 'sending'}
              className="rounded-xl bg-teal px-6 py-2 text-[13px] font-bold text-white hover:bg-tealD disabled:opacity-60"
            >
              {state === 'sending' ? 'שולח…' : 'שליחת הבקשה'}
            </button>
          </div>
          {state === 'error' && <p className="text-[13px] text-[#d6455b] sm:col-span-2">{msg}</p>}
        </form>
      )}
    </div>
  );
}
