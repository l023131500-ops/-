// Helpers for working with the new "schedule blocks" shape stored in
// study_day_events.lessons (JSONB). Each block represents a date or set of
// weekly days, plus the lessons that take place then.
//
// New shape:
//   { blocks: [{ id, kind: "date"|"days", date?, days?, items: Lesson[] }] }
//
// Legacy shape (still supported for backward compatibility):
//   Lesson[]   (a flat array of lessons that share the event-level date/days)
//
// All consumer components should call `normalizeToBlocks(...)` before reading.

export interface Lesson {
  rabbi_name: string;
  subject: string;
  time?: string;
}

export interface ScheduleBlock {
  id: string;
  kind: "date" | "days";
  date?: string | null;     // ISO yyyy-mm-dd
  days?: string[];          // ["ראשון","שני",...]
  items: Lesson[];
}

const HEB_MONTHS: Record<string, string> = {
  "01": "ינואר", "02": "פברואר", "03": "מרץ", "04": "אפריל",
  "05": "מאי", "06": "יוני", "07": "יולי", "08": "אוגוסט",
  "09": "ספטמבר", "10": "אוקטובר", "11": "נובמבר", "12": "דצמבר",
};

export function formatHebDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const [, m, d] = iso.split("-");
    return `${parseInt(d, 10)} ב${HEB_MONTHS[m] ?? ""}`;
  } catch { return iso; }
}

export function blockLabel(b: ScheduleBlock): string {
  if (b.kind === "date" && b.date) return formatHebDate(b.date);
  if (b.kind === "days" && b.days?.length) return `כל יום ${b.days.join(", ")}`;
  return "ללא מועד";
}

/**
 * Convert whatever is stored in `lessons` plus the event-level schedule
 * fields into a normalized `ScheduleBlock[]`.
 */
export function normalizeToBlocks(
  rawLessons: unknown,
  fallback: {
    schedule_type?: string | null;
    event_date?: string | null;
    schedule_days?: unknown;
  },
): ScheduleBlock[] {
  // New shape
  if (
    rawLessons &&
    typeof rawLessons === "object" &&
    !Array.isArray(rawLessons) &&
    Array.isArray((rawLessons as any).blocks)
  ) {
    return (rawLessons as any).blocks.map((b: any, i: number) => ({
      id: b.id ?? `b-${i}`,
      kind: b.kind === "days" ? "days" : "date",
      date: b.date ?? null,
      days: Array.isArray(b.days) ? b.days : [],
      items: Array.isArray(b.items)
        ? b.items.filter((l: any) => l && (l.rabbi_name || l.subject))
        : [],
    }));
  }

  // Legacy flat array → wrap into a single block using event-level schedule
  const items: Lesson[] = Array.isArray(rawLessons)
    ? (rawLessons as any[])
        .filter((l) => l && (l.rabbi_name || l.subject))
        .map((l) => ({
          rabbi_name: String(l.rabbi_name ?? ""),
          subject: String(l.subject ?? ""),
          time: l.time ? String(l.time) : "",
        }))
    : [];

  if (fallback.schedule_type === "weekly_days") {
    const days = Array.isArray(fallback.schedule_days)
      ? (fallback.schedule_days as string[])
      : [];
    return [{ id: "legacy-0", kind: "days", days, items }];
  }
  return [{
    id: "legacy-0",
    kind: "date",
    date: fallback.event_date ?? null,
    items,
  }];
}

/**
 * Flatten blocks into a list of lessons, each tagged with a `day` label
 * derived from its parent block. Used by the showcase card and detail modal.
 */
export function flattenWithDayLabel(blocks: ScheduleBlock[]) {
  const flat: { rabbi_name: string; subject: string; time?: string; day?: string }[] = [];
  for (const b of blocks) {
    const label = blockLabel(b);
    for (const l of b.items) flat.push({ ...l, day: label });
  }
  return flat;
}

/** Pick the earliest upcoming/most-relevant date from blocks for sorting & headers. */
export function pickPrimaryDate(blocks: ScheduleBlock[]): string | null {
  const dates = blocks
    .filter((b) => b.kind === "date" && b.date)
    .map((b) => b.date as string)
    .sort();
  return dates[0] ?? null;
}

/** True if EVERY date-block in the event is in the past. */
export function isFullyExpired(blocks: ScheduleBlock[], todayIso: string): boolean {
  const dateBlocks = blocks.filter((b) => b.kind === "date" && b.date);
  if (dateBlocks.length === 0) return false; // recurring → never expired
  return dateBlocks.every((b) => (b.date as string) < todayIso);
}
