'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/basepath';

const DOC_LABELS: Record<string, string> = {
  tabu: 'נסח טאבו',
  rami: 'אישור זכויות רמ"י',
  permit: 'מידע היתרי בנייה / חריגות',
  other: 'מסמך אחר',
};

const OFFICIAL_LINKS: Record<string, { label: string; url: string }> = {
  tabu: { label: 'הזמנה רשמית באתר רשות רישום המקרקעין', url: 'https://www.gov.il/he/service/land_registration_extract' },
  rami: { label: 'רמ"י — בקשה לאישור זכויות', url: 'https://www.gov.il/he/service/rights-approval-request' },
  permit: { label: 'פורטל רישוי זמין', url: 'https://www.gov.il/he/service/building_permit' },
  other: { label: 'שירותי מקרקעין — gov.il', url: 'https://www.gov.il' },
};

export default function RequestForm({
  docType = 'tabu',
  address = '',
  gush = '',
  helka = '',
}: {
  docType?: string;
  address?: string;
  gush?: string;
  helka?: string;
}) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', notes: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const link = OFFICIAL_LINKS[docType] ?? OFFICIAL_LINKS.other;
  const label = DOC_LABELS[docType] ?? DOC_LABELS.other;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setMsg('');
    try {
      const res = await fetch(apiUrl('/api/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_type: docType, address, gush, helka, ...form }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'שגיאה');
      setState('done');
    } catch (e: any) {
      setState('error');
      setMsg(String(e.message ?? e));
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center shadow-card">
        <div className="text-xl font-black text-[#1a9e6a]">הבקשה נשמרה ✓</div>
        <p className="mt-2 text-muted">ניצור קשר להשלמת הפקת {label}. אפשר גם להזמין ישירות:</p>
        <a href={link.url} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg bg-navy px-5 py-2 font-bold text-white">
          {link.label} ←
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 rounded-lg bg-[#eef7f7] p-3 text-sm">
        סוג מסמך: <b>{label}</b>
        {address ? <> · {address}</> : null}
        {gush ? <> · גוש {gush} חלקה {helka}</> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">שם מלא*
          <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal" />
        </label>
        <label className="text-sm">טלפון
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal" />
        </label>
        <label className="text-sm">אימייל
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal" />
        </label>
        <label className="text-sm">הערות
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-teal" />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">* נדרש שם + אימייל או טלפון.</p>

      {state === 'error' && <p className="mt-2 text-sm text-[#d6455b]">{msg}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === 'sending'}
          className="rounded-lg bg-teal px-6 py-2 font-bold text-white hover:bg-tealD disabled:opacity-60">
          {state === 'sending' ? 'שולח…' : 'שלח בקשה'}
        </button>
        <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-tealD hover:underline">
          או להזמנה ישירה באתר הרשמי ←
        </a>
      </div>
    </form>
  );
}
