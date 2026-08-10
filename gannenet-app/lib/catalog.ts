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
export const CATEGORY_ORDER: string[] = [
  "ראש השנה / תשרי",
  "חנוכה",
  'ט"ו בשבט',
  "פורים",
  "פסח",
  "שבועות",
  "תשעה באב / בין המצרים",
  "סוף שנה / קיץ",
  "דפי עבודה",
  "דפי צביעה",
  "יצירה ואומנות",
];

export function categoryRank(cat: string): number {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

export const seedItems: ShelfItem[] = (catalog as ShelfItem[]).map((x) => ({
  ...x,
  source: "seed",
}));

export function sortItems(items: ShelfItem[]): ShelfItem[] {
  return [...items].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
      a.title.localeCompare(b.title, "he")
  );
}

export function orderedCategories(items: ShelfItem[]): string[] {
  const set = new Set(items.map((i) => i.category));
  return Array.from(set).sort((a, b) => categoryRank(a) - categoryRank(b));
}

export function allSenders(items: ShelfItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.sender).filter(Boolean)));
}
