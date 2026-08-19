import ExcelJS from "exceljs";
import { mkdirSync } from "fs";

mkdirSync("/mnt/documents", { recursive: true });

// ========== 1. PUBLIC export: rights list (no podcast text) ==========
const wb1 = new ExcelJS.Workbook();
const ws1 = wb1.addWorksheet("מאגר זכויות בקלות", { views: [{ rightToLeft: true }] });
ws1.columns = [
  { header: "מס'", key: "n", width: 6 },
  { header: "קטגוריה", key: "cat", width: 22 },
  { header: "נושא", key: "name", width: 45 },
  { header: "תיאור", key: "desc", width: 70 },
];

ws1.mergeCells("A1:D1");
const t1 = ws1.getCell("A1");
t1.value = "מאגר זכויות בקלות - רשימת כל הנושאים";
t1.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
t1.alignment = { horizontal: "center", vertical: "middle" };
t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
ws1.getRow(1).height = 32;

const hdr1 = ws1.addRow(["מס'", "קטגוריה", "נושא", "תיאור"]);
hdr1.eachCell((c) => {
  c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.border = { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} };
});

import { mainCategories } from "/dev-server/src/data/rightsData.ts";
let n = 0;
for (const cat of mainCategories) {
  const cr = ws1.addRow([`📂`, cat.label, cat.label, cat.desc]);
  cr.height = 26;
  ws1.mergeCells(`B${cr.number}:D${cr.number}`);
  cr.eachCell((c) => {
    c.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    c.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    c.border = { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} };
  });
  for (const tp of cat.topics) {
    n++;
    const r = ws1.addRow([n, cat.label, tp.label, tp.desc]);
    r.eachCell((c, col) => {
      c.font = { name: "Arial", size: 11 };
      c.alignment = { horizontal: col === 1 ? "center" : "right", vertical: "middle", wrapText: true };
      c.border = { top:{style:"hair"}, bottom:{style:"hair"}, left:{style:"hair"}, right:{style:"hair"} };
    });
  }
}
ws1.addRow([]);
ws1.addRow(["", "", `סה"כ נושאים:`, n]).font = { bold: true };
await wb1.xlsx.writeFile("/mnt/documents/bklot-rights-list.xlsx");
await wb1.xlsx.writeFile("/dev-server/public/bklot-rights-list.xlsx");
console.log("✓ Public list:", n, "topics");

// ========== 2. TEMPLATE for filling new rights ==========
const wb2 = new ExcelJS.Workbook();
const ws2 = wb2.addWorksheet("תבנית למילוי", { views: [{ rightToLeft: true }] });
const cols = [
  { header: "מס' נושא", key: "topic_number", width: 10 },
  { header: "שם הנושא *", key: "topic_name", width: 30 },
  { header: "קטגוריה *", key: "category", width: 22 },
  { header: "תיאור פשוט (חובה)", key: "plain_description", width: 40 },
  { header: "גוף מטפל", key: "handling_body", width: 25 },
  { header: "קהל יעד", key: "target_audience", width: 30 },
  { header: "תנאי זכאות", key: "eligibility_criteria", width: 40 },
  { header: "מסמכים נדרשים", key: "required_documents", width: 35 },
  { header: "דרכי הגשה", key: "how_to_apply", width: 35 },
  { header: "פוטנציאל כספי", key: "financial_potential", width: 25 },
  { header: "הטבות נלוות", key: "accompanying_benefit", width: 30 },
  { header: "מוקשים ביורוקרטיים", key: "bureaucratic_pitfalls", width: 35 },
  { header: "קישור לשירות", key: "service_link", width: 30 },
  { header: "נוסח פודקאסט (פנימי - לא נשלח לציבור)", key: "podcast_text", width: 50 },
];
ws2.columns = cols;

ws2.mergeCells(`A1:${String.fromCharCode(64+cols.length)}1`);
const t2 = ws2.getCell("A1");
t2.value = "תבנית למילוי נושאים חדשים במאגר זכויות בקלות";
t2.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
t2.alignment = { horizontal: "center", vertical: "middle" };
t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
ws2.getRow(1).height = 30;

const hdr2 = ws2.addRow(cols.map(c => c.header));
hdr2.eachCell((c) => {
  c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  c.border = { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} };
});
hdr2.height = 36;

// Example row
const example = ws2.addRow([
  181, "מענק לדוגמה", "ביטוח לאומי",
  "תיאור קצר וברור של הזכות בשפה פשוטה",
  "המוסד לביטוח לאומי",
  "משפחות עם 3 ילדים ומעלה",
  "תושב ישראל, הכנסה מתחת ל-X",
  "ת\"ז, אישור הכנסה, טופס בקשה",
  "אונליין באתר ביטוח לאומי / סניף קרוב",
  "עד 5,000 ש\"ח",
  "פטור מאגרות, הנחה בארנונה",
  "מועד הגשה אחרון - 31/12 בכל שנה",
  "https://www.btl.gov.il/...",
  "טקסט פודקאסט מלא (לא נשלח לציבור באתר/בוט) - משמש להפצה בערוצי שמע",
]);
example.eachCell((c) => {
  c.font = { italic: true, color: { argb: "FF64748B" }, size: 10 };
  c.alignment = { vertical: "top", wrapText: true };
  c.border = { top:{style:"hair"}, bottom:{style:"hair"}, left:{style:"hair"}, right:{style:"hair"} };
});
example.height = 80;

// Empty rows for filling
for (let i = 0; i < 10; i++) {
  const r = ws2.addRow(Array(cols.length).fill(""));
  r.eachCell((c) => {
    c.border = { top:{style:"hair"}, bottom:{style:"hair"}, left:{style:"hair"}, right:{style:"hair"} };
    c.alignment = { vertical: "top", wrapText: true };
  });
  r.height = 30;
}

// Instructions sheet
const wsInfo = wb2.addWorksheet("הוראות מילוי", { views: [{ rightToLeft: true }] });
wsInfo.columns = [{ width: 25 }, { width: 80 }];
const info = [
  ["📋 הוראות מילוי המאגר", ""],
  ["", ""],
  ["שדות חובה", "שם הנושא, קטגוריה, תיאור פשוט"],
  ["מס' נושא", "מספר רץ ייחודי. ניתן להשאיר ריק לקבלת מספר אוטומטי."],
  ["קטגוריה", "ביטוח לאומי / רשות המסים / דיור ושיכון / בריאות / זכויות עובדים / גיל שלישי וכו'"],
  ["תיאור פשוט", "משפט-שניים בעברית ברורה - יוצג בכרטיס הזכות באתר."],
  ["תנאי זכאות", "פירוט מי זכאי, גילים, מצבים מיוחדים."],
  ["מסמכים נדרשים", "רשימת המסמכים שצריך להכין מראש."],
  ["דרכי הגשה", "אונליין / טלפון / סניף - וכתובת."],
  ["פוטנציאל כספי", "עד כמה הזכות שווה (לדוגמה: '5,000 ש\"ח חד-פעמי')."],
  ["קישור לשירות", "URL מלא (https://...) לאתר הרשמי של הזכות."],
  ["נוסח פודקאסט", "טקסט מלא לקריינות בפודקאסט. ⚠️ שדה פנימי - לא נשלח בבוט/באתר/בקבצי הורדה ציבוריים."],
  ["", ""],
  ["📞 שאלות?", "התקשרו 02-3131500 או שלחו ל-L023131500@gmail.com"],
];
for (const [a, b] of info) {
  const r = wsInfo.addRow([a, b]);
  if (a.includes("📋") || a.includes("📞")) {
    r.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    r.eachCell(c => c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } });
  } else if (a) {
    r.getCell(1).font = { bold: true, color: { argb: "FF059669" } };
  }
  r.alignment = { vertical: "middle", wrapText: true, horizontal: "right" };
  r.height = 24;
}

await wb2.xlsx.writeFile("/mnt/documents/bklot-rights-template.xlsx");
await wb2.xlsx.writeFile("/dev-server/public/bklot-rights-template.xlsx");
console.log("✓ Template written");
