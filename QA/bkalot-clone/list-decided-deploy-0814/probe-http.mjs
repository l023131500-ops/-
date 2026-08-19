// מדידת HTTP לפני ואחרי הפריסה. נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1
// בלי BOM נקרא כ-cp1255, והעברית שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט שקיים — כלומר בדיקה שעוברת בירוק על מוצר שבור, או להפך.
//
// חמישה מסומנים של 073f08b (הסימן ברשימה), ואחד־עשר של הפעימות הקודמות — כדי
// שהמדידה תראה גם רגרסיה ולא רק את התוספת. ``מנהל #${c.decided_by} · החשבון
// אינו קיים עוד`` יושב ברשימת ה-OLD ולא ב-NEW: הוא נמדד true גם על 073f08b^.
const NEW = [
  "decidedBit",
  "const decided = decidedBit(c)",
  'Object.hasOwn(c, "decided_at")',
  "לא הוכרע מהמסך",
  "הטריגר קידם אותה בהפקת מסמך",
];
const OLD = [
  "fillDecidedLine",
  "לא נרשמה הכרעה ידנית מהמסך",
  "מי הכריע אינו ידוע",
  "החשבון אינו קיים עוד",
  "מנהל #${c.decided_by} · החשבון אינו קיים עוד",
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
