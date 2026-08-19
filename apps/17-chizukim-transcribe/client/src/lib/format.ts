import type { Recording } from "./supabase";

export function formatCost(usd: number | null): string {
  if (usd == null) return "—";
  return `$${usd.toFixed(4)}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Parse edited text with **subheadings** markers into HTML for the reading view.
// `terms` (from an archive search) are wrapped in <mark>.
export function renderEditedHtml(
  text: string | null,
  terms: string[] = [],
  wholeWord = false,
): string {
  if (!text) return "";
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const heading = block.match(/^\*\*(.+?)\*\*$/);
      if (heading) {
        return `<h3>${markup(heading[1], terms, wholeWord)}</h3>`;
      }
      // Split on the inline **bold** markers first so escaping and
      // highlighting only ever touch the text, never the tags around it.
      const html = block
        .split(/(\*\*.+?\*\*)/g)
        .filter(Boolean)
        .map((part) => {
          const bold = part.match(/^\*\*(.+?)\*\*$/);
          return bold
            ? `<strong>${markup(bold[1], terms, wholeWord)}</strong>`
            : markup(part, terms, wholeWord);
        })
        .join("");
      return `<p>${html.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

function markup(text: string, terms: string[], wholeWord: boolean): string {
  return highlightParts(text, terms, wholeWord)
    .map((p) => (p.hit ? `<mark>${escapeHtml(p.text)}</mark>` : escapeHtml(p.text)))
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- Archive search: excerpts, hit counts, highlighting ----

// Mirrors the database filter so a highlight never marks something the search
// did not count. In whole-word mode the term must end at a non-letter — the
// same tail boundary the query's \y applies, prefixes still allowed.
function termsRegex(terms: string[], flags: string, wholeWord = false): RegExp | null {
  const cleaned = terms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!cleaned.length) return null;
  const tail = wholeWord ? "(?![\\p{L}\\p{N}_])" : "";
  return new RegExp(`((?:${cleaned.join("|")})${tail})`, `${flags}u`);
}

/** Split text into runs so a search hit can be rendered differently. */
export function highlightParts(
  text: string,
  terms: string[],
  wholeWord = false,
): { text: string; hit: boolean }[] {
  const re = termsRegex(terms, "gi", wholeWord);
  if (!re) return [{ text, hit: false }];
  // The pattern holds exactly one capture group, so split() puts the matches
  // at the odd indices and the text between them at the even ones.
  const parts: { text: string; hit: boolean }[] = [];
  text.split(re).forEach((part, i) => {
    if (part !== "") parts.push({ text: part, hit: i % 2 === 1 });
  });
  return parts;
}

/** How many times the search terms appear in a transcript. */
export function countHits(text: string | null, terms: string[], wholeWord = false): number {
  if (!text) return 0;
  const re = termsRegex(terms, "gi", wholeWord);
  if (!re) return 0;
  return text.match(re)?.length ?? 0;
}

/**
 * The passage around the first hit — this is what turns a list of matching
 * files into a searchable archive: you see the sentence, not just the title.
 * Cut back to a word boundary so the excerpt does not start mid-word.
 */
export function excerptAround(
  text: string | null,
  terms: string[],
  wholeWord = false,
  radius = 110,
): string | null {
  if (!text) return null;
  const re = termsRegex(terms, "i", wholeWord);
  if (!re) return null;
  const at = text.search(re);
  if (at < 0) return null;

  let start = Math.max(0, at - radius);
  let end = Math.min(text.length, at + radius);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space > -1 && space < at) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > at) end = space;
  }

  // The edited text carries **subheading** markers; an excerpt is plain text.
  const body = text.slice(start, end).replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

// Build a title for a recording.
export function recordingTitle(r: Pick<Recording, "topic" | "original_name" | "seq">): string {
  if (r.topic) return r.topic;
  if (r.original_name) return r.original_name;
  return `הקלטה ${r.seq ?? ""}`;
}
