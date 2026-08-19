// מדידת HTTP לפני ואחרי הפריסה. נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1
// בלי BOM נקרא כ-cp1255, והעברית שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא»
// על טקסט שקיים — כלומר בדיקה שעוברת בירוק על מוצר שבור, או להפך.
const M = [
  "עבד עכשיו", "queue_id_required", "queue_row_not_found", "not_a_clone_row",
  "live_not_supported", "not_queued", "target_not_allowed", "queue_body_empty",
  "עובד בבדיקה — לא נשלח", "הכנס לתור", "כתובת המכתב", "<th>תור</th>",
];

for (const u of [
  "https://more30.com/bkalot-studio/admin?cb=post0814",
  "https://more30.com/bkalot-studio/admin/?cb=post0814",
  "https://more30.com/bkalot-studio/?cb=post0814",
  "https://more30.com/?cb=post0814",
]) {
  const r = await fetch(u);
  const b = Buffer.from(await r.arrayBuffer());
  const t = b.toString("utf8");
  console.log(u, r.status, b.length);
  if (u.includes("admin?")) console.log("  markers:", M.map((m) => m + "=" + t.includes(m)).join(" | "));
  if (u === "https://more30.com/?cb=post0814") {
    console.log("  assets:", [...new Set([...t.matchAll(/assets\/[A-Za-z0-9._-]+/g)].map((x) => x[0]))].join(","));
  }
  // שפיות קידוד: אל״ף אמיתי מול תו החלפה מול סימן כפל-קידוד (cp1255 שנקרא כ-utf8)
  console.log(
    "  alef=" + (t.match(/א/g) || []).length,
    "replacement=" + (t.match(/�/g) || []).length,
    "doubleenc=" + (t.match(/×/g) || []).length,
  );
}
