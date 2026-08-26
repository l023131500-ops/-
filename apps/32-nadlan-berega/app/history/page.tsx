'use client';

// build_tasks id=6 חלק (c) · "ההיסטוריה שלי" — היכולת הנוספת מאחורי הכניסה
// הקיימת, בלי לגעת ב-/report/[slug] הציבורי. ראו apps/32-nadlan-berega/
// CLAUDE.md (session 9) להסבר המלא למה חלק (c) לא ננעל על הנתיב הציבורי עצמו.

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';
import { sessionToken, authLinks } from '@/lib/session';

interface HistoryEntry {
  slug: string;
  viewedAt: string;
  headline: string | null;
  city: string | null;
  street: string | null;
  houseNum: string | null;
  gush: string | null;
  helka: string | null;
}

function labelOf(e: HistoryEntry): string {
  if (e.headline) return e.headline;
  if (e.gush && e.helka) return `גוש ${e.gush} חלקה ${e.helka}`;
  return [e.street, e.houseNum, e.city].filter(Boolean).join(' ') || e.slug;
}

export default function HistoryPage() {
  const [state, setState] = useState<'loading' | 'signed-out' | 'ready' | 'error'>('loading');
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const token = sessionToken();
    if (!token) {
      setState('signed-out');
      return;
    }
    fetch(apiUrl('/api/history'), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setItems(d.items ?? []);
        setState('ready');
      })
      .catch((code) => setState(code === 401 ? 'signed-out' : 'error'));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-3xl font-black text-navy">ההיסטוריה שלי</h1>
      <p className="mt-2 max-w-2xl text-muted">
        כל דוח נכס שצפית בו כשהיית מחובר לחשבון more30, כדי לחזור אליו בקלות. הדוח החינמי-בלי-הרשמה
        עצמו נשאר פתוח לכולם כרגיל — זו רק רשימה אישית נוספת למי שמחובר.
      </p>

      {state === 'loading' && <p className="mt-8 text-muted">טוען…</p>}

      {state === 'signed-out' && (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
          <p className="text-ink">כדי לראות את ההיסטוריה האישית שלך יש להתחבר לחשבון more30.</p>
          <a
            href={typeof window !== 'undefined' ? authLinks().login : 'https://more30.com/login'}
            className="mt-4 inline-block rounded-xl bg-navysurface px-4 py-2 text-sm font-bold text-white"
          >
            כניסה עם חשבון more30
          </a>
        </div>
      )}

      {state === 'error' && (
        <p className="mt-8 text-red-700">אירעה שגיאה בטעינת ההיסטוריה. אפשר לנסות לרענן את העמוד.</p>
      )}

      {state === 'ready' && items.length === 0 && (
        <p className="mt-8 text-muted">עדיין לא צפית באף דוח כשהיית מחובר.</p>
      )}

      {state === 'ready' && items.length > 0 && (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((e) => (
            <li key={e.slug} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <a href={apiUrl(`/p/${e.slug}`)} className="font-bold text-tealD hover:underline">
                  {labelOf(e)}
                </a>
                <div className="text-xs text-muted">
                  נצפה לאחרונה {new Date(e.viewedAt).toLocaleString('he-IL')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
