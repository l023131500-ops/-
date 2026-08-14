// probe-files.mjs — פוסל מסומנים לפני שהם נקבעים: כל מסומן NEW חייב להיות 0
// בקובץ שבייצור (portal/dist לפני ה-staging) ו-1 במקור. מסומן שמחזיר true על
// שתי הגרסאות אינו מודד דבר — המלכודת של 530fb44 / 29d6ac6 / e12acf9.
import { readFileSync, writeFileSync } from "node:fs";

const NEW = {
  button_label: '>הצג</button>',
  title_attr: 'title="מחיל את הסינון ואת המיון יחד, ומחזיר לעמוד הראשון"',
  comment_why: "הכפתור נקרא «הצג» ולא «סינון»",
  comment_offset: "«הצג» מאפס את offset",
  comment_stale: "רק «הצג» הביא את המצב האמיתי",
};
const OLD = {
  go_id: 'id="f-go"',
  sort_id: 'id="f-sort"',
  decided_id: 'id="f-decided"',
  cases_call: 'call("cases"',
  empty_text: "אין פניות שתואמות את הסינון",
  filter_word: "סינון",
  old_button: ">סינון</button>",
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
writeFileSync("QA/bkalot-clone/apply-button-deploy-0814/_files.json", JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
