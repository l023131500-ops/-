// Modesty/intimacy gating for public publication wording.
//
// Per product spec: only **actual modesty topics** (fertility, intimacy,
// pregnancy/birth, ritual purity, abortion/IVF) require careful wording for
// public/Haredi audiences. Generic words like "רגיש" or "צריך התאמה" must NOT
// trigger the modesty marker — many normal financial-hardship and child-welfare
// rights carry those phrases and should remain visible everywhere.
//
// This helper is the single source of truth for the client. The matching server
// helper lives in `server/question-normalizer.ts` (`isModestySensitive`).
const MODESTY_TERMS = [
  "צניעות",
  "צנוע",
  "פוריות",
  "פריון",
  "הריון",
  "היריון",
  "לידה",
  "אינטימ",
  "אישות",
  "טהרת המשפחה",
  "הפלה",
  "IVF",
  "הזרעה",
];

export function needsModestWording(haredi: string | null | undefined, topic?: string | null, category?: string | null): boolean {
  const blob = [haredi || "", topic || "", category || ""].join(" ").toLowerCase();
  return MODESTY_TERMS.some((t) => blob.includes(t.toLowerCase()));
}
