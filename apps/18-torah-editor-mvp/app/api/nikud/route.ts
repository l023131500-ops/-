import { NextRequest, NextResponse } from 'next/server';

// Real integration with DICTA's Nakdan diacritization engine.
// Docs: https://dicta.org.il/tools?lang=en (Nakdan API)
// No local fallback or fabricated nikud: if the upstream call fails,
// the error is surfaced to the client as-is. In particular there is no
// LLM fallback -- a model guessing vowels would look right and be wrong.
//
// Two upstreams, same engine family:
//  * nakdan-5-3 is the current versioned endpoint but now rejects anonymous
//    calls with {"apiKey":["An ApiKey is required!"]}. Used only when
//    DICTA_API_KEY is configured.
//  * nakdan-2-0 is the open endpoint and needs no key. Default.
const NAKDAN_KEYED_URL = 'https://nakdan-5-3.loadbalancer.dicta.org.il/addnikud';
const NAKDAN_OPEN_URL = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api';

// Without a timeout a slow/dead DICTA endpoint hangs this request until the
// platform kills it, instead of failing fast like a normal upstream error.
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** nakdan-5-3: [{ word, options: [{ nikud }] }] */
function joinKeyed(data: any): string | null {
  if (!Array.isArray(data)) return null;
  return data
    .map((w: any) => (w?.options && w.options[0] && w.options[0].nikud) || w?.word || '')
    .join('');
}

/** nakdan-2-0: [{ word, sep, options: [[nikudText, {...}], ...] }] */
function joinOpen(data: any): string | null {
  if (!Array.isArray(data)) return null;
  return data
    .map((w: any) => {
      if (w?.sep) return w.word ?? '';
      const first = Array.isArray(w?.options) ? w.options[0] : null;
      const vocalized = Array.isArray(first) ? first[0] : first?.nikud;
      return vocalized || w?.word || '';
    })
    .join('');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text;
  const genre: string =
    body?.genre === 'modern' || body?.genre === 'poetic' ? body.genre : 'rabbinic';

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const apiKey = (process.env.DICTA_API_KEY || '').trim();
  const url = apiKey ? NAKDAN_KEYED_URL : NAKDAN_OPEN_URL;

  const payload: Record<string, unknown> = { task: 'nakdan', genre, data: text };
  if (apiKey) {
    payload.apiKey = apiKey;
  } else {
    // Options the open endpoint expects; the keyed one defaults them itself.
    payload.addmorph = true;
    payload.matchpartial = true;
    payload.keepmetagim = false;
    payload.keepqq = false;
  }

  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e: any) {
    const timedOut = e?.name === 'AbortError';
    return NextResponse.json(
      { error: timedOut ? 'DICTA Nakdan request timed out' : 'DICTA Nakdan request failed', detail: String(e?.message || e) },
      { status: 504 }
    );
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: 'DICTA Nakdan request failed', status: upstream.status, detail: errText.slice(0, 500) },
      { status: 502 }
    );
  }

  const data = await upstream.json();
  const nikudText = apiKey ? joinKeyed(data) : joinOpen(data);

  return NextResponse.json({
    source: apiKey ? 'dicta-nakdan-5.3' : 'dicta-nakdan-2.0',
    genre,
    nikudText,
    raw: data
  });
}
