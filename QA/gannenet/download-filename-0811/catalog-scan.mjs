// What a download is actually named today, measured against the real catalogs.
import { readFileSync } from "node:fs";
const APP = "C:/Users/USER/Downloads/more30/apps/40-gannenet";
const drive = JSON.parse(readFileSync(`${APP}/content/drive-catalog.json`, "utf8"));
const seed = JSON.parse(readFileSync(`${APP}/content/catalog.json`, "utf8"));

const EXT = /\.[A-Za-z0-9]{1,5}$/;
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/;

for (const [name, items] of [["drive", drive], ["seed", seed]]) {
  const noExt = items.filter((x) => !EXT.test(x.title));
  const illegal = items.filter((x) => ILLEGAL.test(x.title));
  const mimes = {};
  for (const x of noExt) mimes[x.mime] = (mimes[x.mime] || 0) + 1;
  console.log(`\n== ${name}: ${items.length} items`);
  console.log(`   titles with no trailing extension: ${noExt.length}`, mimes);
  console.log(`   titles carrying a character illegal in a filename: ${illegal.length}`);
  console.log(`   sample illegal:`, illegal.slice(0, 4).map((x) => x.title));
  console.log(`   sample no-ext:`, noExt.slice(0, 4).map((x) => `${x.title} [${x.kind}/${x.mime}]`));
  const longest = items.reduce((a, b) => (b.title.length > a.title.length ? b : a));
  console.log(`   longest title: ${longest.title.length} chars`);
  // What the browser saves today: the last path segment of the URL.
  const urlName = (x) => x.file.split("?")[0].split("/").pop();
  const sample = items.slice(0, 3).map((x) => `${urlName(x)}  <- "${x.title}"`);
  console.log(`   saved-as today:`, sample);
}
