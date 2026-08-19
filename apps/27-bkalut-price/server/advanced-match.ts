/**
 * Advanced profile matcher (deterministic / rule-based).
 *
 * Takes free-text and/or a structured profile and scores every right in the
 * data set against derived signals (age, family status, children, income,
 * disability, employment, housing, business, pension, holocaust survivor,
 * student, oleh, etc.). Returns a sorted list of candidate rights with
 * matched signals, reasons, score and a potential level (high/medium/low).
 *
 * No LLM is invoked. We do NOT claim AI-style reasoning — the matcher is
 * a transparent rule-based search over the existing fields (publicSiteText,
 * eligibility, audience, aiSearch, aiExtra, documents, etc.).
 */
import type { RightRow } from "@shared/schema";

export interface ProfileSignal {
  key: string;
  label: string;
  // raw terms (Hebrew/English) we will look for in the right text
  terms: string[];
  weight: number;
  // optional severity tag for the response
  severity?: "high" | "medium" | "low";
}

export interface ParsedProfile {
  raw: string;
  // structured fields (any of these may be undefined)
  age?: number;
  familyStatus?: string;
  childrenCount?: number;
  income?: number;
  hasDisability?: boolean;
  hasHealthIssue?: boolean;
  employment?: string;
  housing?: string;
  hasBusiness?: boolean;
  hasPension?: boolean;
  holocaustSurvivor?: boolean;
  student?: boolean;
  oleh?: boolean;
  city?: string;
  notes?: string;
  // computed signals
  signals: ProfileSignal[];
}

export interface MatchHit {
  rightId: number;
  topic: string;
  category: string;
  subCategory: string;
  audience: string;
  publicSiteText: string;
  eligibilitySnippet: string;
  serviceUrl: string;
  haredi: string;
  score: number;
  potentialLevel: "גבוה" | "בינוני" | "נמוך";
  potentialScore: number; // 0..100
  matchedSignals: string[];
  matchedKeywords: string[];
  reason: string;
}

function normalize(value: string) {
  return (value || "")
    .toString()
    .toLowerCase()
    .replace(/[״"]/g, "")
    .replace(/[׳']/g, "")
    .replace(/[֑-ׇ]/g, "")
    .trim();
}

function joinRightSearchText(r: RightRow): string {
  return normalize(
    [
      r.topic, r.category, r.subCategory, r.treatingBody, r.audience,
      r.whatReceived, r.eligibility, r.qualifyingCases, r.preparation,
      r.documents, r.howToApply, r.publicSiteText, r.faq, r.goldTip,
      r.aiSearch, r.aiExtra, r.haredi,
    ].filter(Boolean).join(" \n "),
  );
}

/**
 * Parse a free-text or JSON payload into a structured ParsedProfile.
 * Accepts either:
 *  - A JSON object with named fields (age, familyStatus, childrenCount, income, ...)
 *  - A free-text Hebrew/English paragraph; we'll best-effort extract signals.
 */
export function parseProfile(input: string | Record<string, unknown>): ParsedProfile {
  let raw = "";
  let obj: Record<string, unknown> | null = null;
  if (typeof input === "string") {
    raw = input;
    const trimmed = input.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try { obj = JSON.parse(trimmed); } catch { obj = null; }
    }
  } else if (input && typeof input === "object") {
    obj = input;
    raw = JSON.stringify(input);
  }
  const n = normalize(raw);
  const profile: ParsedProfile = { raw, signals: [] };

  // ---- Structured extraction (highest priority) ----
  if (obj) {
    if (typeof obj.age === "number") profile.age = obj.age;
    else if (typeof obj.age === "string" && /^\d+$/.test(obj.age)) profile.age = Number(obj.age);
    if (typeof obj.familyStatus === "string") profile.familyStatus = obj.familyStatus;
    if (typeof obj.childrenCount === "number") profile.childrenCount = obj.childrenCount;
    else if (typeof obj.children === "number") profile.childrenCount = obj.children as number;
    if (typeof obj.income === "number") profile.income = obj.income;
    if (typeof obj.monthlyIncome === "number") profile.income = obj.monthlyIncome as number;
    if (typeof obj.employment === "string") profile.employment = obj.employment;
    if (typeof obj.housing === "string") profile.housing = obj.housing;
    if (typeof obj.city === "string") profile.city = obj.city;
    if (typeof obj.notes === "string") profile.notes = obj.notes;
    if (typeof obj.disability === "boolean") profile.hasDisability = obj.disability as boolean;
    if (typeof obj.health === "boolean") profile.hasHealthIssue = obj.health as boolean;
    if (typeof obj.business === "boolean") profile.hasBusiness = obj.business as boolean;
    if (typeof obj.pension === "boolean") profile.hasPension = obj.pension as boolean;
    if (typeof obj.holocaustSurvivor === "boolean") profile.holocaustSurvivor = obj.holocaustSurvivor as boolean;
    if (typeof obj.student === "boolean") profile.student = obj.student as boolean;
    if (typeof obj.oleh === "boolean") profile.oleh = obj.oleh as boolean;
  }

  // ---- Free-text heuristics ----
  // Age: "בן 67", "גיל 67", "67 שנים", "age 67"
  if (profile.age == null) {
    const m = n.match(/(?:בן|בת|גיל|age)\s*(\d{1,3})|(\d{1,3})\s*שנים/);
    if (m) {
      const v = Number(m[1] || m[2]);
      if (v >= 0 && v < 130) profile.age = v;
    }
  }
  // Children count: "5 ילדים", "אם ל-3", "אבא ל4"
  if (profile.childrenCount == null) {
    const m = n.match(/(\d{1,2})\s*ילד(?:ים|ות)?|(?:אם|אבא|הורה|אבי|אם ל[- ]?)\s*(\d{1,2})/);
    if (m) {
      const v = Number(m[1] || m[2]);
      if (v >= 0 && v < 30) profile.childrenCount = v;
    }
  }
  // Income: "שכר 7000", "הכנסה 5000", "מרוויח 4500"
  if (profile.income == null) {
    const m = n.match(/(?:שכר|הכנסה|מרוויח|הכנסה חודשית|נטו)\s*[:\-]?\s*(\d{3,6})/);
    if (m) profile.income = Number(m[1]);
  }
  // Booleans by keyword presence (only set true)
  if (profile.hasDisability == null && /נכ(?:ה|ות)|מוגבלות|נכות רפואית|אחוזי נכות/.test(n)) profile.hasDisability = true;
  if (profile.hasHealthIssue == null && /חול(?:ה|ת)|מחל(?:ה|ת)|טיפול רפואי|תרופות יקרות|כרוני|אונקולוגי|דיאליזה/.test(n)) profile.hasHealthIssue = true;
  if (profile.hasBusiness == null && /עוסק (?:פטור|מורשה|זעיר)|עצמאי|עסק (?:קטן|זעיר|משפחתי)|בעל עסק/.test(n)) profile.hasBusiness = true;
  if (profile.hasPension == null && /פנסי(?:ה|ת)|קרן השתלמות|פנסיונר|גמלא(?:י|ית)|זקנה/.test(n)) profile.hasPension = true;
  if (profile.holocaustSurvivor == null && /ניצול(?:ת)? שואה|ניצולי שואה|ניצולי השואה/.test(n)) profile.holocaustSurvivor = true;
  if (profile.student == null && /סטודנט(?:ית)?|תלמיד(?:ה)? מכינה|אברך|כולל/.test(n)) profile.student = true;
  if (profile.oleh == null && /עול(?:ה|ים) חדש|עלייה|מכון קליטה|תושב חוזר/.test(n)) profile.oleh = true;
  if (!profile.employment && /אבטל(?:ה|ת)|מובטל(?:ת)?|פוטר(?:ה|תי)?|מחפש עבודה|דורש עבודה/.test(n)) profile.employment = "אבטלה";
  if (!profile.employment && /שכיר(?:ה)?|עובד(?:ת)? במשרה/.test(n)) profile.employment = "שכיר";
  if (!profile.housing && /שכירות|שכר דירה|דמי שכירות/.test(n)) profile.housing = "שכירות";
  if (!profile.housing && /משכנת(?:א|ה)|רכישת דירה/.test(n)) profile.housing = "משכנתא";
  if (!profile.familyStatus && /גרוש(?:ה)?/.test(n)) profile.familyStatus = "גרוש";
  if (!profile.familyStatus && /אלמן(?:ה)?/.test(n)) profile.familyStatus = "אלמן";
  if (!profile.familyStatus && /רווק(?:ה)?/.test(n)) profile.familyStatus = "רווק";
  if (!profile.familyStatus && /נשוי(?:ה)?|נשואים/.test(n)) profile.familyStatus = "נשוי";
  if (!profile.familyStatus && /חד הורי(?:ת)?|חד-הורי(?:ת)?/.test(n)) profile.familyStatus = "חד הורי";

  // ---- Compose signals (terms used for fuzzy matching against right text) ----
  const signals: ProfileSignal[] = [];
  if (profile.age != null) {
    if (profile.age >= 67) signals.push({ key: "elderly", label: "אזרח ותיק", terms: ["אזרח ותיק", "קשיש", "פנסיה", "סיעוד", "זקנה", "פנסיונר", "אזרחים ותיקים"], weight: 8, severity: "high" });
    if (profile.age >= 18 && profile.age <= 25) signals.push({ key: "young_adult", label: "צעיר/ה", terms: ["צעיר", "צעירים", "מכינה", "צבא", "שירות לאומי"], weight: 4 });
  }
  if ((profile.childrenCount ?? 0) > 0) {
    signals.push({ key: "children", label: `הורה ל-${profile.childrenCount} ילדים`, terms: ["ילד", "ילדים", "משפחה", "מעון", "צהרון", "תינוק", "לידה", "ילדי גן", "הורים", "קצבת ילדים"], weight: 7, severity: "high" });
    if ((profile.childrenCount ?? 0) >= 4) signals.push({ key: "many_children", label: "משפחה ברוכת ילדים", terms: ["משפחה ברוכת ילדים", "מרובת ילדים", "ילדים ברוכי"], weight: 5, severity: "high" });
  }
  if (profile.income != null && profile.income < 7000) {
    signals.push({ key: "low_income", label: "הכנסה נמוכה", terms: ["הכנסה נמוכה", "הבטחת הכנסה", "השלמת הכנסה", "מענק עבודה", "מצוקה כלכלית", "סיוע כלכלי", "ניצולת מצוקה"], weight: 8, severity: "high" });
  }
  if (profile.hasDisability) signals.push({ key: "disability", label: "נכות / מוגבלות", terms: ["נכות", "מוגבלות", "נכה", "אחוזי נכות", "ניידות", "שיקום", "ילד נכה"], weight: 9, severity: "high" });
  if (profile.hasHealthIssue) signals.push({ key: "health", label: "בריאות / טיפולים", terms: ["בריאות", "קופת חולים", "החזר", "תרופות", "טיפול", "ציוד רפואי", "מחלה כרונית"], weight: 6, severity: "medium" });
  if (profile.employment === "אבטלה") signals.push({ key: "unemployed", label: "אבטלה", terms: ["אבטלה", "דמי אבטלה", "פוטר", "לשכת התעסוקה", "מחפש עבודה"], weight: 7, severity: "high" });
  if (profile.employment === "שכיר") signals.push({ key: "employee", label: "שכיר/ה", terms: ["שכיר", "עובד שכיר", "תלוש שכר", "פנסיה", "פיצויים", "הפרשות"], weight: 3 });
  if (profile.housing === "שכירות") signals.push({ key: "rent", label: "מתגורר בשכירות", terms: ["שכר דירה", "סיוע בשכר דירה", "שכירות", "דיור ציבורי"], weight: 6, severity: "medium" });
  if (profile.housing === "משכנתא") signals.push({ key: "mortgage", label: "משכנתא", terms: ["משכנתא", "רכישת דירה", "סיוע לרכישת דירה", "זכאות דיור"], weight: 6, severity: "medium" });
  if (profile.hasBusiness) signals.push({ key: "business", label: "בעל/ת עסק / עצמאי/ת", terms: ["עצמאי", "עוסק פטור", "עוסק מורשה", "עוסק זעיר", "עסק", "מע\"מ", "מס בריאות", "ביטוח לאומי עצמאים"], weight: 6, severity: "medium" });
  if (profile.hasPension) signals.push({ key: "pension", label: "פנסיה / קרנות", terms: ["פנסיה", "קרן השתלמות", "ניוד פנסיה", "פנסיונר", "קצבת זקנה"], weight: 5 });
  if (profile.holocaustSurvivor) signals.push({ key: "holocaust", label: "ניצול/ת שואה", terms: ["ניצולי שואה", "ניצולת שואה", "ניצול שואה", "ועידת התביעות", "רנטה"], weight: 10, severity: "high" });
  if (profile.student) signals.push({ key: "student", label: "סטודנט/אברך", terms: ["סטודנט", "מכינה", "מלגות", "אברך", "כולל", "ישיבה"], weight: 4 });
  if (profile.oleh) signals.push({ key: "oleh", label: "עולה חדש", terms: ["עולה חדש", "עליה", "תושב חוזר", "סל קליטה"], weight: 6, severity: "medium" });
  if (profile.familyStatus === "חד הורי") signals.push({ key: "single_parent", label: "חד הורי/ת", terms: ["חד הורי", "חד-הורי", "אם חד הורית", "אב חד הורי"], weight: 8, severity: "high" });
  if (profile.familyStatus === "אלמן") signals.push({ key: "widow", label: "אלמן/ה", terms: ["אלמן", "אלמנה", "שאירים", "קצבת שאירים"], weight: 7, severity: "high" });
  if (profile.familyStatus === "גרוש") signals.push({ key: "divorced", label: "גרוש/ה", terms: ["גרוש", "גרושה", "מזונות", "הסכם גירושין"], weight: 5 });

  profile.signals = signals;
  return profile;
}

interface MatchOptions {
  maxResults?: number;
  minScore?: number;
}

export function matchProfile(profile: ParsedProfile, rights: RightRow[], opts: MatchOptions = {}): MatchHit[] {
  const maxResults = opts.maxResults ?? 25;
  const minScore = opts.minScore ?? 2;
  const freeTextWords = Array.from(new Set(
    normalize(profile.raw).split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 3),
  ));

  const hits: MatchHit[] = [];
  for (const right of rights) {
    const text = joinRightSearchText(right);
    let score = 0;
    const matchedSignals: string[] = [];
    const matchedKeywords: string[] = [];

    for (const signal of profile.signals) {
      for (const term of signal.terms) {
        const t = normalize(term);
        if (t && text.includes(t)) {
          score += signal.weight + (t.length > 6 ? 1 : 0);
          if (!matchedSignals.includes(signal.label)) matchedSignals.push(signal.label);
          if (!matchedKeywords.includes(term)) matchedKeywords.push(term);
          break; // count each signal once
        }
      }
    }

    for (const word of freeTextWords) {
      if (text.includes(word) && !matchedKeywords.includes(word)) {
        score += 1;
        matchedKeywords.push(word);
        if (matchedKeywords.length > 10) break;
      }
    }

    // Priority boost from the data sheet (lower priority number = higher priority)
    if (right.priority) {
      const boost = Math.max(0, 4 - Math.floor(right.priority / 80));
      score += boost;
    }

    if (score < minScore) continue;

    // Normalize to 0..100 for "potential". Roughly: 30+ => high, 15..29 => med, else low
    const potentialScore = Math.max(5, Math.min(100, Math.round(score * 3)));
    const potentialLevel: MatchHit["potentialLevel"] =
      potentialScore >= 70 ? "גבוה" : potentialScore >= 35 ? "בינוני" : "נמוך";

    const eligibilitySnippet = (right.eligibility || right.publicSiteText || right.whatReceived || "")
      .toString()
      .slice(0, 220);

    const reason = matchedSignals.length
      ? `התאמה לפי: ${matchedSignals.slice(0, 4).join(", ")}${matchedKeywords.length ? ` · מילים: ${matchedKeywords.slice(0, 5).join(", ")}` : ""}`
      : matchedKeywords.length
        ? `התאמה לפי מילים בטקסט הזכות: ${matchedKeywords.slice(0, 6).join(", ")}`
        : "התאמה כללית";

    hits.push({
      rightId: right.id,
      topic: right.topic,
      category: right.category,
      subCategory: right.subCategory,
      audience: right.audience,
      publicSiteText: (right.publicSiteText || "").slice(0, 320),
      eligibilitySnippet,
      serviceUrl: right.serviceUrl,
      haredi: right.haredi,
      score,
      potentialScore,
      potentialLevel,
      matchedSignals,
      matchedKeywords,
      reason,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, maxResults);
}

/**
 * Convenience: parse + match in one call. Returns parsed profile (for echo)
 * and the ranked hits.
 */
export function runAdvancedMatch(
  input: string | Record<string, unknown>,
  rights: RightRow[],
  opts: MatchOptions = {},
) {
  const profile = parseProfile(input);
  const hits = matchProfile(profile, rights, opts);
  return { profile, hits };
}
