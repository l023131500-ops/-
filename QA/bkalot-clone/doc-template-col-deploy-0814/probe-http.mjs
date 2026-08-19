// מדידת HTTP לפני ואחרי הפריסה. נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1
// בלי BOM נקרא כ-cp1255, והעברית שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט שקיים — כלומר בדיקה שעוברת בירוק על מוצר שבור, או להפך.
//
// שבעה מסומנים של e9e949c (עמודת «מכתב» וסימון «נדרס»), וששה של הפעימות
// הקודמות — כדי שהמדידה תראה גם רגרסיה ולא רק את התוספת.
const M = [
  "<th>מכתב</th>", "fillTemplateCell", "fillCreatedCell",
  "התבנית אינה קיימת", "נוסח נפילה", "נדרס ${fmtDate", "אינו ידוע",
  "ברירת מחדל לפי סוג הפנייה", "tmpl-sel", "שינוי סטטוס",
  "עבד עכשיו", "כתובת המכתב", "הכנס לתור",
];

const cb = process.argv[2] || "probe";

for (const u of [
  `https://more30.com/bkalot-studio/admin?cb=${cb}`,
  `https://more30.com/bkalot-studio/admin/?cb=${cb}`,
  `https://more30.com/bkalot-studio/?cb=${cb}`,
  `https://more30.com/?cb=${cb}`,
]) {
  const r = await fetch(u);
  const b = Buffer.from(await r.arrayBuffer());
  const t = b.toString("utf8");
  console.log(u, r.status, b.length);
  if (u.includes("admin?")) console.log("  markers:", M.map((m) => m + "=" + t.includes(m)).join(" | "));
  if (u.startsWith("https://more30.com/?")) {
    console.log("  assets:", [...new Set([...t.matchAll(/assets\/[A-Za-z0-9._-]+/g)].map((x) => x[0]))].join(","));
  }
  // שפיות קידוד: אל״ף אמיתי מול תו החלפה מול סימן כפל-קידוד (cp1255 שנקרא כ-utf8)
  console.log(
    "  alef=" + (t.match(/א/g) || []).length,
    "replacement=" + (t.match(/�/g) || []).length,
    "doubleenc=" + (t.match(/×/g) || []).length,
  );
}
