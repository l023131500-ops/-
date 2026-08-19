import type { RecordingStatus } from "./supabase";

// Colored status styles for badges — parchment-friendly semantic colors.
// uploaded=neutral, transcribing/transcribed/editing=blue-ish (in progress),
// ready=green, error=red.
// ⚠️ הטקסט אינו נלקח יותר מצבעי ה-chart. צבע גרף נבחר כדי למלא עמודה, לא
// כדי להיקרא ב-12px על גרסה שקופה של עצמו: "מוכן" נמדד ב-3.64:1 ו"בתהליך"
// הצהוב גרוע ממנו, מול 4.5:1 שתקן 5568 דורש. ‎--status-*‎ הם אותם שלושה
// גוונים בבהירות שנקראת, ומוגדרים בנפרד לערכה הבהירה ולכהה.
//
// ‎status-chip-*‎ ולא ‎text-status-progress‎: המחלקות של Tailwind נראו נכון
// לגמרי ופשוט לא נפלטו ל-CSS (ראה ההסבר המלא ב-‎index.css‎, ליד הגדרתן).
// בגרסה הקודמת של השורות האלה זו הייתה תגית בלי רקע ובלי צבע.
const STATUS_STYLES: Record<RecordingStatus, string> = {
  uploaded: "bg-muted text-muted-foreground",
  transcribing: "status-chip-progress",
  transcribed: "status-chip-progress",
  editing: "status-chip-edit",
  ready: "status-chip-ready",
  error: "bg-destructive/15 text-destructive",
};

export function statusBadgeClass(status: RecordingStatus): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES.uploaded;
}

// Whether a recording can be (re)transcribed on demand.
export function canTranscribe(status: RecordingStatus): boolean {
  return status === "uploaded" || status === "error";
}

// Whether the transcription pipeline is actively running.
export function isProcessing(status: RecordingStatus): boolean {
  return (
    status === "transcribing" ||
    status === "transcribed" ||
    status === "editing"
  );
}
