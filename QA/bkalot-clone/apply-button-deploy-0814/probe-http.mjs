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

// NEW — חייבים להיות 0 בייצור שלפני, ו-1 אחרי. נפסלו מול הקובץ שבייצור
// לפני שנקבעו (probe-files.mjs, markers_valid=true).
const NEW = {
  button_label: ">הצג</button>",
  title_attr:   'title="מחיל את הסינון ואת המיון יחד, ומחזיר לעמוד הראשון"',
  comment_why:  "הכפתור נקרא «הצג» ולא «סינון»",
  comment_offset: "«הצג» מאפס את offset",
  comment_stale: "רק «הצג» הביא את המצב האמיתי",
};

// OLD — קיימים בייצור, ונספרים ולא נבדקים לנוכחות: רגרסיה ולא רק תוספת.
// old_button הוא ההפך — 1 לפני ו-0 אחרי; החלפת נוסח ולא תוספת עליו.
const OLD = {
  go_id:       'id="f-go"',
  sort_id:     'id="f-sort"',
  decided_id:  'id="f-decided"',
  cases_call:  'call("cases"',
  empty_text:  "אין פניות שתואמות את הסינון",
  filter_word: "סינון",
  old_button:  ">סינון</button>",
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
