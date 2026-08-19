// בודק את המסומנים מול קובץ מקומי: הגרסה שבייצור, המקור, ו-dist לפני ואחרי
// ה-staging. ארבע המדידות האלה הן מה שמפריד בין «העתקתי» לבין «העותק שנפרס הוא
// באמת הקובץ הזה» — portal/dist יושב על הדיסק ופריסה מ-dist ישן אינה מדווחת דבר.
import { readFileSync } from "node:fs";
import { report } from "./markers.mjs";

const t = readFileSync(process.argv[2], "utf8");
console.log(process.argv[2], t.length, "chars", Buffer.byteLength(t, "utf8"), "bytes");
const r = report(t);
console.log("new:", r.new);
console.log("removed:", r.removed);
console.log("old:", r.old);
