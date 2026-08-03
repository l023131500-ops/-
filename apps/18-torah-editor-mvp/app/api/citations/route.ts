import { NextRequest, NextResponse } from 'next/server';

// Real integration with the Sefaria Linker API for automatic citation
// detection in free text. This never invents a source: it only reports
// refs actually returned by Sefaria's engine.
// Docs: https://developers.sefaria.org/docs/linker-api
//
// The endpoint is asynchronous: POST /api/find-refs answers 202 with only a
// task_id, and the citations are collected from GET /api/async/{task_id} once
// the task reports ready. Reading the POST response directly returned the bare
// task envelope, so every request silently produced zero citations.
const SEFARIA_FIND_REFS_URL = 'https://www.sefaria.org/api/find-refs';
const SEFARIA_ASYNC_URL = 'https://www.sefaria.org/api/async/';

const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 25_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull the linker payload out of either the async envelope or a direct response. */
function resultsFrom(payload: any): { results: any[]; refData: Record<string, any> } {
  const root = payload?.result ?? payload;
  const body = root?.body ?? {};
  const title = root?.title ?? {};
  return {
    results: [...(title.results ?? []), ...(body.results ?? [])],
    refData: { ...(title.refData ?? {}), ...(body.refData ?? {}) }
  };
}

async function awaitTask(taskId: string): Promise<any> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(SEFARIA_ASYNC_URL + encodeURIComponent(taskId));
    if (!res.ok) continue;

    const json = await res.json().catch(() => null);
    if (!json) continue;

    const state = String(json.state ?? '').toUpperCase();
    if (json.ready === true || state === 'SUCCESS') return json;
    if (state === 'FAILURE' || state === 'REVOKED') {
      throw new Error(`Sefaria task ${state.toLowerCase()}`);
    }
  }

  throw new Error('Sefaria Linker timed out');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const upstream = await fetch(SEFARIA_FIND_REFS_URL + '?with_text=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: { title: '', body: text }
    })
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: 'Sefaria Linker request failed', status: upstream.status, detail: errText.slice(0, 500) },
      { status: 502 }
    );
  }

  let data = await upstream.json();

  // 202 + task_id is the normal path; a direct payload is still accepted.
  if (data?.task_id && !data?.result) {
    try {
      data = await awaitTask(String(data.task_id));
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Sefaria Linker failed' },
        { status: 504 }
      );
    }
  }

  const { results, refData } = resultsFrom(data);

  const citations = results.map((span: any) => ({
    matchedText:
      typeof span.startChar === 'number' ? text.slice(span.startChar, span.endChar) : (span.text ?? null),
    startChar: span.startChar ?? null,
    endChar: span.endChar ?? null,
    refs: span.refs ?? [],
    linkFailed: span.linkFailed ?? false,
    // The source text Sefaria returns for each ref (with_text=1).
    sources: (span.refs ?? []).map((ref: string) => ({
      ref,
      heRef: refData?.[ref]?.heRef ?? null,
      he: refData?.[ref]?.he ?? null,
      en: refData?.[ref]?.en ?? null,
      url: refData?.[ref]?.url ? `https://www.sefaria.org/${refData[ref].url}` : null
    }))
  }));

  return NextResponse.json({ source: 'sefaria-linker', citations });
}
