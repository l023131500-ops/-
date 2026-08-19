/**
 * favicon-build — עוטף PNG 32×32 בכותרת ICO ומייצר portal/public/favicon.ico
 *
 * למה בכלל .ico ולא רק .svg: דפדפן שאינו מוצא הצהרת icon בעמוד מבקש
 * /favicon.ico מהשורש בלי שאף אחד ביקש ממנו, וזו הבקשה שהחזירה 404 מ-more30.com.
 * הצהרות ה-link בעמודים מכסות את המודרניים; ה-.ico מכסה את הבקשה האוטומטית
 * ואת מי שאינו מצייר SVG.
 *
 * ICO תומך במטען PNG שלם מאז Vista, ולכן אין כאן קידוד מחדש — רק 22 בייטים
 * של כותרת לפני הקובץ שהדפדפן כבר צייר.
 *
 * הזרימה המלאה (הרסטור עצמו נעשה בדפדפן, לא כאן — אין מקודד גופנים/עקומות ב-node):
 *   1. node scripts/qa/_favicon-serve.mjs        # מגיש את מתלה הרסטור
 *   2. playwright: viewport 180×180 → portal/public/apple-touch-icon.png
 *   3. playwright: viewport 32×32   → QA/platform/favicon-0810/src-32.png
 *   4. node scripts/qa/favicon-build.mjs         # ← הקובץ הזה
 */
import { readFile, writeFile } from 'node:fs/promises';

const SRC = new URL('../../QA/platform/favicon-0810/src-32.png', import.meta.url);
const OUT = new URL('../../portal/public/favicon.ico', import.meta.url);
const SIDE = 32;

const png = await readFile(SRC);

// PNG magic — אם המקור אינו PNG, ICO שנבנה ממנו לא ייפתח בשום דפדפן, ועדיף
// ליפול כאן מאשר לפרוס אייקון שבור.
const MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!png.subarray(0, 8).equals(MAGIC)) throw new Error(`${SRC.pathname} is not a PNG`);

// רוחב וגובה יושבים ב-IHDR, בייטים 16..23. נמדדים ולא מונחים.
const w = png.readUInt32BE(16);
const h = png.readUInt32BE(20);
if (w !== SIDE || h !== SIDE) throw new Error(`expected ${SIDE}×${SIDE}, got ${w}×${h}`);

const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0); // reserved
dir.writeUInt16LE(1, 2); // 1 = icon
dir.writeUInt16LE(1, 4); // תמונה אחת

const entry = Buffer.alloc(16);
entry.writeUInt8(SIDE, 0);        // רוחב (0 = 256)
entry.writeUInt8(SIDE, 1);        // גובה
entry.writeUInt8(0, 2);           // צבעי פלטה — 0 כי זה לא מפת-סיביות
entry.writeUInt8(0, 3);           // reserved
entry.writeUInt16LE(1, 4);        // planes
entry.writeUInt16LE(32, 6);       // סיביות לפיקסל
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(dir.length + entry.length, 12); // היסט המטען = 22

await writeFile(OUT, Buffer.concat([dir, entry, png]));
console.log(`favicon.ico ← ${w}×${h} PNG, ${dir.length + entry.length + png.length} bytes`);
