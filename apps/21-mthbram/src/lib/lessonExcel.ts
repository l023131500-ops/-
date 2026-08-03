import * as XLSX from "xlsx";

export interface BulkLessonRow {
  rabbi_name: string;
  subject: string;
  language: string;
  audience_type: string; // "גברים" / "נשים" / "מעורב"
  target_audience: string; // comma-separated
  city: string;
  neighborhood: string;
  street: string;
  street_number: string;
  synagogue_name: string;
  schedule_type: string; // "תאריך קבוע" / "ימים בשבוע"
  specific_date: string; // YYYY-MM-DD or empty
  schedule_days: string; // comma-separated
  schedule_time: string; // "20:30"
  schedule_notes: string;
  rabbi_phone: string;
  contact_phone: string;
  notes: string;
}

export const EXCEL_HEADERS: { key: keyof BulkLessonRow; label: string }[] = [
  { key: "rabbi_name", label: "שם הרב" },
  { key: "subject", label: "נושא השיעור" },
  { key: "language", label: "שפה" },
  { key: "audience_type", label: "גברים/נשים" },
  { key: "target_audience", label: "קהל יעד" },
  { key: "city", label: "עיר" },
  { key: "neighborhood", label: "שכונה" },
  { key: "street", label: "רחוב" },
  { key: "street_number", label: "מספר" },
  { key: "synagogue_name", label: "בית כנסת / אולם" },
  { key: "schedule_type", label: "סוג זמן (תאריך קבוע / ימים בשבוע)" },
  { key: "specific_date", label: "תאריך (אם חד-פעמי)" },
  { key: "schedule_days", label: "ימים בשבוע" },
  { key: "schedule_time", label: "שעה" },
  { key: "schedule_notes", label: "הערות זמן" },
  { key: "rabbi_phone", label: "טלפון הרב" },
  { key: "contact_phone", label: "טלפון איש קשר" },
  { key: "notes", label: "הערות" },
];

export function downloadExcelTemplate() {
  const headers = EXCEL_HEADERS.map((h) => h.label);
  const example = [
    "הרב ישראל ישראלי",
    "דף יומי",
    "עברית",
    "גברים",
    "אברכים, בעלי בתים",
    "ירושלים",
    "גאולה",
    "מלכי ישראל",
    "12",
    "בית כנסת המרכזי",
    "ימים בשבוע",
    "",
    "ראשון, שלישי, חמישי",
    "20:30",
    "בין מנחה למעריב",
    "0501234567",
    "0501234567",
    "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  // RTL
  if (!ws["!props"]) ws["!props"] = {};
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "שיעורים");
  XLSX.writeFile(wb, "תבנית-שיעורים.xlsx");
}

export function parseExcelFile(file: File): Promise<Partial<BulkLessonRow>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        const labelToKey = new Map(EXCEL_HEADERS.map((h) => [h.label, h.key]));
        const parsed: Partial<BulkLessonRow>[] = rows.map((row) => {
          const out: Partial<BulkLessonRow> = {};
          for (const [label, val] of Object.entries(row)) {
            const key = labelToKey.get(label.trim());
            if (key) out[key] = String(val ?? "").trim();
          }
          return out;
        }).filter((r) => r.rabbi_name && r.subject);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
