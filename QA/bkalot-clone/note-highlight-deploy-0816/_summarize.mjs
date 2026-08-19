import { readFileSync } from "node:fs";
const j = JSON.parse(readFileSync(new URL("./live-dom.json", import.meta.url)));
for (const [k, s] of Object.entries(j.states)) {
  let head = `=== ${k}  term=${JSON.stringify(s.term)} rows_in_list=${s.rows_in_list}`;
  if (s.rows !== undefined) head += ` cells=${s.rows} marks=${s.marks_in_page} overflow=${s.overflow}`;
  console.log(head);
  if (s.cells) s.cells.forEach((c, i) => console.log(
    `   [${i}] mark=${JSON.stringify(c.mark)} cls=${c.mark_cls} stale=${c.stale} td_title=${JSON.stringify(c.td_title)}\n        nodes=${JSON.stringify(c.nodes)}`));
}
console.log("console:", JSON.stringify(j.console));
console.log("bad_responses:", JSON.stringify(j.bad_responses));
