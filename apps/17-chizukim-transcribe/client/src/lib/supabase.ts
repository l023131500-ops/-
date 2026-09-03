// Supabase REST client for the transcription system.
// Reads and writes directly to public.recordings via PostgREST.
//
// NOTE: Transcription + status polling go through OUR backend (Express),
// so those helpers use apiRequest / API_BASE from queryClient — never a raw
// fetch — to keep the ${API_BASE} prefix (required for the deployed proxy).

import { apiRequest, API_BASE } from "./queryClient";

const SUPABASE_URL = "https://csjekrvukbdznetsrodj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX";

const REST = `${SUPABASE_URL}/rest/v1`;

const baseHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export type RecordingStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "editing"
  | "ready"
  | "error";

export interface Recording {
  id: string;
  drive_id: string | null;
  original_name: string | null;
  subfolder: string | null;
  seq: number | null;
  audio_path: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  topic: string | null;
  parsha_or_date: string | null;
  raw_transcript: string | null;
  edited_transcript: string | null;
  status: RecordingStatus;
  transcription_cost_usd: number | null;
  created_at: string | null;
  updated_at: string | null;
  segments: { start: number | null; end: number | null; text: string }[] | null;
}

// Build a Google Drive audio streaming URL and a human-openable link.
export function driveStreamUrl(driveId: string | null): string | null {
  if (!driveId) return null;
  return `https://drive.google.com/uc?export=download&id=${driveId}`;
}
export function driveOpenUrl(driveId: string | null): string | null {
  if (!driveId) return null;
  return `https://drive.google.com/file/d/${driveId}/view`;
}

// ---------------------------------------------------------------------------
// Archive search
//
// The list is paged on the server. It used to be one unbounded GET, which
// PostgREST silently capped at its max-rows of 1,000 — so the page showed
// "1,000 recordings" for an archive that holds 1,138, and searched only the
// slice it happened to receive.
// ---------------------------------------------------------------------------

// Fields the search runs over. A substring match (ilike) is deliberate:
// Hebrew binds its prefixes (ו/ב/ל/כ/מ/ה/ש) straight onto the word, so
// "ובתשובה" is a hit for "תשובה". Measured against this archive, ilike finds
// 249 recordings for "תשובה" where websearch_to_tsquery under the English
// text-search config — the only one installed — finds 74.
const SEARCH_FIELDS = [
  "raw_transcript",
  "edited_transcript",
  "topic",
  "parsha_or_date",
  "original_name",
] as const;

const LIST_COLUMNS =
  "id,seq,topic,parsha_or_date,status,transcription_cost_usd,audio_url,drive_id,duration_seconds,original_name,updated_at";

// Split the query into terms. LIKE metacharacters are dropped rather than
// escaped: PostgREST rewrites `*` to `%` and passes `%` and `_` through to
// SQL, so leaving them in would quietly widen the match instead of searching
// for the character the user typed. ilike takes no ESCAPE clause.
export function searchTerms(q: string): string[] {
  return q
    .split(/\s+/)
    .map((t) => t.replace(/[%_*\\]/g, "").trim())
    .filter(Boolean);
}

// PostgREST reads , ( ) . as syntax inside a logic tree, so every value is
// double-quoted; inside the quotes it unescapes \ and ", which means both have
// to be doubled on the way in — including the backslashes of a regex.
function quoteValue(raw: string): string {
  return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// One term against every field.
//
// Substring (ilike) is the default because Hebrew binds prefixes onto the
// word: "ובתשובה" is a hit for "תשובה", and a query is often a root the
// reader wants in every inflection. Whole-word narrows the tail end with a
// Postgres \y boundary — it still allows the prefix letters, but stops "יתרו"
// from matching inside "שיתרום". Measured here: 24 recordings substring,
// 13 whole-word.
function orGroup(term: string, wholeWord: boolean): string {
  if (wholeWord) {
    const pattern = `${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\y`;
    const value = quoteValue(pattern);
    return `or(${SEARCH_FIELDS.map((f) => `${f}.imatch.${value}`).join(",")})`;
  }
  const value = quoteValue(`*${term}*`);
  return `or(${SEARCH_FIELDS.map((f) => `${f}.ilike.${value}`).join(",")})`;
}

// Every term must appear somewhere in the recording: AND across terms,
// OR across fields.
function searchFilter(terms: string[], wholeWord: boolean): string {
  if (!terms.length) return "";
  if (terms.length === 1) {
    return `&${orGroup(terms[0], wholeWord).replace(/^or\(/, "or=(")}`;
  }
  return `&and=(${terms.map((t) => orGroup(t, wholeWord)).join(",")})`;
}

export interface SearchPage {
  rows: Recording[];
  /** Exact number of matches in the database, not the number on this page. */
  total: number;
}

export async function searchRecordings(opts: {
  q: string;
  status: RecordingStatus | "all";
  page: number;
  pageSize: number;
  wholeWord?: boolean;
}): Promise<SearchPage> {
  const terms = searchTerms(opts.q);
  // Transcripts come along only when there is something to excerpt — the full
  // archive is several megabytes of text, and the list itself never shows it.
  const select = terms.length
    ? `${LIST_COLUMNS},raw_transcript,edited_transcript`
    : LIST_COLUMNS;
  const statusFilter = opts.status === "all" ? "" : `&status=eq.${opts.status}`;
  const url =
    `${REST}/recordings?select=${select}&order=seq.asc` +
    `&limit=${opts.pageSize}&offset=${opts.page * opts.pageSize}` +
    statusFilter +
    searchFilter(terms, opts.wholeWord ?? false);

  const res = await fetch(url, {
    headers: { ...baseHeaders, Prefer: "count=exact" },
  });
  // PostgREST reports the true total in Content-Range as "0-24/1138", and
  // answers 416 when the offset is past the end — which is a page that no
  // longer exists, not a failure. It still carries the count, so the caller
  // can correct itself.
  if (!res.ok && res.status !== 416) {
    throw new Error(`שגיאה בטעינת ההקלטות: ${res.status}`);
  }
  const rows = res.status === 416 ? [] : ((await res.json()) as Recording[]);
  const total = Number(res.headers.get("content-range")?.split("/")[1]);
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

export interface ArchiveStats {
  total: number;
  ready: number;
  costUsd: number;
}

// Headline numbers for the whole archive, counted by the database.
export async function fetchArchiveStats(): Promise<ArchiveStats> {
  const countOf = async (filter: string): Promise<number> => {
    const res = await fetch(`${REST}/recordings?select=id&limit=1${filter}`, {
      headers: { ...baseHeaders, Prefer: "count=exact" },
    });
    if (!res.ok) throw new Error(`שגיאה בטעינת נתוני הארכיון: ${res.status}`);
    return Number(res.headers.get("content-range")?.split("/")[1]) || 0;
  };

  const [total, ready] = await Promise.all([countOf(""), countOf("&status=eq.ready")]);

  // PostgREST has no SUM without a stored function, so the cost column is
  // summed here — one number per row, paged at the server's max-rows so the
  // figure covers the whole archive and not just its first thousand rows.
  let costUsd = 0;
  for (let offset = 0; offset < total; offset += 1000) {
    const res = await fetch(
      `${REST}/recordings?select=transcription_cost_usd&limit=1000&offset=${offset}`,
      { headers: baseHeaders },
    );
    if (!res.ok) throw new Error(`שגיאה בחישוב עלות התמלול: ${res.status}`);
    const rows = (await res.json()) as { transcription_cost_usd: number | null }[];
    for (const row of rows) costUsd += row.transcription_cost_usd ?? 0;
  }

  return { total, ready, costUsd };
}

// Fetch a single recording with full transcripts.
export async function fetchRecording(id: string): Promise<Recording> {
  const url = `${REST}/recordings?id=eq.${id}&select=*`;
  const res = await fetch(url, { headers: baseHeaders });
  if (!res.ok) throw new Error(`שגיאה בטעינת ההקלטה: ${res.status}`);
  const rows = (await res.json()) as Recording[];
  if (!rows.length) throw new Error("ההקלטה לא נמצאה");
  return rows[0];
}

// Save edits to a recording (transcripts, topic, date, status).
export async function updateRecording(
  id: string,
  patch: Partial<
    Pick<
      Recording,
      | "raw_transcript"
      | "edited_transcript"
      | "topic"
      | "parsha_or_date"
      | "status"
    >
  >,
): Promise<Recording> {
  const url = `${REST}/recordings?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`שגיאה בשמירה: ${res.status}`);
  const rows = (await res.json()) as Recording[];
  return rows[0];
}

/** A passage the transcription engine itself flagged as uncertain. */
export interface LowConfidenceSegment {
  start: number | null;
  end: number | null;
  text: string;
  reason: string;
}

export interface TranscribeApiResult {
  recording: Recording;
  low_confidence?: LowConfidenceSegment[];
}

// Kick off on-demand transcription via our backend. Long-running (server polls
// RunPod until COMPLETED). Uses API_BASE prefix through apiRequest.
//
// The response also carries `low_confidence` — segments the engine itself
// flagged (low avg_logprob, high no-speech probability, runaway repetition;
// see server/transcribe.ts). That list only ever existed in this one response
// and was previously discarded by the caller — it is not persisted to the
// `recordings` row, so it has to be read here, on the response that has it.
export async function startTranscription(id: string): Promise<TranscribeApiResult> {
  const res = await apiRequest("POST", `/api/transcribe/${id}`);
  return (await res.json()) as TranscribeApiResult;
}

// Lightweight polling status via our backend (GET /api/recordings/:id).
// Prefixed with API_BASE so it resolves correctly when deployed.
export async function pollRecording(id: string): Promise<Recording> {
  const res = await fetch(`${API_BASE}/api/recordings/${id}`);
  if (!res.ok) throw new Error(`שגיאה בבדיקת הסטטוס: ${res.status}`);
  return res.json();
}

export const STATUS_LABELS: Record<RecordingStatus, string> = {
  uploaded: "הועלה",
  transcribing: "בתמלול",
  transcribed: "תומלל",
  editing: "בעריכה",
  ready: "מוכן",
  error: "שגיאה",
};

// Filter / display order in the UI.
export const STATUS_ORDER: RecordingStatus[] = [
  "uploaded",
  "transcribing",
  "editing",
  "ready",
  "error",
];
