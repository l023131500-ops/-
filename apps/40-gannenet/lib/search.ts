/**
 * The string helpers /library needs, with no `content/*.json` import behind
 * them. They used to live in `lib/content.ts` beside the lessons themselves,
 * which was harmless while the page was small: the library page is a client
 * component, importing one function pulls its whole module in, and the module
 * carried 3.5 MB of lessons. Kept here they can be used on the client without
 * shipping the corpus — `lib/content.ts` re-exports them, so every existing
 * import keeps working.
 */

/**
 * The form a search term and a lesson must both be in before they are compared.
 * Nikud is the reason this exists: 50 of the 52 lessons carry pointed text
 * somewhere ("בְּרִיאַת הָעוֹלָם"), and nobody types the points, so a raw
 * `includes` misses the word that is plainly on the page. Geresh/gershayim vary
 * between the typographic and the ASCII form for the same word, and whitespace
 * runs are ordinary in the bodies.
 */
export function normalizeSearch(raw: string | undefined): string {
  return (raw || "")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[׳״'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * The month alone. Read every month through this rather than off the field:
 * `month` on 12 of the 47 משלימה lessons carries the whole meta line
 * ("אלול  |  גיל 3–6  |  משך: כ־45 דק׳  |  תחום: גוף ומדע") instead of just the
 * month, and `meta` — the only month a רגילה lesson has — always does
 * ("חודש תשרי · יום א׳ מתוך 5  |  …"). Both put the month first and everything
 * else after a `|` or a `·`.
 */
export function monthOf(raw: string | undefined): string {
  const cut = (raw || "").split(/[|·]/)[0].replace(/^\s*חודש\s+/, "").trim();
  // סיון and סיוון are the same month spelled two ways, and the package uses
  // one in the רגילה lessons and the other in the משלימה ones. Left alone they
  // are two dropdown entries that each hide half of the month.
  return cut === "סיון" ? "סיוון" : cut;
}

const HEB_MONTHS = new Set([
  "תשרי", "חשוון", "מרחשוון", "כסלו", "טבת", "שבט", "אדר", "אדר א׳", "אדר ב׳",
  "ניסן", "אייר", "סיוון", "תמוז", "אב", "אלול",
]);

/**
 * Whether a month field actually named a month. It stopped being a given with
 * the 180-lesson package: 74 of the 119 רגילה lessons put a unit label where
 * the month goes — the five books ("ספר בראשית") for the 54 parasha lessons and
 * "נושא ליבה" for the 20 values lessons — so a select fed straight off the field
 * offers "ספר דברים" under a label reading "כל החודשים". Those lessons are not
 * in a month, and the domain filter is where they are meant to be found.
 * "כל השנה" stays: it is an answer about time, and it is the answer for the five
 * משלימה lessons that belong to no single month.
 */
export function isMonthLabel(value: string): boolean {
  if (!value) return false;
  if (value === "כל השנה") return true;
  return value.split("–").every((part) => HEB_MONTHS.has(part.trim()));
}
