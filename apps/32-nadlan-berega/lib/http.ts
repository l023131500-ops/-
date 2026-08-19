// ==== שכבת HTTP עמידה למקורות ממשלתיים ====
// שרתי הממשלה נוטים ל-timeout ולניתוקים זמניים. כל קריאה עוברת דרך כאן:
// timeout מפורש + retry עם השהיה מדורגת. כישלון סופי זורק — והקורא מתרגם
// ל"לא זמין" (לעולם לא לנתון מומצא).

export interface FetchOpts extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export async function robustFetch(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 15000, retries = 2, headers, ...rest } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal: ctrl.signal,
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          ...(headers as Record<string, string> | undefined),
        },
        // @ts-ignore — Next.js data cache off; נתונים חיים בלבד
        next: { revalidate: 0 },
      });
      clearTimeout(timer);
      // 5xx שווה ניסיון חוזר; 4xx זו תשובה סופית של השרת
      if (res.status >= 500 && attempt < retries) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(400 * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }
  throw new Error(
    `בקשה נכשלה אחרי ${retries + 1} ניסיונות: ${url.slice(0, 120)} — ${
      (lastErr as Error)?.message ?? lastErr
    }`,
  );
}

/** כמו robustFetch אבל מוודא שהתשובה באמת JSON (שרתי ממשלה מחזירים HTML בשגיאה). */
export async function fetchJson<T = any>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await robustFetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 120)}`);
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    // סימן מובהק שה-endpoint השתנה או שהוגש דף SPA/שגיאה במקום API
    throw new Error(`תשובה אינה JSON (ייתכן שה-endpoint השתנה): ${trimmed.slice(0, 80)}`);
  }
  return JSON.parse(text) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
