'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/basepath';

/**
 * מסך "אזור מוגן" שיודע לזהות שאתה כבר מחובר לפלטפורמה.
 *
 * הסשן המשותף של more30 שמור ב-localStorage תחת `more30-auth` (כל 33 המערכות
 * מוגשות מ-more30.com, כלומר origin אחד). ה-server component לא רואה אותו,
 * ולכן הרכיב הזה לוקח מהסשן את ה-JWT, שולח אותו למסלול שמאמת אותו מול ההאב,
 * ומקבל עוגייה חתומה. אחריה העמוד נטען רגיל — בלי טוקן ידני בכתובת.
 */
export default function SessionGate() {
  const [state, setState] = useState<'idle' | 'working' | 'denied' | 'none' | 'error'>('idle');
  const [detail, setDetail] = useState('');

  async function tryEnter() {
    setState('working');
    let jwt = '';
    try {
      const raw = localStorage.getItem('more30-auth');
      const s = raw ? JSON.parse(raw) : null;
      // סשן שפג תוקפו אינו סשן — עדיף לשלוח להתחברות מאשר ל-401.
      if (s?.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now())) {
        jwt = s.access_token;
      }
    } catch {
      /* אחסון לא קריא — מתייחסים כאילו אין סשן */
    }

    if (!jwt) {
      setState('none');
      return;
    }

    try {
      // basePath של Next.js אינו נוגע ב-fetch גולמי; בלי הקידומת הקריאה
      // יוצאת לשורש הדומיין ונופלת ל-catch-all של הפורטל.
      const r = await fetch(apiUrl('/api/admin/session'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (r.ok) {
        location.reload();
        return;
      }
      const body = (await r.json().catch(() => null)) as { error?: string } | null;
      setDetail(body?.error ?? `שגיאה ${r.status}`);
      setState(r.status === 403 ? 'denied' : 'error');
    } catch (e) {
      setDetail(e instanceof Error ? e.message : 'שגיאת רשת');
      setState('error');
    }
  }

  // ניסיון אוטומטי אחד בטעינה: מי שכבר מחובר כמנהל לא אמור ללחוץ על כלום.
  useEffect(() => {
    void tryEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = typeof window === 'undefined' ? '' : encodeURIComponent(window.location.href);

  return (
    <div className="mt-6 space-y-3">
      {state === 'working' && <p className="text-sm text-muted">בודקים את ההתחברות שלך…</p>}

      {state === 'denied' && (
        <p className="text-sm text-red-700">
          החשבון שאיתו אתה מחובר אינו מנהל של המערכת הזו. {detail}
        </p>
      )}

      {state === 'error' && <p className="text-sm text-red-700">{detail}</p>}

      {(state === 'none' || state === 'denied' || state === 'error') && (
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={`https://more30.com/login?from=${back}`}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
          >
            כניסה עם חשבון more30
          </a>
          <button onClick={() => void tryEnter()} className="rounded-xl border border-line px-4 py-2 text-sm">
            כבר התחברתי — נסה שוב
          </button>
        </div>
      )}
    </div>
  );
}
