import catalog from "@/content/catalog.json";

export type ShelfKind = "pdf" | "image" | "doc" | "media" | "gapp";

export type ShelfItem = {
  id: string;
  title: string;
  category: string;
  sender: string;
  date: string;
  mime: string;
  file: string; // public URL / path (local asset or /api/drive/{id})
  sizeKB: number;
  kind: ShelfKind;
  viewUrl?: string; // Drive view link (fallback for non-embeddable types)
  hiddenPages?: number[]; // admin-trimmed pages (e.g. leading email page) — dropped everywhere
  source?: "seed" | "upload" | "drive";
};

// Pedagogical / Hebrew-calendar ordering — "סיווג לפי סדר".
// Every category the shelf actually holds must appear here: this list is both the
// chip order on /shelf and the whole set of options on /shelf/upload, so anything
// missing is a category a teacher can browse but cannot file into.
// Order: the holidays as the school year meets them, then the year-round groups —
// the weekly parasha, the skills, the activity types, and finally the catch-all.
export const CATEGORY_ORDER: string[] = [
  "ראש השנה / תשרי",
  "חנוכה",
  'ט"ו בשבט',
  "פורים",
  "פסח",
  'ספירת העומר / ל"ג בעומר',
  "שבועות",
  "תשעה באב / בין המצרים",
  "סוף שנה / קיץ",
  "שבת ופרשת שבוע",
  "מיומנויות — קריאה ושפה",
  "מיומנויות — מוכנות חשבון",
  "מיומנויות — גרפומוטוריקה",
  "מיומנויות — תפיסה חזותית",
  "מידות ורגש",
  "דפי עבודה",
  "דפי צביעה",
  "יצירה ואומנות",
  "משחקים והפעלות",
  "סיפורים ושירים",
  "כללי",
];

export function categoryRank(cat: string): number {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

export const seedItems: ShelfItem[] = (catalog as ShelfItem[]).map((x) => ({
  ...x,
  source: "seed",
}));

// A category not in CATEGORY_ORDER — one arriving from the Drive catalog, say —
// ranks equal to every other unknown, so without a name tie-break its items get
// scattered through the tail by date instead of staying together.
function byCategory(a: string, b: string): number {
  return categoryRank(a) - categoryRank(b) || a.localeCompare(b, "he");
}

export function sortItems(items: ShelfItem[]): ShelfItem[] {
  return [...items].sort(
    (a, b) =>
      byCategory(a.category, b.category) ||
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      a.title.localeCompare(b.title, "he")
  );
}

export function orderedCategories(items: ShelfItem[]): string[] {
  const set = new Set(items.map((i) => i.category));
  return Array.from(set).sort(byCategory);
}

export function allSenders(items: ShelfItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.sender).filter(Boolean)));
}
