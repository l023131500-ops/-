// שפיות קידוד על admin.html. נכתב ב-node ולא ב-PowerShell: קובץ .ps1 בלי BOM
// נקרא כ-cp1255 והעברית שבתוך הביטוי נהרסת בזמן הפירוק ומדווחת «לא נמצא» על
// טקסט קיים. גם התווים עצמם נבנים מנקודות-קוד ולא נכתבים כאן כתו.
import { readFileSync } from "node:fs";

const s = readFileSync(process.argv[2] ?? "apps/37-bkalot-clone/admin.html", "utf8");
const count = (cp) => s.split(String.fromCodePoint(cp)).length - 1;

console.log(JSON.stringify({
  bytes: Buffer.byteLength(s, "utf8"),
  alephs: count(0x05d0),                       // א
  replacement_chars: count(0xfffd),            // תו החלפה — סימן לפירוק שגוי
  double_encoded: (s.match(new RegExp(String.fromCodePoint(0x00d7) + "[\\u0080-\\u00ff]", "g")) || []).length,
  has_helper: s.includes("function fillDecidedLine"),
  call_sites: (s.match(/fillDecidedLine\(/g) || []).length,
}, null, 2));
