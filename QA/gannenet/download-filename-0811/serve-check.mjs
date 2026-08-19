// What the running production server actually sends, against the real bucket.
// Compares the Content-Disposition on the download URL with the inline one for
// the same file, on all three shelf sources.
import { readFileSync } from "node:fs";
const APP = "C:/Users/USER/Downloads/more30/apps/40-gannenet";
const ORIGIN = "http://localhost:3043/gannenet";

const seed = JSON.parse(readFileSync(`${APP}/content/catalog.json`, "utf8"));
const drive = JSON.parse(readFileSync(`${APP}/content/drive-catalog.json`, "utf8"));

function decodeStar(cd) {
  const m = /filename\*=UTF-8''([^;]+)/.exec(cd || "");
  return m ? decodeURIComponent(m[1]) : null;
}

async function probe(label, path, expectTitle) {
  const out = { label, path, expectTitle };
  for (const [key, url] of [["inline", `${ORIGIN}${path}`], ["dl", `${ORIGIN}${path}${path.includes("?") ? "&" : "?"}dl=1`]]) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      const cd = r.headers.get("content-disposition");
      out[key] = { status: r.status, cd, saveAs: decodeStar(cd), type: r.headers.get("content-type"), len: r.headers.get("content-length") };
      if (r.body) await r.body.cancel();
    } catch (e) {
      out[key] = { error: String(e.message || e) };
    }
  }
  return out;
}

const targets = [];

// A seed file, image (NetFree answers 418 to PDF bodies from supabase.co, so an
// image is the one that proves the whole path end to end from this machine).
const seedImg = seed.find((x) => x.kind === "image");
targets.push(["seed image", seedImg.file.replace(/^\//, "/"), seedImg.title, seedImg]);
const seedPdf = seed.find((x) => x.kind === "pdf" && !/\.[A-Za-z0-9]{1,5}$/.test(x.title));
targets.push(["seed pdf, title with no extension", seedPdf.file, seedPdf.title, seedPdf]);

// A drive file: the source with no extension in its URL at all.
const dItem = drive.find((x) => x.kind === "image" && /"/.test(x.title)) || drive.find((x) => x.kind === "image");
targets.push(["drive image, illegal char in title", dItem.file, dItem.title, dItem]);

// Guard rails.
targets.push(["bad seed name", "/api/shelf/../../etc", null, null]);
targets.push(["absent upload", "/api/upload/up_zzzz_zzzz.png", null, null]);

const results = [];
for (const [label, path, title] of targets) results.push(await probe(label, path, title));

for (const r of results) {
  console.log(`\n== ${r.label}`);
  console.log(`   ${r.path}`);
  if (r.expectTitle) console.log(`   title on the shelf: ${r.expectTitle}`);
  console.log(`   inline: ${r.inline.status}  ${r.inline.cd}`);
  console.log(`   dl=1  : ${r.dl.status}  ${r.dl.cd}`);
  if (r.dl.saveAs) console.log(`   saves as: ${r.dl.saveAs}`);
}
