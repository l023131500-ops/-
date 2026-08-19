import type { ResearchProfile, ResearchParameter } from "@shared/schema";

export type QItem = {
  key: string;
  type: "single" | "number" | "scale" | "text";
  label: string;
  options?: string[];
  min?: number;
  max?: number;
};
export type QSection = { section: string; items: QItem[] };
export type Questionnaire = { title: string; sections: QSection[] };

export function paramByKey(
  profile: ResearchProfile,
  key: string,
): ResearchParameter | undefined {
  return profile.parameters.find((p) => p.key === key);
}

export function metric(profile: ResearchProfile, key: string): unknown {
  return (profile.metrics ?? {})[key];
}

export function formatCurrency(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number(v));
}

export function formatNumber(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("he-IL").format(n);
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || Number.isNaN(Number(meters))) return "—";
  const m = Number(meters);
  if (m < 1000) return `${Math.round(m)} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}

// ---- "רקע על המקום" ----
// The card used to assert a character — "אופי מובהק", "תמהיל אוכלוסייה ייחודי",
// "אטרקטיבי במיוחד" — that no field in the payload backs and that came out
// identical for every address in the country. These are the keys the same card
// can stand on: fields the payload actually carries, that are not demographic
// (those belong to the paid report, per the premium gate) and that no other
// surface already prints. A key the registry did not answer is skipped, not
// filled in — the same rule the rest of the report follows.
const PLACE_KEYS = ["dist_central_place", "dist_synagogue", "synagogues_500m"];
const PLACE_DISTANCE_KEYS = new Set(["dist_central_place", "dist_synagogue"]);

export function placeFacts(
  profile: ResearchProfile,
): { key: string; label: string; value: string }[] {
  return PLACE_KEYS.map((key) => paramByKey(profile, key))
    .filter(
      (p): p is ResearchParameter =>
        !!p && p.value !== null && p.value !== undefined && p.value !== "",
    )
    .map((p) => ({
      key: p.key,
      label: p.label,
      value: PLACE_DISTANCE_KEYS.has(p.key)
        ? formatDistance(Number(p.value))
        : formatNumber(p.value),
    }));
}

// ---- העיר שהוקלדה מול העיר שהמרשם החזיר ----
// «יפו 30 ירושלים» matched "דרך יפו-ת\"א 30" with locality_name="תל אביב-יפו":
// the typed city does not constrain the match, and every number in the report —
// score, average price, yield, trend — is then computed for a different city
// with nothing on screen saying so. This does not fix the matching (that runs
// inside the edge function); it detects the gap and says it out loud.
//
// Deliberately one-sided: we warn only when neither name contains the other, so
// "תל אביב" against "תל אביב-יפו" stays quiet. A missing name on either side is
// not a mismatch — it is an unknown, and an unknown makes no claim.
// The one abbreviation the registry itself emits — matched_address came back as
// "דרך יפו-ת\"א 30 ת\"א" while locality_name was spelled out. Nothing else is
// aliased: an alias we invent would be a claim about a place we did not check.
const LOCALITY_ALIASES: Record<string, string> = { תא: "תל אביב" };

function normalizeLocality(name: string): string {
  const clean = name
    .replace(/["'׳״]/g, "") // ת"א · ת״א → תא
    .replace(/[-–—־]/g, " ") // תל אביב-יפו → תל אביב יפו
    .replace(/\s+/g, " ")
    .trim();
  return LOCALITY_ALIASES[clean] ?? clean;
}

export function localityMismatch(
  typedCity: string | null | undefined,
  localityName: string | null | undefined,
): boolean {
  const typed = normalizeLocality(typedCity ?? "");
  const matched = normalizeLocality(localityName ?? "");
  if (!typed || !matched) return false;
  return !matched.includes(typed) && !typed.includes(matched);
}

// Friendly conclusion label for the opportunity score.
export function scoreVerdict(score: number): {
  label: string;
  tone: "high" | "mid" | "low";
} {
  if (score >= 75) return { label: "כדאיות גבוהה", tone: "high" };
  if (score >= 55) return { label: "כדאיות בינונית-גבוהה", tone: "mid" };
  if (score >= 40) return { label: "כדאיות בינונית", tone: "mid" };
  return { label: "כדאיות מוגבלת", tone: "low" };
}

// Turn the raw score_breakdown into friendly, user-facing insight bullets —
// deliberately avoiding raw political/voting data.
const HIDDEN_FACTOR_HINTS = ["בחיר", "הצבע", "כנסת", "סוצי", "פוליט"];

export function friendlyInsights(profile: ResearchProfile): string[] {
  const out: string[] = [];
  const transit = paramByKey(profile, "dist_transit");
  if (transit && Number(transit.value) <= 500) {
    out.push(`קרוב לתחבורה ציבורית — כ־${formatDistance(Number(transit.value))} לתחנה`);
  }
  const train = paramByKey(profile, "dist_train");
  if (train && Number(train.value) <= 2500) {
    out.push(`נגישות לרכבת בטווח ${formatDistance(Number(train.value))}`);
  }
  const school = paramByKey(profile, "dist_school");
  if (school && Number(school.value) <= 800) {
    out.push(`מוסדות חינוך בקרבת מקום (${formatDistance(Number(school.value))})`);
  }
  const yieldP = paramByKey(profile, "yield");
  if (yieldP && Number(yieldP.value) >= 3) {
    out.push(`מדד תשואה אטרקטיבי לאזור (${Number(yieldP.value).toFixed(2)})`);
  }
  const density = paramByKey(profile, "pop_density");
  if (density && Number(density.value) >= 8000) {
    out.push("אזור אורבני עם ביקוש גבוה");
  }
  const priceUp = paramByKey(profile, "price_increases");
  if (priceUp && Number(priceUp.value) >= 2) {
    out.push("מגמת מחירים חיובית לאורך זמן");
  }
  // Positive breakdown factors as backup, filtered of sensitive topics.
  if (out.length < 3) {
    for (const f of profile.score_breakdown ?? []) {
      if (out.length >= 5) break;
      if (f.points > 0 && !HIDDEN_FACTOR_HINTS.some((h) => f.factor.includes(h))) {
        out.push(`${f.factor}${f.note ? ` — ${f.note}` : ""}`);
      }
    }
  }
  return out.slice(0, 5);
}

// Group parameters for the premium detailed report.
export const PARAM_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "אוכלוסייה ודמוגרפיה",
    keys: ["age_median", "pop_density", "acadm_cert", "med_wage", "religiosity", "religion", "own_pcnt", "rent_pcnt"],
  },
  {
    title: "נגישות ותחבורה",
    keys: ["dist_transit", "dist_train", "dist_school", "dist_central_place"],
  },
  {
    title: "סביבה ובטיחות",
    keys: ["crime_records"],
  },
  {
    title: "שווי ותשואה",
    keys: ["avg_price", "yield", "price_increases"],
  },
];
