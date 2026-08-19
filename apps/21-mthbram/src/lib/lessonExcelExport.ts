import * as XLSX from "xlsx";

export interface LessonRow {
  rabbi_name?: string;
  rabbi_role?: string;
  synagogue_name?: string;
  subject?: string;
  lesson_style?: string;
  language?: string;
  audience_type?: string[];
  target_audience?: string[];
  city?: string;
  neighborhood?: string;
  street?: string;
  street_number?: string;
  specific_date?: string;
  schedule_days?: { day: string; time: string }[];
  schedule_notes?: string;
  submitter_notes?: string;
  org_name?: string;
  is_recurring?: boolean;
}

// סדר העמודות המדויק של נדרים פלוס (אפריל 2026)
const HEADERS = [
  "שם הרב",          // שורה 1: שם, שורה 2: תפקיד
  "נושא השיעור",
  "קהל יעד",
  "עיר",
  "תאריך / יום",     // ימים מרובים = שורה לכל יום
  "שעה",             // שעות מקבילות = שורה לכל שעה
  "כתובת - מיקום",   // שורה 1: רחוב מספר, שורה 2: שכונה
  "שם בית הכנסת",
  "שפה",
  "סגנון",
  "מגדר",
  "הערות",
  "שם הארגון",
];

interface ScheduleCols { dateLines: string[]; timeLines: string[]; }

function formatSchedule(lesson: LessonRow): ScheduleCols {
  if (lesson.specific_date) {
    const days = Array.isArray(lesson.schedule_days) && lesson.schedule_days.length > 0 ? lesson.schedule_days : [];
    const time = days[0]?.time || lesson.schedule_notes || "";
    return { dateLines: [lesson.specific_date], timeLines: [time] };
  }
  const days = Array.isArray(lesson.schedule_days) ? lesson.schedule_days : [];
  if (days.length > 0) {
    const dateLines = days.map(d => d.day).filter(Boolean);
    const timeLines = days.map(d => d.time || "");
    return { dateLines, timeLines };
  }
  return { dateLines: [""], timeLines: [lesson.schedule_notes || ""] };
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

// בדיקה שלכל שיעור יש את המידע הקריטי לפני שליחה לנדרים
// שפה אינה חובה — נדרים מקבל "עברית" כברירת מחדל ובמסמכים ראינו שורות בלי שפה מפורשת
export function validateLessonForExport(lesson: LessonRow): ValidationResult {
  const missing: string[] = [];
  if (!lesson.rabbi_name?.trim()) missing.push("שם הרב");
  if (!lesson.subject?.trim()) missing.push("נושא השיעור");
  if (!lesson.city?.trim()) missing.push("עיר");

  const hasDate = !!lesson.specific_date;
  const days = Array.isArray(lesson.schedule_days) ? lesson.schedule_days : [];
  const hasRecurring = days.length > 0 && days.some(d => d.day && d.time);
  if (!hasDate && !hasRecurring) missing.push("תאריך או יום+שעה");

  const audience = Array.isArray(lesson.target_audience) ? lesson.target_audience : [];
  if (audience.length === 0) missing.push("קהל יעד");

  return { valid: missing.length === 0, missing };
}

interface BuiltRow { cells: string[]; lineCount: number; }

function buildRow(l: LessonRow): BuiltRow {
  // עמודה 1: שם הרב + תפקיד בשורה שנייה
  const rabbiCol = [l.rabbi_name?.trim(), l.rabbi_role?.trim()].filter(Boolean).join("\n");
  // עמודה 7: רחוב + מספר בשורה ראשונה, שכונה בשורה שנייה
  const streetLine = [l.street?.trim(), l.street_number?.trim()].filter(Boolean).join(" ");
  const addressCol = [streetLine, l.neighborhood?.trim()].filter(Boolean).join("\n");
  const genderCol = Array.isArray(l.audience_type) ? l.audience_type.join(", ") : "";
  const audienceCol = Array.isArray(l.target_audience) ? l.target_audience.join(", ") : "";
  const { dateLines, timeLines } = formatSchedule(l);
  const dateCol = dateLines.join("\n");
  const timeCol = timeLines.join("\n");

  // המרבי של שורות בכל תא קובע את גובה השורה
  const lineCount = Math.max(
    1,
    rabbiCol.split("\n").length,
    addressCol.split("\n").length,
    dateLines.length,
    timeLines.length,
  );

  return {
    cells: [
      rabbiCol,
      l.subject || "",
      audienceCol,
      l.city || "",
      dateCol,
      timeCol,
      addressCol,
      l.synagogue_name || "",
      l.language || "",
      l.lesson_style || "",
      genderCol,
      l.submitter_notes || "",
      l.org_name || "",
    ],
    lineCount,
  };
}

export function exportLessonsToExcel(lessons: LessonRow[]) {
  const built = lessons.map(buildRow);
  const rows = built.map(b => b.cells);

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);

  ws["!cols"] = [
    { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 18 },
    { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 28 }, { wch: 18 },
  ];

  // גובה שורות דינמי לפי מספר השורות בתוך התא
  const rowHeights: any[] = [{ hpt: 26 }];
  for (const b of built) {
    rowHeights.push({ hpt: Math.max(28, b.lineCount * 18) });
  }
  ws["!rows"] = rowHeights;

  // wrapText על כל התאים
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = { alignment: { wrapText: true, vertical: "center", horizontal: "right" } };
    }
  }

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, "שיעורים לנדרים");
  XLSX.writeFile(wb, "שיעורים-לנדרים-פלוס.xlsx");
}
