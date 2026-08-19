// הפער בין המקור לייצור. שלושה מסומנים חדשים, ושלושה ישנים שחייבים להיות
// בשתי הכתובות — בלעדיהם «0 בייצור» היה נקרא כ«הקוד אינו שם» בעוד שהאמת
// יכולה להיות «הכתובת אינה נטענת בכלל».
//
// שתי הכתובות, עם לוכסן ובלעדיו: מסלול mount שמגיש HTML אחר לכל אחת מהן
// הוא תקלה שנרשמה כאן בעבר.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = readFileSync("C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html", "utf8");
const URLS = ["https://more30.com/bkalot-studio/admin.html", "https://more30.com/bkalot-studio/admin.html/"];

const NEW = [["th_why", "<th>למה</th>"], ["css_td_why", "td.why{"], ["fn_note_cell", "fillHistoryNoteCell"]];
const OLD = [["th_who", "<th>מי הכריע</th>"], ["fn_who_cell", "fillHistoryWhoCell"], ["h3_sequence", "רצף ההכרעות"]];
const count = (hay, needle) => hay.split(needle).length - 1;

const out = { source: {}, production: {} };
for (const [k, m] of [...NEW, ...OLD]) out.source[k] = count(SRC, m);

for (const url of URLS) {
  let body = null, status = null, err = null;
  try {
    const res = await fetch(url + "?cachebust=" + process.env.CB);
    status = res.status;
    body = await res.text();
  } catch (e) { err = String(e); }
  out.production[url] = {
    http_status: status, error: err, bytes: body?.length ?? null,
    markers: body ? Object.fromEntries([...NEW, ...OLD].map(([k, m]) => [k, count(body, m)])) : null,
    replacement_chars: body ? count(body, "\uFFFD") : null,
  };
}

writeFileSync(new URL("./http-probe.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
