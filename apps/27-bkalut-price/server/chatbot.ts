import type { RightRow } from "@shared/schema";

// ---------------------------------------------------------------------------
// Public chatbot answer composer.
//
// This module produces SHORT, sanitized answers from the rights database for
// the public floating chatbot. It must never return:
//   - eligibilityJson / intakeJson / documentsJson
//   - podcastScript / voiceShort / emailScript
//   - goldTip / treatingBody / bkalutCost
//   - officialLinks / how-to-apply / internal eligibility text
//   - aiSearch / aiExtra / internal notes
//
// Only `topic`, `category`, `audience`, `whatReceived`, and `publicSiteText`
// may be sampled, and only as short snippets clipped to a safe length. The
// caller appends a soft CTA and the contact closing.
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "של", "על", "את", "אם", "או", "מי", "מה", "איך", "כמה", "האם",
  "אני", "אנחנו", "יש", "לי", "לנו", "כן", "לא", "אבל", "גם",
  "the", "a", "an", "is", "are", "and", "or", "to", "of", "for",
]);

const SENSITIVE_KEYWORDS = [
  "אבל", "אבלות", "שכול", "אונס", "תקיפה מינית", "אלימות", "פסיכי", "התאבדות",
  "דיכאון", "פוסט-טראומה", "ptsd", "התעללות", "גירושין מורכבים",
];

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^֐-׿a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function searchableText(r: RightRow): string {
  return [
    r.topic,
    r.category,
    r.subCategory,
    r.audience,
    r.whatReceived,
    r.publicSiteText,
    r.aiSearch,
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase();
}

function clipSentence(text: string, max = 220): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  // Try cutting at sentence boundary first.
  const sentence = t.split(/(?<=[.!?])\s+/)[0] || t;
  if (sentence.length <= max) return sentence;
  return sentence.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function scoreRow(row: RightRow, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const hay = searchableText(row);
  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    // Exact topic match weighs heavily
    if (row.topic && row.topic.toLowerCase().includes(t)) score += 5;
    if (row.category && row.category.toLowerCase().includes(t)) score += 3;
    if (row.subCategory && row.subCategory.toLowerCase().includes(t)) score += 2;
    if (hay.includes(t)) score += 1;
  }
  return score;
}

export interface ChatbotAnswer {
  /** Short 1-3 sentence answer, safe for public display. */
  answer: string;
  /** Up to 3 related public topic suggestions (IDs + topic name only). */
  suggestions: Array<{ id: number; topic: string; category: string }>;
  /** True if the question matched something concrete in the database. */
  matched: boolean;
  /** True if the question contains sensitive keywords and should be redirected. */
  sensitive: boolean;
}

export function composeChatbotAnswer(
  question: string,
  rights: RightRow[],
): ChatbotAnswer {
  const qNorm = (question || "").trim();
  const sensitive = SENSITIVE_KEYWORDS.some((k) => qNorm.toLowerCase().includes(k.toLowerCase()));

  if (qNorm.length < 2) {
    return {
      answer:
        "אשמח לעזור! תוכל/י לכתוב בכמה מילים על איזה תחום מדובר — למשל קצבאות, בריאות, הנחות מס או חינוך.",
      suggestions: [],
      matched: false,
      sensitive,
    };
  }

  const tokens = tokenize(qNorm);
  const scored = rights
    .map((r) => ({ row: r, score: scoreRow(r, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return {
      answer:
        "לא מצאתי התאמה ישירה בשאלון מהיר. נשמח לבדוק עבורך באופן אישי — אפשר להמשיך כאן או לפנות אלינו ישירות.",
      suggestions: [],
      matched: false,
      sensitive,
    };
  }

  const top = scored[0].row;
  // Build short answer ONLY from sanitized fields. publicSiteText is the
  // designated public-facing description for this row; whatReceived is a
  // short factual phrase. We deliberately do NOT pull from eligibility,
  // intake, podcastScript, etc.
  const head = `נושא רלוונטי שמצאתי: "${top.topic}".`;
  const body = clipSentence(top.publicSiteText || top.whatReceived, 220);
  const answer = body ? `${head} ${body}` : head;

  const suggestions = scored.slice(0, 3).map(({ row }) => ({
    id: row.id,
    topic: row.topic,
    category: row.category,
  }));

  return { answer, suggestions, matched: true, sensitive };
}

// ---------------------------------------------------------------------------
// Public chatbot config view. Only safe fields go to public callers.
// `instructions` is admin-only — DO NOT include it in this object.
// ---------------------------------------------------------------------------
export interface PublicChatbotConfig {
  enabled: boolean;
  intro: string;
  ctaText: string;
  closingText: string;
  contact: { phone: string; email: string; whatsapp: string };
}

const DEFAULT_PUBLIC_CONFIG: PublicChatbotConfig = {
  enabled: false,
  intro: "שלום! אני העוזר של ארגון בקלות. איך אפשר לעזור?",
  ctaText:
    "מעניין אותך לקבל את פרטי הנושא המלאים? אוכל לשלוח לך אותם ללא עלות. אפשר גם להפעיל תזכורת או טיפול מלא של צוות בקלות.",
  closingText:
    "שמחנו שפנית אלינו! צוות בקלות תמיד כאן עבורך. אפשר לחזור אלינו בטלפון 02-3131500, בוואטסאפ או במייל.",
  contact: {
    phone: "02-3131500",
    email: "l023131500@gmail.com",
    whatsapp: "https://wa.me/972237131500",
  },
};

export function buildPublicChatbotConfig(
  enabled: boolean,
  configRaw: Record<string, unknown> | null | undefined,
): PublicChatbotConfig {
  const c = configRaw && typeof configRaw === "object" ? configRaw : {};
  const contact =
    c.contact && typeof c.contact === "object"
      ? (c.contact as Record<string, unknown>)
      : {};
  return {
    enabled,
    intro: typeof c.intro === "string" && c.intro.trim() ? c.intro : DEFAULT_PUBLIC_CONFIG.intro,
    ctaText:
      typeof c.ctaText === "string" && c.ctaText.trim()
        ? c.ctaText
        : DEFAULT_PUBLIC_CONFIG.ctaText,
    closingText:
      typeof c.closingText === "string" && c.closingText.trim()
        ? c.closingText
        : DEFAULT_PUBLIC_CONFIG.closingText,
    contact: {
      phone: typeof contact.phone === "string" ? contact.phone : DEFAULT_PUBLIC_CONFIG.contact.phone,
      email: typeof contact.email === "string" ? contact.email : DEFAULT_PUBLIC_CONFIG.contact.email,
      whatsapp:
        typeof contact.whatsapp === "string"
          ? contact.whatsapp
          : DEFAULT_PUBLIC_CONFIG.contact.whatsapp,
    },
  };
}
