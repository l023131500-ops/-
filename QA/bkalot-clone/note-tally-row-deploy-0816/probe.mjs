// probe.mjs — סופר את המסומנים בשלושה מקורות ובאותה ריצה בדיוק:
//   src  — apps/37-bkalot-clone/admin.html (מה שאמור להיפרס)
//   dist — portal/dist/bkalot-studio/admin.html (מה שנפרס בפעם הקודמת)
//   live — more30.com/bkalot-studio/admin עם cachebuster
//
// שתי כתובות חיות, עם לוכסן ובלעדיו — ה-rewrite אינו חייב להתנהג אותו דבר
// בשתיהן, ומדידה של אחת בלבד הייתה מפספסת חצי מהנתיב.
// שימוש: node probe.mjs before|after
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { MARKERS, count } from "./classify.mjs";

const ROOT = "C:/Users/USER/Downloads/more30";
const SRC = `${ROOT}/apps/37-bkalot-clone/admin.html`;
const DIST = `${ROOT}/portal/dist/bkalot-studio/admin.html`;
const phase = process.argv[2] || "before";
const cb = `?cachebust=note-tally-${phase}`;
const URLS = [
  `https://more30.com/bkalot-studio/admin${cb}`,
  `https://more30.com/bkalot-studio/admin/${cb}`,
];

const md5 = (b) => createHash("md5").update(b).digest("hex").toUpperCase();

const srcBuf = readFileSync(SRC);
const distBuf = readFileSync(DIST);
const src = srcBuf.toString("utf8");
const dist = distBuf.toString("utf8");

const live = [];
for (const u of URLS) {
  const r = await fetch(u, { headers: { "cache-control": "no-cache" } });
  const buf = Buffer.from(await r.arrayBuffer());
  live.push({ url: u, status: r.status, bytes: buf.length, md5: md5(buf), text: buf.toString("utf8") });
}

const out = {
  phase,
  src: { bytes: srcBuf.length, md5: md5(srcBuf) },
  dist: { bytes: distBuf.length, md5: md5(distBuf) },
  live: live.map(({ text, ...r }) => r),
  markers: {},
};

for (const group of ["new", "removed", "diff", "control"]) {
  out.markers[group] = MARKERS[group].map((m) => ({
    marker: m,
    src: count(src, m),
    dist: count(dist, m),
    live: live.map((l) => count(l.text, m)),
  }));
}

// שני מדדים שאינם על תוכן: תווי החלפה וכפל-קידוד עברי.
// deployed-html-double-encoded-cp1255 — עמוד שנפרס תקין ונקרא ג'יבריש.
out.encoding = live.map((l) => ({
  url: l.url,
  replacement_chars: count(l.text, "\uFFFD"),
  double_encoded: count(l.text, "×"),
}));

const verdicts = {};
verdicts.new_zero_in_live = out.markers.new.every((m) => m.src > 0 && m.live.every((v) => v === 0));
verdicts.new_equals_src_in_live = out.markers.new.every((m) => m.live.every((v) => v === m.src));
// ⚠️ REMOVED ריקה בפעימה הזו (ראו classify.mjs). every על מערך ריק מחזיר true,
// וזו הצלחה ריקה שנראית כמו הצלחה — ולכן הטענה נרשמת null ולא true.
verdicts.removed_present_in_live = MARKERS.removed.length
  ? out.markers.removed.every((m) => m.dist > 0 && m.live.every((v) => v > 0))
  : null;
verdicts.removed_gone_from_live = MARKERS.removed.length
  ? out.markers.removed.every((m) => m.live.every((v) => v === 0))
  : null;
verdicts.control_unchanged = out.markers.control.every(
  (m) => m.src > 0 && m.src === m.dist && m.live.every((v) => v === m.src)
);
verdicts.diff_matches_src = out.markers.diff.every((m) => m.live.every((v) => v === m.src));

// ⚠️ DIFF לפני הפריסה: כולם ≥1 בייצור, ואף אחד מהם אינו שווה למקור. זו הטענה
// שמפרידה «הקובץ הישן» מ«קובץ שלישי כלשהו» — ספירת ה-dist היא שאמורה לחזור.
verdicts.diff_matches_dist = out.markers.diff.every((m) => m.live.every((v) => v === m.dist));
verdicts.clean_encoding = out.encoding.every((e) => e.replacement_chars === 0 && e.double_encoded === 0);

// הטענה החזקה מכולן: כל המסומנים, בלי קשר לקבוצתם, מחזירים בייצור בדיוק את
// ספירת המקור. נכשלת לפני הפריסה ואמורה לעבור אחריה.
// ולצדה dist_equals_live: לפני הפריסה, מה שהכתובת מגישה הוא בדיוק מה שנפרס
// בפעם הקודמת — כלומר שרשרת הפריסה נמדדת ולא מונחת.
const ALL = [...out.markers.new, ...out.markers.removed, ...out.markers.diff, ...out.markers.control];
verdicts.all_markers_live_equals_src = ALL.every((m) => m.live.every((v) => v === m.src));
verdicts.dist_equals_live = ALL.every((m) => m.live.every((v) => v === m.dist));
// מסומן שהוא 0 בכל המקורות אינו מודד דבר; נספר ונאמר ולא מוצג כבקרה שעברה.
verdicts.dead_markers = ALL.filter((m) => m.src === 0 && m.dist === 0).map((m) => m.marker);
out.verdicts = verdicts;

// ⚠️ הנתיב נכתב במפורש ולא נגזר מ-import.meta.url, והתיקייה היא
// note-tally-row-deploy-0816 ולא note-tally-deploy-0816 — האחרונה היא הראיות של
// bfb5573 («2 מתוך 3» במסך הפנייה), פעימה אחרת שכבר ב-commit.
writeFileSync(`${ROOT}/QA/bkalot-clone/note-tally-row-deploy-0816/${phase}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ phase, src: out.src, dist: out.dist, live: out.live, verdicts, encoding: out.encoding }, null, 2));
