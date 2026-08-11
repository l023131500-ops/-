// Puts one real uploaded file on the shelf and prints its id, so the browser
// half of this harness has something to cache and then lose.
const B = "http://localhost:3043/gannenet";
const src = await fetch(`${B}/api/shelf/16QLfhd7JsxdUZtVXgs33DhIXUZGT916_.jpg`);
const bytes = new Uint8Array(await src.arrayBuffer());
const fd = new FormData();
fd.set("file", new File([bytes], "sw-evict-probe.jpg", { type: "image/jpeg" }));
fd.set("title", "QA פינוי מטמון אחרי מחיקה");
fd.set("category", "כללי");
fd.set("sender", "QA");
const up = await fetch(`${B}/api/catalog`, { method: "POST", body: fd });
const j = await up.json();
console.log(`${up.status} ${j?.item?.id} ${j?.item?.file} ${bytes.length}B`);
