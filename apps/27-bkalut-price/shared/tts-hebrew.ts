/**
 * Hebrew TTS-safe text formatter.
 *
 * Used ONLY for presentation of podcast / voice-message / phone (Yemot)
 * scripts that are read aloud by Hebrew TTS engines. Hebrew TTS engines
 * frequently misread Arabic numerals and currency symbols (e.g. they may
 * read "₪" as the literal character name or skip it, or read "100" as
 * digit-by-digit). Converting common numbers and currency amounts to
 * Hebrew words at presentation time produces much clearer voice output.
 *
 * IMPORTANT: this helper must NEVER be applied to:
 *   - numeric fields used in calculations
 *   - API/webhook payloads that downstream automations parse
 *   - public catalog data
 *   - eligibility rules
 *   - automation values
 *
 * It is intended only for fields like podcastScript / voiceShort that are
 * piped into a TTS engine, plus copy/download buttons that emit the same
 * scripts. The underlying stored text in the rights database is untouched.
 */

const ONES = [
  "",
  "אחד",
  "שניים",
  "שלושה",
  "ארבעה",
  "חמישה",
  "שישה",
  "שבעה",
  "שמונה",
  "תשעה",
];

const TEENS = [
  "עשרה",
  "אחד עשר",
  "שנים עשר",
  "שלושה עשר",
  "ארבעה עשר",
  "חמישה עשר",
  "שישה עשר",
  "שבעה עשר",
  "שמונה עשר",
  "תשעה עשר",
];

const TENS = [
  "",
  "עשרה",
  "עשרים",
  "שלושים",
  "ארבעים",
  "חמישים",
  "שישים",
  "שבעים",
  "שמונים",
  "תשעים",
];

const HUNDREDS = [
  "",
  "מאה",
  "מאתיים",
  "שלוש מאות",
  "ארבע מאות",
  "חמש מאות",
  "שש מאות",
  "שבע מאות",
  "שמונה מאות",
  "תשע מאות",
];

function hebrewUnderThousand(n: number): string {
  if (n <= 0) return "";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t] : `${TENS[t]} ו${ONES[r]}`;
  }
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (r === 0) return HUNDREDS[h];
  return `${HUNDREDS[h]} ${hebrewUnderThousand(r)}`;
}

function hebrewThousands(n: number): string {
  if (n === 1) return "אלף";
  if (n === 2) return "אלפיים";
  if (n < 10) return `${ONES[n]} אלפים`;
  return `${hebrewUnderThousand(n)} אלף`;
}

/**
 * Convert a non-negative integer (0 .. 999,999) to a Hebrew word form
 * suitable for TTS reading. Numbers outside the supported range fall back
 * to a digit-spelling that is still readable by TTS.
 */
export function hebrewNumberWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  const int = Math.floor(n);
  if (int === 0) return "אפס";
  if (int < 1000) return hebrewUnderThousand(int);
  if (int < 1_000_000) {
    const thousands = Math.floor(int / 1000);
    const remainder = int % 1000;
    const head = hebrewThousands(thousands);
    if (remainder === 0) return head;
    return `${head} ו${hebrewUnderThousand(remainder)}`;
  }
  // Fallback: keep number readable but avoid breaking text.
  return String(int);
}

/**
 * Render a currency amount in Hebrew words. The output uses the word
 * "שקלים" (or "שקל" for the singular case) so a Hebrew TTS engine can
 * pronounce it naturally. Decimals are read as "ו..אגורות" when present.
 */
export function hebrewCurrencyWords(amount: number): string {
  if (!Number.isFinite(amount)) return String(amount);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const shekels = Math.floor(abs);
  const agorot = Math.round((abs - shekels) * 100);

  let main: string;
  if (shekels === 0) main = "אפס שקלים";
  else if (shekels === 1) main = "שקל אחד";
  else if (shekels === 2) main = "שני שקלים";
  else main = `${hebrewNumberWords(shekels)} שקלים`;

  if (agorot > 0) {
    const agoraWord = agorot === 1 ? "אגורה אחת" : agorot === 2 ? "שתי אגורות" : `${hebrewNumberWords(agorot)} אגורות`;
    main = `${main} ו${agoraWord}`;
  }

  return negative ? `מינוס ${main}` : main;
}

function hebrewPercentWords(value: number): string {
  if (!Number.isFinite(value)) return `${value} אחוזים`;
  if (Number.isInteger(value)) {
    if (value === 1) return "אחוז אחד";
    if (value === 2) return "שני אחוזים";
    return `${hebrewNumberWords(value)} אחוזים`;
  }
  return `${value} אחוזים`;
}

function hebrewYearWords(year: number): string {
  if (year >= 2000 && year < 3000) {
    const rest = year - 2000;
    if (rest === 0) return "שנת אלפיים";
    return `שנת אלפיים ${hebrewUnderThousand(rest)}`;
  }
  return `שנת ${hebrewNumberWords(year)}`;
}

const SHEKEL_TOKENS = [
  /₪/,
  /ש"ח/,
  /שח\b/,
  /ש״ח/,
  /שקלים?/,
];

const SHEKEL_PATTERN = new RegExp(
  `(?:${SHEKEL_TOKENS.map((r) => r.source).join("|")})`,
  "",
);

/**
 * Replace currency amounts in text with Hebrew words.
 * Matches forms like:
 *   100 ש"ח
 *   ₪100
 *   100 שקלים
 *   1,500 ש"ח
 */
function replaceCurrencyAmounts(text: string): string {
  // Amount before symbol: 1,234.50 ש"ח
  const amountFirst = new RegExp(
    String.raw`(\d{1,3}(?:[,،]\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(${SHEKEL_PATTERN.source})`,
    "g",
  );
  let out = text.replace(amountFirst, (_m, whole: string, decimals: string | undefined) => {
    const intPart = Number(whole.replace(/[,،]/g, ""));
    const dec = decimals ? Number(decimals.padEnd(2, "0")) / 100 : 0;
    if (!Number.isFinite(intPart)) return _m;
    return hebrewCurrencyWords(intPart + dec);
  });

  // Symbol before amount: ₪1,500 or ש"ח 100
  const symbolFirst = new RegExp(
    String.raw`(${SHEKEL_PATTERN.source})\s*(\d{1,3}(?:[,،]\d{3})+|\d+)(?:\.(\d{1,2}))?`,
    "g",
  );
  out = out.replace(symbolFirst, (_m, _sym: string, whole: string, decimals: string | undefined) => {
    const intPart = Number(whole.replace(/[,،]/g, ""));
    const dec = decimals ? Number(decimals.padEnd(2, "0")) / 100 : 0;
    if (!Number.isFinite(intPart)) return _m;
    return hebrewCurrencyWords(intPart + dec);
  });

  return out;
}

/**
 * Replace `<number>%` and `<number> אחוז(ים)` with Hebrew words.
 */
function replacePercents(text: string): string {
  const percentSymbol = /(\d{1,3}(?:[.,]\d{1,2})?)\s*%/g;
  let out = text.replace(percentSymbol, (_m, raw: string) => {
    const num = Number(raw.replace(",", "."));
    if (!Number.isFinite(num)) return _m;
    return hebrewPercentWords(num);
  });
  const percentWord = /(\d{1,3})\s*אחוז(ים)?/g;
  out = out.replace(percentWord, (_m, raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num)) return _m;
    return hebrewPercentWords(num);
  });
  return out;
}

/**
 * Replace 4-digit years 1900..2099 with Hebrew word form. Done before
 * generic number replacement so years aren't read as "two thousand and ...".
 */
function replaceYears(text: string): string {
  return text.replace(/\b(19|20)(\d{2})\b/g, (_m, head: string, tail: string) => {
    const y = Number(head + tail);
    return hebrewYearWords(y);
  });
}

/**
 * Replace remaining standalone numbers (not attached to letters/IDs) with
 * Hebrew words. Skips numbers inside URLs, IDs (digit groups longer than 6),
 * and phone-like patterns. Anything ambiguous is left as-is.
 */
function replaceStandaloneNumbers(text: string): string {
  // Phone-like sequences (with dashes/spaces) and long IDs: leave alone.
  // We only touch short integers <= 999,999 written as bare digits.
  return text.replace(/(?<![\w\d-])(\d{1,6})(?![\w\d-])/g, (_m, raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num)) return _m;
    if (num === 0) return _m; // "0" is often meaningful as-is
    return hebrewNumberWords(num);
  });
}

/**
 * Punctuation / whitespace cleanup for voice scripts:
 *   - collapse runs of spaces/tabs into one space
 *   - collapse 3+ newlines into a paragraph break (two newlines)
 *   - ensure a single space after Hebrew/Latin punctuation (.,;:!?)
 *   - add a period at the end of headings that look like "כותרת:" lines
 *     are left alone; do not destroy existing Hebrew punctuation
 */
export function cleanVoiceScriptText(input: string): string {
  if (!input) return "";
  let out = input.replace(/\r\n?/g, "\n");
  // Trim each line.
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  // Collapse 3+ newlines into a paragraph break.
  out = out.replace(/\n{3,}/g, "\n\n");
  // Ensure space after sentence punctuation when followed by a letter.
  out = out.replace(/([\.!?])(?=\S)(?!\n)/g, "$1 ");
  // Ensure comma is followed by a space when followed by a letter.
  out = out.replace(/,(?=\S)(?!\n)/g, ", ");
  // Compact multiple spaces created by the above.
  out = out.replace(/[ \t]{2,}/g, " ");
  // Add line break between a heading-like line ending with ":" and the
  // next non-empty line, so TTS pauses cleanly.
  out = out.replace(/^([^\n]{2,80}:)[ \t]*\n(?!\n)/gm, "$1\n\n");
  // Final trim.
  return out.trim();
}

/**
 * Full TTS-safe transformation: numeric/currency/percent to Hebrew words,
 * then punctuation/whitespace cleanup. Returns the empty string for empty
 * input, never throws.
 */
export function toTtsSafeHebrew(input: string | null | undefined): string {
  if (!input) return "";
  let out = String(input);
  try {
    out = replaceCurrencyAmounts(out);
    out = replacePercents(out);
    out = replaceYears(out);
    out = replaceStandaloneNumbers(out);
    out = cleanVoiceScriptText(out);
  } catch {
    // Graceful fallback: never break voice/podcast UI.
    return cleanVoiceScriptText(String(input));
  }
  return out;
}
