import mashlima from "@/content/mashlima.json";
import regular from "@/content/regular.json";
import { isMonthLabel, monthOf, normalizeSearch } from "@/lib/search";

// The three string helpers live in `lib/search.ts`, which imports no content —
// /library is a client component, and importing one of them from here used to
// pull all 180 lessons into its bundle. Re-exported so every caller that had
// them from this module keeps working.
export { isMonthLabel, monthOf, normalizeSearch };

/**
 * Every lesson in the 180-lesson package carries this. `domain` is the one axis
 * that is clean on all 180 and covers all 180 — see `domainOf`. `month` is not
 * clean (12 lessons repeat the whole meta line into it), so read it through
 * `monthOf` like every other month field.
 */
export type Tags = {
  audience: string; category: string; domain: string; subtopic: string; month: string; keywords: string[];
};

export type Mashlima = {
  id: string; num: number; audience: string; title: string; meta: string; month: string;
  background: string[]; objectives: string[]; opening: string; story: string[]; activity: string;
  transition: string; crafts: { t: string; body: string }[]; rhyme: string[]; summary: string[];
  extensions: string[]; worksheet: string; tags?: Tags;
};
export type Regular = {
  id: string; topic: string; day: number; audience: string; title: string; meta: string;
  opening: string; teacherKnowledge: string[]; childLearning: string[]; deepening: string[];
  questions: string[]; summary: string; pasuk: string[]; sources: string; transitions: string[];
  crafts: { t: string; body: string }[]; worksheet: string; tags?: Tags;
};

export const mashlimaLessons = mashlima as Mashlima[];
export const regularLessons = regular as Regular[];

/**
 * The subject a lesson belongs to, off `tags.domain`. This is the only filter
 * axis that is both filled on all 180 lessons and free of the meta-line leakage
 * the month fields have. It is two axes stacked, as the package ships it: the
 * משלימה lessons carry the seven subject domains of tags-taxonomy.json
 * ("טבע וצומח", "בעלי מלאכה", …) and the רגילה lessons carry their three unit
 * categories ("חגי השנה ומועדים", "ערכים ואמונה", "פרשת השבוע ותורה"). Ten
 * values, no overlap, every lesson in exactly one — which is what a reader
 * picking one off a dropdown wants.
 */
export function domainOf(lesson: Mashlima | Regular): string {
  return (lesson.tags?.domain || "").trim();
}

export function allDomains(): string[] {
  const set = new Set<string>();
  (mashlimaLessons as (Mashlima | Regular)[]).concat(regularLessons).forEach((l) => {
    const d = domainOf(l);
    if (d) set.add(d);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
}

/**
 * How many lessons the רגילה unit named `topic` actually holds, counted from the
 * corpus rather than assumed. The units are not all five long: the 13 holiday
 * and value units are (65 lessons), but the five פרשות השבוע books hold 12, 11,
 * 10, 10 and 11 — one lesson per parasha — so a fixed "מתוך 5" is wrong for 54
 * of the 119, and reads as "מפגש 12 מתוך 5" against the lesson's own meta line.
 *
 * 0 for a topic that is not in the corpus, so a caller can leave the total out
 * rather than print a made-up one.
 */
const UNIT_SIZES = new Map<string, number>();
for (const l of regularLessons) UNIT_SIZES.set(l.topic, (UNIT_SIZES.get(l.topic) || 0) + 1);

export function unitSizeOf(topic: string): number {
  return UNIT_SIZES.get(topic) || 0;
}

export function allMonths(): string[] {
  const set = new Set<string>();
  (mashlimaLessons as (Mashlima | Regular)[]).concat(regularLessons).forEach((l) => {
    const m = monthOf((l as Mashlima).month || l.meta);
    if (isMonthLabel(m)) set.add(m);
  });
  return Array.from(set);
}

export function findLesson(id: string): Mashlima | Regular | undefined {
  return (mashlimaLessons as any[]).concat(regularLessons as any[]).find((l) => l.id === id);
}

/** Every string a lesson holds, one per line, normalized — minus the id slug. */
export function searchTextOf(lesson: Mashlima | Regular): string {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as object).forEach(walk);
  };
  Object.entries(lesson as Record<string, unknown>).forEach(([k, v]) => { if (k !== "id") walk(v); });
  // Each field normalized on its own and then joined on newline, not
  // concatenated: a term must sit inside one field, not straddle the seam
  // between two. (Normalizing the joined string would collapse the seams away.)
  return out.map(normalizeSearch).filter(Boolean).join("\n");
}

/**
 * Lesson id → its whole searchable text, for the whole corpus. Built once at
 * build time and served as a static file by /api/library-index, because it is
 * 2.7 MB: /library used to compute it in the browser, which meant every visit
 * downloaded all 180 lessons (422 kB of route JS) before a single card could be
 * shown, whether or not anyone searched. Now the page ships the cards and this
 * arrives only when someone types.
 *
 * Server-only — importing it into a client component would put the corpus back
 * in the bundle. /library's client half talks to the route, not to this.
 */
export function searchIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  (mashlimaLessons as (Mashlima | Regular)[]).concat(regularLessons).forEach((l) => {
    index[l.id] = searchTextOf(l);
  });
  return index;
}
