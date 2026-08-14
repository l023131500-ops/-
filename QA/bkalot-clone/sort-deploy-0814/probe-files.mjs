// probe-files.mjs — פוסל מסומנים לפני שהם נקבעים: כל מסומן NEW חייב להיות 0
// בקובץ שבייצור (portal/dist לפני ה-staging) ו-1 במקור. מסומן שמחזיר true על
// שתי הגרסאות אינו מודד דבר — המלכודת של 530fb44 / 29d6ac6 / e12acf9.
import { readFileSync, writeFileSync } from "node:fs";

const NEW = {
  select_id: 'id="f-sort"',
  label: '<label for="f-sort">מיון</label>',
  sorts_const: 'const SORTS = [["decided_at"',
  message: "sort_unknown:",
  body_key: 'sort: $("f-sort").value',
};
const OLD = {
  decided_id: 'id="f-decided"',
  decided_message: "decided_unknown:",
  filter_button: "סינון",
  cases_call: 'call("cases"',
};
const count = (h, n) => h.split(n).length - 1;
const files = {
  prod: "portal/dist/bkalot-studio/admin.html",
  src: "apps/37-bkalot-clone/admin.html",
};
const out = {};
for (const [tag, f] of Object.entries(files)) {
  const h = readFileSync(f, "utf8");
  out[tag] = { bytes: Buffer.byteLength(h), new: {}, old: {} };
  for (const [k, v] of Object.entries(NEW)) out[tag].new[k] = count(h, v);
  for (const [k, v] of Object.entries(OLD)) out[tag].old[k] = count(h, v);
}
out.markers_valid = Object.keys(NEW).every((k) => out.prod.new[k] === 0 && out.src.new[k] >= 1);
writeFileSync("QA/bkalot-clone/sort-deploy-0814/_files.json", JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
