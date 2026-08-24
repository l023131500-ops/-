import { NextRequest, NextResponse } from 'next/server';

// Fetches the actual source text live from Sefaria's Texts API (v3) and
// compares it against the quote the user cited. The model is never
// trusted to recall a source from memory -- only text retrieved here,
// at request time, counts as ground truth.

// Without a timeout a slow/dead Sefaria endpoint hangs this request until the
// platform kills it, instead of failing fast like a normal upstream error.
async function fetchWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ref: string | undefined = body?.ref;
  const quote: string | undefined = body?.quote;

  if (!ref) {
    return NextResponse.json({ error: 'ref is required' }, { status: 400 });
  }

  const url = 'https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref);
  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(url);
  } catch {
    return NextResponse.json({
      ref,
      status: 'missing',
      distance: null,
      sourceText: '',
      sourceUrl: 'https://www.sefaria.org/' + encodeURIComponent(ref).replace(/%20/g, '_')
    });
  }

  if (!upstream.ok) {
    return NextResponse.json({
      ref,
      status: 'missing',
      distance: null,
      sourceText: '',
      sourceUrl: 'https://www.sefaria.org/' + encodeURIComponent(ref).replace(/%20/g, '_')
    });
  }

  const data = await upstream.json();
  const versions = data?.versions ?? [];
  const hebrewVersion = versions.find((v: any) => v.language === 'he') ?? versions[0];
  const sourceTextRaw: string = Array.isArray(hebrewVersion?.text)
    ? hebrewVersion.text.join(' ')
    : (hebrewVersion?.text ?? '');

  // Compare consonants only. Sefaria serves most texts vocalized (nikud) and
  // often with cantillation, while editors quote plain text -- keeping those
  // marks made every unvocalized quote score as a deviation.
  // U+0591-U+05C7 covers te'amim, nikud and the meteg/rafe marks.
  const strip = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[^\u0590-\u05FF\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const sourceText = strip(sourceTextRaw);
  const quoteText = quote ? strip(quote) : '';

  let status: 'match' | 'deviation' | 'no-quote-provided' = 'no-quote-provided';
  let distance: number | null = null;

  if (quoteText) {
    if (sourceText.includes(quoteText)) {
      status = 'match';
      distance = 0;
    } else {
      // The quote can land anywhere in a multi-line ref (e.g. a full Talmud
      // daf), not just at the start -- so slide the comparison window across
      // the whole source and keep the closest match, instead of only ever
      // comparing against the opening characters.
      const windowSize = Math.min(sourceText.length, quoteText.length + 30);
      let best = Infinity;
      for (let i = 0; i <= sourceText.length - windowSize; i++) {
        const d = levenshtein(quoteText, sourceText.slice(i, i + windowSize));
        if (d < best) best = d;
        if (best === 0) break;
      }
      distance = best === Infinity ? levenshtein(quoteText, sourceText) : best;
      status = distance / Math.max(quoteText.length, 1) < 0.15 ? 'match' : 'deviation';
    }
  }

  return NextResponse.json({
    ref,
    status,
    distance,
    sourceText,
    sourceUrl: 'https://www.sefaria.org/' + encodeURIComponent(ref).replace(/%20/g, '_')
  });
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}
