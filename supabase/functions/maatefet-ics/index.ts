import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * maatefet-ics — public ICS calendar feed for one instructor or one client,
 * addressed by an unguessable secret token (never a Supabase session).
 *
 * Why an Edge Function and not a signed RPC called from the browser: the
 * caller here is Google/Apple/Outlook's own calendar-sync infrastructure,
 * polling this URL on their own schedule with no Authorization header at
 * all — that is what "subscribe by URL" means client-side. verify_jwt is
 * therefore off on purpose (see deploy metadata), and the only gate is the
 * token itself: public.maatefet_ics_feed() (service_role only, see migration
 * 0126) re-checks the token against calendar_feed_enabled before returning
 * a single row, so a wrong/disabled token yields nothing, not an error that
 * leaks which case it is.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// RFC 5545 §3.3.11 TEXT escaping — backslash, semicolon, comma, then
// newlines to the literal two-char sequence, in that order so an escaped
// backslash from an earlier step is never re-escaped by a later one.
function icsEscape(s: string): string {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

// RFC 5545 §3.1 line folding: no content line may exceed 75 octets: continue
// with CRLF + one space. Applied byte-wise (UTF-8) since Hebrew text runs
// multiple bytes/char and the limit is octets, not characters.
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const take = Math.min(75, bytes.length - i);
    let end = i + take;
    // never split a multi-byte UTF-8 sequence: back off while the next byte
    // is a continuation byte (10xxxxxx)
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(new TextDecoder().decode(bytes.slice(i, end)));
    i = end;
  }
  return out.join("\r\n ");
}

function icsStamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

type FeedRow = {
  role: "instructor" | "client";
  counterpart_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  topic: string | null;
  status: string;
  appt_id: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") {
    return new Response("GET only", { status: 405, headers: cors });
  }

  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return new Response("missing token", { status: 400, headers: cors });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/maatefet_ics_feed`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_token: token }),
  });

  if (!res.ok) {
    // invalid/disabled token — the RPC raises, which PostgREST turns into a
    // non-2xx; treated as "not found", not "here's why" (no oracle for
    // guessing which tokens exist).
    return new Response("not found", { status: 404, headers: cors });
  }

  const rows = (await res.json()) as FeedRow[];
  const calName = rows.length
    ? rows[0].role === "instructor"
      ? "מעטפת — הפגישות שלי"
      : "מעטפת — הפגישות שלנו"
    : "מעטפת — הפגישות שלי";

  const STATUS_MAP: Record<string, string> = {
    scheduled: "TENTATIVE",
    confirmed: "CONFIRMED",
    completed: "CONFIRMED",
  };

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//more30//maatefet//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calName)}`,
    "X-WR-TIMEZONE:Asia/Jerusalem",
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  const nowStamp = icsStamp(new Date().toISOString());
  for (const r of rows) {
    const start = new Date(r.scheduled_at);
    const end = new Date(start.getTime() + (r.duration_minutes || 60) * 60000);
    const summary = r.topic?.trim()
      ? r.topic.trim()
      : r.role === "instructor"
        ? `פגישת ליווי — ${r.counterpart_name ?? ""}`
        : `פגישת ליווי עם ${r.counterpart_name ?? "המדריך/ה"}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:maatefet-appt-${r.appt_id}@more30.com`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${icsStamp(start.toISOString())}`,
      `DTEND:${icsStamp(end.toISOString())}`,
      `SUMMARY:${icsEscape(summary)}`,
      `STATUS:${STATUS_MAP[r.status] ?? "TENTATIVE"}`,
    );
    if (r.location?.trim()) lines.push(`LOCATION:${icsEscape(r.location.trim())}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.map(foldLine).join("\r\n") + "\r\n";

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8; method=PUBLISH",
      "cache-control": "no-cache, max-age=0",
      ...cors,
    },
  });
});
