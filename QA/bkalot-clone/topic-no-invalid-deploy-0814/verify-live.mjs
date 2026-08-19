// אימות עצמאי של הפריסה מול הכתובת החיה — נכתב ב-node ולא ב-.ps1 (cp1255 הורס עברית בפירוק).
// המסומנים נבנים מנקודות-קוד ולא מטקסט עברי בקובץ, כדי שהם יהיו זהים בכל קידוד.
const he = (...cp) => String.fromCodePoint(...cp);
const NEW = [
  'function whyTopicNoInvalid(sent) {',
  'const TOPIC_NO_MAX = 2147483647;',
  'function markInvalid(el) {',
  'if (code === "topic_no_invalid" && "topic_no" in payload) {',
  // "מספר הנושא גדול מכל מספר נושא שקיים במערכת."
  he(0x5DE,0x5E1,0x5E4,0x5E8,0x20,0x5D4,0x5E0,0x5D5,0x5E9,0x5D0,0x20,0x5D2,0x5D3,0x5D5,0x5DC,0x20,0x5DE,0x5DB,0x5DC,0x20,0x5DE,0x5E1,0x5E4,0x5E8,0x20,0x5E0,0x5D5,0x5E9,0x5D0,0x20,0x5E9,0x5E7,0x5D9,0x5D9,0x5DD,0x20,0x5D1,0x5DE,0x5E2,0x5E8,0x5DB,0x5EA,0x2E),
  // "מספר הנושא אינו תקין. תקנו ושלחו שוב."
  he(0x5DE,0x5E1,0x5E4,0x5E8,0x20,0x5D4,0x5E0,0x5D5,0x5E9,0x5D0,0x20,0x5D0,0x5D9,0x5E0,0x5D5,0x20,0x5EA,0x5E7,0x5D9,0x5DF,0x2E,0x20,0x5EA,0x5E7,0x5E0,0x5D5,0x20,0x5D5,0x5E9,0x5DC,0x5D7,0x5D5,0x20,0x5E9,0x5D5,0x5D1,0x2E),
];
const REMOVED = [
  'stop.el.setAttribute("aria-invalid", "true");',
  'stop.el.focus();',
];
const URLS = [
  'https://more30.com/bkalot-studio',
  'https://more30.com/bkalot-studio/',
  'https://more30.com/bkalot-studio/admin',
  'https://more30.com/',
];
const out = [];
for (const url of URLS) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const t = await r.text();
    out.push({
      url,
      status: r.status,
      bytes: Buffer.byteLength(t, 'utf8'),
      new_hits: NEW.filter((m) => t.includes(m)).length,
      removed_hits: REMOVED.filter((m) => t.includes(m)).length,
      replacement_chars: (t.match(/�/g) || []).length,
      // ×'/×" הוא החתימה של cp1255 שנקרא כ-UTF-8
      double_encoded: (t.match(/×[-¿]/g) || []).length,
    });
  } catch (e) {
    out.push({ url, error: String(e && e.message) });
  }
}
console.log(JSON.stringify({ checked_at_utc: new Date().toISOString(), results: out }, null, 2));
