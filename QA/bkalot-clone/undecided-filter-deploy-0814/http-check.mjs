// מודד את הכתובות החיות לפני ואחרי הפריסה.
// נכתב ב-node ולא ב-PowerShell בכוונה: .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "./marker-check.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const URLS = [
  "https://more30.com/bkalot-studio/admin",
  "https://more30.com/bkalot-studio/admin/", // rewrite נפרד — נמדד בנפרד
  "https://more30.com/bkalot-studio", // רגרסיה: לא אמור לזוז
  "https://more30.com/", // רגרסיה: לא אמור לזוז
];

const out = [];
for (const url of URLS) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  const text = await res.text();
  out.push({
    url,
    status: res.status,
    ...inspect(url, text),
    alefs: (text.match(/א/g) || []).length,
    replacement_chars: (text.match(/�/g) || []).length,
    // סימני כפל-קידוד: גרש עברי שעבר cp1255→utf8 פעמיים
    double_encoded: (text.match(/×[-¿]/g) || []).length,
    assets: [...text.matchAll(/(?:src|href)="([^"]*index-[^"]+)"/g)].map((x) => x[1]),
  });
}

const label = process.argv[2] || "run";
writeFileSync(join(HERE, `http-${label}.json`), JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    out.map((r) => ({
      url: r.url,
      status: r.status,
      bytes: r.bytes,
      alefs: r.alefs,
      repl: r.replacement_chars,
      dbl: r.double_encoded,
      new_hits: Object.values(r.NEW).filter((n) => n > 0).length,
      removed_hits: Object.values(r.REMOVED).filter((n) => n > 0).length,
      old_hits: Object.values(r.OLD).filter((n) => n > 0).length,
      trap_hits: Object.values(r.TRAP).filter((n) => n > 0).length,
      assets: r.assets,
    })),
    null,
    2,
  ),
);
