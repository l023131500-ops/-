/**
 * Normalizes free-form questionnaire definitions (from the XLSX-driven rights
 * data) into a strict typed schema. Bug fixes:
 *   - Do not ask numeric/text questions as yes/no.
 *   - De-duplicate identical / near-identical questions across eligibility & intake.
 *   - Infer field types from the question text.
 *
 * Question shape returned to the client:
 *   { id, label, help?, required?, type, options?, weight? }
 *   type: "yesno" | "number" | "text" | "textarea" | "date" | "tel" | "email" | "file" | "select"
 */

export interface NormalizedQuestion {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  type: "yesno" | "number" | "text" | "textarea" | "date" | "tel" | "email" | "file" | "select";
  options?: string[];
  weight?: number;
  unit?: string;
}

const NUMBER_HINTS = [
  /\bכמה\b/, /\bמספר\b/, /סכום/, /מצרף\s*בש[חב]/, /גיל\b/, /הכנס[הת]/, /משכורת/,
  /גובה\s+החוב/, /חוב\s+מצטבר/, /משכורת/, /הוצאה/, /\bש"ח\b/, /\₪/,
  /אחוז/, /שיעור/,
];
const DATE_HINTS = [/תאריך/, /מאיזה\s+יום/, /מתי\s+(התחיל|נולד|חודל)/];
const PHONE_HINTS = [/טלפון/, /נייד/, /מספר\s+פלאפון/];
const EMAIL_HINTS = [/דוא[\"\u05f4״]*ל/, /אימייל/, /מייל\b/];
const FILE_HINTS = [/אישור|תעוד[הת]|אסמכת|מסמך|טופס\s*\d|צילום|חשבונית/];
const LONG_TEXT_HINTS = [/פרט/, /הסבר/, /תאר/, /רקע|נסיבות|הערות/];

/** Yes/No questions are eligibility-style questions where the user picks
 *  yes / no / "don't know". A question is treated as yes/no ONLY when:
 *    1. The source row marks `type` as boolean/yesno explicitly, OR
 *    2. The Hebrew text starts with one of the eligibility cues
 *       (האם / יש לך / האם את / האם הינך / האם קיים / מקבלים אתם / מקבל אתה).
 */
const YESNO_OPENERS = [
  "האם", "יש לך", "האם את", "האם הינך", "האם קיים", "האם קיימת",
  "האם אתה", "מקבל", "מקבלים", "מקבלת", "מקבלות", "האם יש",
];

function pickType(label: string, declared?: string): NormalizedQuestion["type"] {
  const t = String(declared ?? "").toLowerCase();
  if (t === "yesno" || t === "boolean" || t === "bool" || t === "yes_no" || t === "checkbox") return "yesno";
  if (t === "number" || t === "numeric" || t === "int" || t === "currency" || t === "amount") return "number";
  if (t === "date") return "date";
  if (t === "tel" || t === "phone") return "tel";
  if (t === "email") return "email";
  if (t === "file" || t === "document") return "file";
  if (t === "select" || t === "choice" || t === "enum") return "select";
  if (t === "textarea" || t === "longtext" || t === "long_text") return "textarea";
  if (t === "text") {
    // Even when declared text, prefer numeric for clearly numeric prompts.
    if (NUMBER_HINTS.some((rx) => rx.test(label))) return "number";
    return "text";
  }

  // No reliable declared type — infer from the question text.
  if (FILE_HINTS.some((rx) => rx.test(label))) return "file";
  if (DATE_HINTS.some((rx) => rx.test(label))) return "date";
  if (PHONE_HINTS.some((rx) => rx.test(label))) return "tel";
  if (EMAIL_HINTS.some((rx) => rx.test(label))) return "email";
  if (NUMBER_HINTS.some((rx) => rx.test(label))) return "number";

  const trimmed = label.trim();
  for (const opener of YESNO_OPENERS) {
    if (trimmed.startsWith(opener + " ") || trimmed.startsWith(opener + "?")) return "yesno";
  }

  if (LONG_TEXT_HINTS.some((rx) => rx.test(label))) return "textarea";
  // Default short text — but only for clearly free-text prompts.
  return "text";
}

function safeJsonParse(raw: string): any {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractList(parsed: any): any[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  if (Array.isArray(parsed.fields)) return parsed.fields;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.documents)) return parsed.documents;
  return [];
}

function cleanLabel(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function fingerprint(label: string): string {
  // Strip punctuation, prefixes like "1.", normalize whitespace, lowercase Latin.
  return cleanLabel(label)
    .replace(/^[\d\.\)\-\u2022\s]+/, "")
    .replace(/[?!.,:;"'״׳״()\[\]]/g, "")
    .toLowerCase();
}

export function normalizeQuestions(raw: string, kind: "eligibility" | "intake" | "documents"): NormalizedQuestion[] {
  const list = extractList(safeJsonParse(raw));
  const seen = new Set<string>();
  const out: NormalizedQuestion[] = [];
  list.forEach((item: any, index: number) => {
    const labelRaw = String(
      item.question ?? item.label ?? item.text ?? item.title ?? item.name ?? item["שאלה"] ?? item["מסמך"] ?? "",
    );
    const label = cleanLabel(labelRaw);
    if (!label) return;
    const fp = fingerprint(label);
    if (seen.has(fp)) return;
    seen.add(fp);
    let declaredType = item.type ?? item.inputType ?? item["סוג"];
    if (kind === "documents") declaredType = declaredType || "file";
    const type = pickType(label, declaredType);
    const required = Boolean(item.required ?? item.mandatory ?? item["חובה"]);
    const help = item.help ?? item.description ?? item.note ?? item["הסבר"];
    const weight = Number(item.weight ?? item.score ?? 1) || 1;
    let options: string[] | undefined;
    if (type === "select") {
      const o = item.options ?? item.choices ?? item["אפשרויות"];
      if (Array.isArray(o)) options = o.map((v) => String(v)).filter(Boolean);
    }
    const id = String(item.id ?? item.key ?? item.name ?? `${kind}_${index + 1}`);
    out.push({ id, label, help: help ? String(help) : undefined, required, type, options, weight });
  });
  return out;
}

/** De-duplicate a merged list of normalized questions. Drops later occurrences with the same fingerprint. */
export function mergeDeduped(...lists: NormalizedQuestion[][]): NormalizedQuestion[] {
  const seen = new Set<string>();
  const out: NormalizedQuestion[] = [];
  for (const list of lists) {
    for (const q of list) {
      const fp = fingerprint(q.label);
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push(q);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Eligibility filler detection + smart generator
// ---------------------------------------------------------------------------

/** Generic filler questions that have no scoring value when they appear alone
 *  (e.g. "תושב ישראל?" on a right that's clearly internal). We drop them
 *  unless the topic is *about* residency / status. */
const FILLER_PATTERNS: RegExp[] = [
  /^האם\s+הינ[ךך]\s+תושב\s*ישראל\??$/,
  /^האם\s+את\s+תושב\s*ישראל\??$/,
  /^האם\s+אתה\s+תושב\s*ישראל\??$/,
  /^תושב\s+ישראל\??$/,
];

const RESIDENCY_TOPIC_HINTS = [/עליה/, /עולה\s+חדש/, /אזרחות/, /תושבות/, /אשרה/, /הגירה/];

function isFiller(label: string, topic: string, category: string): boolean {
  if (FILLER_PATTERNS.some((rx) => rx.test(label.trim()))) {
    const combined = `${topic} ${category}`;
    // If the topic itself is about residency/aliyah we keep it (then it is meaningful).
    if (RESIDENCY_TOPIC_HINTS.some((rx) => rx.test(combined))) return false;
    return true;
  }
  return false;
}

export function filterFillerQuestions(
  questions: NormalizedQuestion[],
  topic: string,
  category: string,
): NormalizedQuestion[] {
  return questions.filter((q) => !isFiller(q.label, topic, category));
}

/** Heuristic category-aware fallback question generator. Triggered when the
 *  XLSX-driven JSON has no usable eligibility questions, or only filler. The
 *  output asks the central eligibility drivers and pitfalls for the topic
 *  (income, age, family, employment, health, etc.) so the public eligibility
 *  score is meaningful. */
export function generateFallbackEligibility(
  topic: string,
  category: string,
  audience: string,
  eligibilityText: string,
  publicSiteText: string,
): NormalizedQuestion[] {
  const haystack = `${topic} ${category} ${audience} ${eligibilityText} ${publicSiteText}`;
  const out: NormalizedQuestion[] = [];

  function add(q: NormalizedQuestion) {
    if (out.some((o) => fingerprint(o.label) === fingerprint(q.label))) return;
    out.push(q);
  }

  const tests = {
    income: /הכנסה|משכורת|רמת\s*הכנסה|הכנסה\s*נמוכה|מענק|תוספת\s*הכנסה/,
    age: /גיל|זק|קשיש|מבוגר|ותיק|פנסיוני/,
    elderly: /זקנ|קשיש|ותיק|פנסיוני|אזרח\s+ותיק|65|67/,
    kids: /ילד|תינוק|לידה|הריון|משפח|הורי|הורות|אומנ/,
    family: /משפח|זוג|אלמנ|גרוש|חד\s*הור/,
    health: /בריאות|מחל|רפוא|טיפול|תרופ|נכ[הות]|נכי|נפש/,
    disability: /נכ[הות]|נכי|מוגבל|אובדן\s*כושר|אחוז[יו]?\s*נכ/,
    employment: /תעסוק|עבודה|מעסיק|מובטל|שכיר|עצמא|דמי\s*אבטלה|פיטור/,
    business: /עוסק|עצמא|מע\"מ|מס\s*הכנסה|חוב.*עסק|בית\s*עסק/,
    housing: /דיור|שיכ|שכ"ד|שכר\s*דירה|משכנתא|זכאות.*דיור|הנחת.*דיור/,
    discount: /הנח[הת]|פטור|הנחת|הנחות/,
    army: /חייל|מילואים|צה"ל|שירות\s*צבא|חיילים\s*משוחררים/,
    haredi: /חרדי|תורתו|אברך|כולל|ישיב/,
    documents: /אסמכת|אישור|תעודת|טופס|הגשת\s*בקשה/,
    holocaust: /שואה|ניצול|רדיפ|רדיפת\s*הנאצים/,
    bituachLeumi: /ביטוח\s*לאומי|מל"ל/,
    debt: /חוב|הוצאה\s*לפועל|פש"ר|פשיטת\s*רגל/,
  };

  // Always start with the central anchor question.
  add({
    id: "central_topic_relevance",
    label: `האם המצב שלך מתאים לתיאור: "${topic}"?`,
    type: "yesno",
    weight: 3,
  });

  if (tests.income.test(haystack)) {
    add({ id: "income_amount", label: "מה ההכנסה החודשית הממוצעת של משק הבית (בש\"ח)?", type: "number", weight: 2 });
    add({ id: "income_low", label: "האם ההכנסה נמוכה מהשכר הממוצע במשק?", type: "yesno", weight: 2 });
  }
  if (tests.age.test(haystack) || tests.elderly.test(haystack)) {
    add({ id: "age_value", label: "מה הגיל שלך (או של מי שהזכאות עבורו)?", type: "number", weight: 2 });
  }
  if (tests.elderly.test(haystack)) {
    add({ id: "is_elderly", label: "האם הגעת לגיל פרישה / אזרח ותיק?", type: "yesno", weight: 2 });
  }
  if (tests.kids.test(haystack)) {
    add({ id: "kids_count", label: "כמה ילדים יש במשק הבית?", type: "number", weight: 1 });
    add({ id: "has_baby", label: "האם יש תינוק/ת או לידה בשנה האחרונה?", type: "yesno", weight: 1 });
  }
  if (tests.family.test(haystack)) {
    add({ id: "family_status", label: "האם המצב המשפחתי כולל אלמנות, גירושין או חד-הורי?", type: "yesno", weight: 1 });
  }
  if (tests.health.test(haystack) || tests.disability.test(haystack)) {
    add({ id: "has_disability", label: "האם יש בעיה רפואית / נכות / מוגבלות תפקודית?", type: "yesno", weight: 2 });
    add({ id: "disability_percent", label: "אם יש אחוזי נכות מוכרים — כמה אחוז (0 אם אין)?", type: "number", weight: 1 });
  }
  if (tests.employment.test(haystack)) {
    add({ id: "is_employed", label: "האם הינך מועסק/ת כיום?", type: "yesno", weight: 1 });
    add({ id: "is_unemployed", label: "האם פוטרת או הפסקת לעבוד ב-12 החודשים האחרונים?", type: "yesno", weight: 2 });
  }
  if (tests.business.test(haystack)) {
    add({ id: "is_self_employed", label: "האם הינך עצמאי / בעל עסק?", type: "yesno", weight: 1 });
  }
  if (tests.housing.test(haystack)) {
    add({ id: "rent_or_mortgage", label: "האם משלמים שכר דירה או משכנתא חודשית?", type: "yesno", weight: 1 });
    add({ id: "monthly_housing_cost", label: "מהי ההוצאה החודשית על דיור (בש\"ח)?", type: "number", weight: 1 });
  }
  if (tests.discount.test(haystack)) {
    add({ id: "already_receives_discount", label: "האם כבר מקבלים הנחה / פטור דומה במקור אחר?", type: "yesno", weight: 1 });
  }
  if (tests.army.test(haystack)) {
    add({ id: "served_army", label: "האם שירת בצה\"ל / שירות לאומי?", type: "yesno", weight: 2 });
  }
  if (tests.haredi.test(haystack)) {
    add({ id: "torato_umanuto", label: "האם תורתו אומנותו (אברך / לומד בישיבה / כולל)?", type: "yesno", weight: 1 });
  }
  if (tests.holocaust.test(haystack)) {
    add({ id: "holocaust_survivor", label: "האם ניצול שואה או בן משפחה של ניצול?", type: "yesno", weight: 3 });
  }
  if (tests.debt.test(haystack)) {
    add({ id: "in_debt_process", label: "האם בהליך חוב / הוצאה לפועל / פשיטת רגל?", type: "yesno", weight: 2 });
  }
  if (tests.bituachLeumi.test(haystack)) {
    add({ id: "has_bituach_status", label: "האם יש לך תיק פעיל בביטוח הלאומי לזכות זו?", type: "yesno", weight: 1 });
  }
  if (tests.documents.test(haystack)) {
    add({ id: "has_documents", label: "האם יש בידך את האסמכתות / המסמכים הנדרשים?", type: "yesno", weight: 1 });
  }

  // Pitfalls — common reasons people miss the right.
  add({ id: "already_applied", label: "האם כבר הגשת בקשה לזכות זו ונדחתה?", type: "yesno", weight: 1 });
  add({ id: "within_period", label: "האם הזכאות עדיין בתוקף עבורך (לא חלף המועד החוקי)?", type: "yesno", weight: 1 });

  // Guarantee a minimum useful screening set even when no domain hint matched.
  // Without this, a topic with no keywords would have only the anchor question
  // and the eligibility score would be meaningless.
  const safetyNet: NormalizedQuestion[] = [
    { id: "household_size", label: "כמה נפשות במשק הבית?", type: "number", weight: 1 },
    { id: "income_band", label: "מה ההכנסה החודשית הממוצעת של משק הבית (בש\"ח)?", type: "number", weight: 1 },
    { id: "any_disability", label: "האם יש בבית מישהו עם נכות / מחלה כרונית / ליקוי תפקודי?", type: "yesno", weight: 1 },
    { id: "single_parent_flag", label: "האם המשפחה חד-הורית (אלמן/ה, גרוש/ה, פרוד/ה)?", type: "yesno", weight: 1 },
    { id: "homeowner_flag", label: "האם הינך בעל/ת דירה?", type: "yesno", weight: 1 },
  ];
  for (const q of safetyNet) add(q);

  return out;
}

/** Decide whether to use the existing parsed list or fall back to the
 *  generator. We use the generator when the parsed list is empty after
 *  filler-filtering, or when there are fewer than 2 meaningful yesno/number
 *  questions. */
export function buildEligibilityForRight(opts: {
  parsed: NormalizedQuestion[];
  topic: string;
  category: string;
  audience: string;
  eligibilityText: string;
  publicSiteText: string;
}): NormalizedQuestion[] {
  const filtered = filterFillerQuestions(opts.parsed, opts.topic, opts.category);
  const meaningful = filtered.filter((q) => q.type === "yesno" || q.type === "number");
  if (filtered.length >= 3 && meaningful.length >= 2) return filtered;
  const generated = generateFallbackEligibility(
    opts.topic,
    opts.category,
    opts.audience,
    opts.eligibilityText,
    opts.publicSiteText,
  );
  return mergeDeduped(filtered, generated);
}

/** Detect strict modesty/intimacy sensitivity. Does NOT match general economic
 *  hardship / haredi-suitability terms. */
export function isModestySensitive(haredi: string, topic: string, category: string): boolean {
  const combined = `${haredi} ${topic} ${category}`;
  const modestyTerms = [
    /צניעות/, /צנוע/, /פוריות/, /\bפריון\b/, /הריון/, /היריון/, /\bלידה\b/,
    /אינטימ/, /אישות/, /טהרת\s+המשפחה/, /הפלה/, /\bIVF\b/, /הזרעה/,
  ];
  return modestyTerms.some((rx) => rx.test(combined));
}
