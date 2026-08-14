// מדידת HTTP לפני ואחרי הפריסה. נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1
// בלי BOM נקרא כ-cp1255, והעברית שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט שקיים — כלומר בדיקה שעוברת בירוק על מוצר שבור, או להפך.
//
// ארבעה מסומנים של 13516f0, ושנים-עשר של הפעימות הקודמות — כדי שהמדידה תראה
// גם רגרסיה ולא רק את התוספת. `show("screen-list")` בלי `load()` יושב ברשימת
// ה-OLD ולא ב-NEW: הוא true משתי הגרסאות, וההבדל הוא מה שבא אחריו.
const NEW = [
  'show("screen-list"); load();',
  "חזרה לרשימה מרעננת אותה, ולא רק מחליפה מסך",
  "ורשימת מה-שעלול-לשנות אינה ידועה ללקוח מראש",
  "show לפני load ולא אחריה",
];
const OLD = [
  'show("screen-list")',
  "decidedBit",
  "לא הוכרע מהמסך",
  "fillDecidedLine",
  "לא נרשמה הכרעה ידנית מהמסך",
  "החשבון אינו קיים עוד",
  "<th>מכתב</th>",
  "fillTemplateCell",
  "tmpl-sel",
  "שינוי סטטוס",
  "עבד עכשיו",
  "הכנס לתור",
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
  if (u.includes("admin?")) {
    console.log("  new:", NEW.map((m) => m + "=" + t.includes(m)).join(" | "));
    console.log("  old:", OLD.map((m) => m + "=" + t.includes(m)).join(" | "));
  }
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
