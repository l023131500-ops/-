// מודד את הכתובות החיות לפני ואחרי הפריסה.
// נכתב ב-node ולא ב-PowerShell בכוונה: .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתבנית נהרסת בזמן הפירוק ומדווחת «לא נמצא» על טקסט קיים.
import { writeFileSync } from "node:fs";
import { inspect } from "./marker-check.mjs";

const URLS = [
  "https://more30.com/bkalot-studio",
  "https://more30.com/bkalot-studio/",      // rewrite נפרד — נמדד בנפרד
  "https://more30.com/bkalot-studio/admin", // רגרסיה: לא אמור לזוז
  "https://more30.com/",                    // רגרסיה: לא אמור לזוז
];

const out = [];
for (const url of URLS) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  const text = await res.text();
  const m = inspect(url, text);
  out.push({
    url,
    status: res.status,
    ...m,
    alefs: (text.match(/א/g) || []).length,
    replacement_chars: (text.match(/�/g) || []).length,
    // סימני כפל-קידוד: גרש עברי שעבר cp1255→utf8 פעמיים
    double_encoded: (text.match(/×[-¿]/g) || []).length,
    assets: [...text.matchAll(/(?:src|href)="([^"]*index-[^"]+)"/g)].map((x) => x[1]),
  });
}

const label = process.argv[2] || "run";
writeFileSync(`http-${label}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.map((r) => ({
  url: r.url, status: r.status, bytes: r.bytes, alefs: r.alefs,
  repl: r.replacement_chars, dbl: r.double_encoded,
  new_hits: Object.values(r.new).filter((n) => n > 0).length,
  gap: r.gap_lines && r.gap_lines.between,
  assets: r.assets,
})), null, 2));
