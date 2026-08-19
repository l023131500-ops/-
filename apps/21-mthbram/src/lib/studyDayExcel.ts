import * as XLSX from "xlsx";

export interface StudyDayRow {
  synagogue_name: string;
  city: string;
  street: string;
  street_number: string;
  donation_link: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  schedule_type: string; // "תאריך קבוע" / "ימים בשבוע"
  event_date: string; // YYYY-MM-DD
  schedule_days: string; // comma-separated
  target_audience: string; // comma-separated
  lessons: string; // "רב|נושא|שעה ; רב|נושא|שעה"
  notes: string;
}

export const HEADERS: { key: keyof StudyDayRow; label: string }[] = [
  { key: "synagogue_name", label: "שם בית הכנסת" },
  { key: "city", label: "עיר" },
  { key: "street", label: "רחוב" },
  { key: "street_number", label: "מספר" },
  { key: "donation_link", label: "קישור לתרומה" },
  { key: "contact_name", label: "שם איש קשר" },
  { key: "contact_phone", label: "טלפון" },
  { key: "contact_email", label: "אימייל" },
  { key: "schedule_type", label: "סוג זמן (תאריך קבוע / ימים בשבוע)" },
  { key: "event_date", label: "תאריך (אם חד-פעמי)" },
  { key: "schedule_days", label: "ימים בשבוע" },
  { key: "target_audience", label: "קהל יעד" },
  { key: "lessons", label: "שיעורים (רב|נושא|שעה ; רב|נושא|שעה)" },
  { key: "notes", label: "הערות" },
];

export function downloadStudyDayTemplate() {
  const headers = HEADERS.map((h) => h.label);
  const example = [
    "בית כנסת המרכזי",
    "ירושלים",
    "מלכי ישראל",
    "12",
    "https://example.com/donate",
    "ר' משה כהן",
    "0501234567",
    "info@example.com",
    "תאריך קבוע",
    "2026-05-15",
    "",
    "גברים, אברכים",
    "הרב ישראלי|פתיחה ודברי חיזוק|09:00 ; הרב כהן|דף יומי|10:00 ; הרב לוי|שיעור הלכה|11:30",
    "כיבוד קל",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "ימי עיון");
  XLSX.writeFile(wb, "תבנית-ימי-עיון.xlsx");
}

export interface ParsedLesson { rabbi_name: string; subject: string; time: string; }

export function parseLessonsString(s: string): ParsedLesson[] {
  if (!s) return [];
  return s
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rabbi_name = "", subject = "", time = ""] = part.split("|").map((p) => p.trim());
      return { rabbi_name, subject, time };
    })
    .filter((l) => l.rabbi_name || l.subject);
}

export function parseStudyDayFile(file: File): Promise<Partial<StudyDayRow>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        const labelToKey = new Map(HEADERS.map((h) => [h.label, h.key]));
        const parsed: Partial<StudyDayRow>[] = rows
          .map((row) => {
            const out: Partial<StudyDayRow> = {};
            for (const [label, val] of Object.entries(row)) {
              const key = labelToKey.get(label.trim());
              if (key) out[key] = String(val ?? "").trim();
            }
            return out;
          })
          .filter((r) => r.synagogue_name && r.city);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
