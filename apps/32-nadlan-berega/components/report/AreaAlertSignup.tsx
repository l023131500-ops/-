'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/basepath';

/**
 * §"התראות על עסקאות חדשות באזור/רחוב" (more30-feature-expansion.md, נדל"ן).
 * שלב א: קליטת הרשמה אמיתית לטבלת nadlan.area_alerts. משלוח ההתראות עצמו
 * (בדיקה תקופתית + מייל) הוא שלב המשך נפרד — ראה NEEDS_USER.md.
 */
export default function AreaAlertSignup({
  address,
  city,
  gush,
  helka,
}: {
  address?: string | null;
  city?: string | null;
  gush?: string | null;
  helka?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const areaLabel = address || city || 'האזור הזה';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setMsg('');
    try {
      const res = await fetch(apiUrl('/api/area-alert'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, address, city, gush, helka }),
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
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
        <div className="text-lg font-black text-[#1a9e6a]">נרשמת בהצלחה ✓</div>
        <p className="mt-1 text-[13px] text-muted">
          נעדכן אותך במייל כשתתפרסם עסקה חדשה או תוכנית בנייה/תב"ע חדשה ב{areaLabel}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h3 className="text-lg font-black text-navy">התראה על עסקאות ותוכניות בנייה</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        השאירו אימייל ונעדכן אתכם כשתתפרסם עסקה חדשה או תוכנית בנייה/תב"ע חדשה ב{areaLabel}.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="האימייל שלך"
          className="min-w-[220px] flex-1 rounded-lg border border-line px-3 py-2 text-[14px] outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-lg bg-teal px-6 py-2 font-bold text-white hover:bg-tealD disabled:opacity-60"
        >
          {state === 'sending' ? 'נרשם…' : 'הרשמה להתראות'}
        </button>
      </form>
      {state === 'error' && <p className="mt-2 text-[13px] text-[#d6455b]">{msg}</p>}
    </div>
  );
}
