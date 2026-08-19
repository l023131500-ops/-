// probe-http.mjs — מודד את מסך הניהול שבייצור מעל HTTP, לפני הפריסה ואחריה.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: ps1 בלי BOM נקרא כ-cp1255 והרגקסים
// העבריים היו מתאימים לכלום ומדווחים "נקי" (ps1-without-bom-parsed-as-cp1255).
//
// שימוש:  node probe-http.mjs before   |   node probe-http.mjs after

import { writeFileSync } from "node:fs";

const phase = process.argv[2] || "run";

const URLS = {
  admin:      "https://more30.com/bkalot-studio/admin",
  adminSlash: "https://more30.com/bkalot-studio/admin/",
  form:       "https://more30.com/bkalot-studio",
  home:       "https://more30.com/",
};

// NEW — חייבים להיות 0 בייצור שלפני, ו-1 אחרי. כל אחד נבדק מול הקובץ
// שבייצור לפני שנקבע כמסומן (המלכודת של 530fb44 / 29d6ac6 / e12acf9:
// מסומן שכבר קיים בייצור מחזיר true על שתי הגרסאות ואינו מודד דבר).
const NEW = {
  select_id:  'id="f-sort"',
  label:      '<label for="f-sort">מיון</label>',
  sorts_const: 'const SORTS = [["decided_at"',
  message:    "sort_unknown:",
  body_key:   'sort: $("f-sort").value',
};

// OLD — קיימים בשתי הגרסאות, ונספרים ולא נבדקים לנוכחות: רגרסיה ולא רק תוספת.
const OLD = {
  decided_id:      'id="f-decided"',
  decided_message: "decided_unknown:",
  filter_button:   "סינון",
  cases_call:      'call("cases"',
};

const count = (h, n) => h.split(n).length - 1;

const out = { phase, at: new Date().toISOString(), urls: {} };

for (const [name, url] of Object.entries(URLS)) {
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + "cb=" + phase + Math.floor(Math.random() * 1e9), {
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const html = buf.toString("utf8");
  const rec = {
    status: res.status,
    bytes: buf.length,
    // כפל-קידוד / תווי החלפה — deployed-html-double-encoded-cp1255
    replacement_chars: count(html, "�"),
    geresh: count(html, "׳") + count(html, "״"),
    new: {},
    old: {},
  };
  for (const [k, v] of Object.entries(NEW)) rec.new[k] = count(html, v);
  for (const [k, v] of Object.entries(OLD)) rec.old[k] = count(html, v);
  out.urls[name] = rec;
}

writeFileSync(new URL(`./_http-${phase}.json`, import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
