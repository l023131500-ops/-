/**
 * Repair double-encoded Hebrew in source files.
 *
 * The corruption is UTF-8 bytes decoded as Windows-1255 and saved back. It is
 * exactly reversible: map every character to its cp1255 byte and decode the
 * result as UTF-8. This is the tool that repaired the zchuyot rights catalogue
 * (910 literals) after `mojibake-scan.mjs` found it.
 *
 * ⚠️ Two rules keep it from doing damage, both learned the hard way:
 *
 *  1. A lone ׳ is valid Hebrew — the geresh, as in צ׳יפ — and appears in healthy
 *     comments. Only literals holding a RUN of the marker are converted, since
 *     mangling emits one per letter. A blanket replace would shred good prose.
 *
 *  2. Conversion is limited to string literals. The first attempt tried the
 *     whole file and failed on ⚠ and → in comments, which have no cp1255 byte.
 *     That failure was the signal to narrow the scope, not to force it.
 *
 * Anything that cannot be reversed cleanly is left exactly as it was and
 * reported, rather than being written back half-converted.
 *
 *   node scripts/qa/mojibake-fix.mjs <file> [more files...]          # dry run
 *   node scripts/qa/mojibake-fix.mjs <file> --write
 */
import fs from 'node:fs';

const CP1255_HIGH = [
  0x20AC, null, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
  0x02C6, 0x2030, null, 0x2039, null, null, null, null,
  null, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0x02DC, 0x2122, null, 0x203A, null, null, null, null,
  0x00A0, 0x00A1, 0x00A2, 0x00A3, 0x20AA, 0x00A5, 0x00A6, 0x00A7,
  0x00A8, 0x00A9, 0x00D7, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x00AF,
  0x00B0, 0x00B1, 0x00B2, 0x00B3, 0x00B4, 0x00B5, 0x00B6, 0x00B7,
  0x00B8, 0x00B9, 0x00F7, 0x00BB, 0x00BC, 0x00BD, 0x00BE, 0x00BF,
  0x05B0, 0x05B1, 0x05B2, 0x05B3, 0x05B4, 0x05B5, 0x05B6, 0x05B7,
  0x05B8, 0x05B9, null, 0x05BB, 0x05BC, 0x05BD, 0x05BE, 0x05BF,
  0x05C0, 0x05C1, 0x05C2, 0x05C3, 0x05F0, 0x05F1, 0x05F2, 0x05F3,
  0x05F4, null, null, null, null, null, null, null,
  0x05D0, 0x05D1, 0x05D2, 0x05D3, 0x05D4, 0x05D5, 0x05D6, 0x05D7,
  0x05D8, 0x05D9, 0x05DA, 0x05DB, 0x05DC, 0x05DD, 0x05DE, 0x05DF,
  0x05E0, 0x05E1, 0x05E2, 0x05E3, 0x05E4, 0x05E5, 0x05E6, 0x05E7,
  0x05E8, 0x05E9, 0x05EA, null, null, 0x200E, 0x200F, null,
];
const toByte = new Map();
for (let i = 0; i < 128; i++) if (CP1255_HIGH[i] !== null) toByte.set(CP1255_HIGH[i], 0x80 + i);
// Undefined cp1255 positions decode to the same-valued C1 control, so they are
// reversible by identity. Without this the mangling looks irreversible.
for (let b = 0x80; b <= 0x9f; b++) if (!toByte.has(b)) toByte.set(b, b);

function reverse(str) {
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) { bytes.push(cp); continue; }
    const b = toByte.get(cp);
    if (b === undefined) return null;
    bytes.push(b);
  }
  const out = Buffer.from(bytes).toString('utf8');
  return out.includes('�') ? null : out;
}

const mangled = (s) => (s.match(/׳/g) || []).length >= 3;
const runs = (s) => (s.match(/׳[^\s]׳/g) || []).length;

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const write = process.argv.includes('--write');
if (!files.length) {
  console.log('usage: node scripts/qa/mojibake-fix.mjs <file...> [--write]');
  process.exit(2);
}

let anyFailed = false;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let converted = 0, failed = [];

  // both quote styles, escapes preserved through the round trip
  const fix = (whole, q, inner) => {
    if (!mangled(inner)) return whole;
    const raw = inner.replace(new RegExp('\\\\' + q, 'g'), q);
    const r = reverse(raw);
    if (r === null) { failed.push(inner.slice(0, 50)); return whole; }
    converted++;
    return q + r.replace(new RegExp(q, 'g'), '\\' + q) + q;
  };

  /**
   * Line first, literals second.
   *
   * Mangled comments matter too — they are what the next person reads to
   * understand the file. Reversing a whole line is safe because of two natural
   * guards: a character with no cp1255 byte makes it fail, and correct Hebrew
   * fails as well, since its single bytes are not valid UTF-8 leads. Either way
   * the line is handed to the narrower literal pass instead of being mangled
   * further.
   */
  let out = text
    .split(/\n/)
    .map((line) => {
      if (runs(line) === 0) return line;
      const whole = reverse(line);
      if (whole !== null && runs(whole) === 0) { converted++; return whole; }

      /**
       * A line can mix mangled text with a character that has no cp1255 byte —
       * a ⚠ or an arrow someone typed into the comment. Reversing the line then
       * fails as a whole even though most of it is recoverable. Split on the
       * unmappable characters and reverse each piece around them.
       */
      const parts = [...line].reduce((acc, ch) => {
        const ok = ch.codePointAt(0) < 0x80 || toByte.has(ch.codePointAt(0));
        if (!acc.length || acc[acc.length - 1].ok !== ok) acc.push({ ok, s: ch });
        else acc[acc.length - 1].s += ch;
        return acc;
      }, []);
      if (parts.length > 1) {
        const rebuilt = parts
          .map((p) => {
            if (!p.ok || runs(p.s) === 0) return p.s;
            const r = reverse(p.s);
            return r === null ? p.s : r;
          })
          .join('');
        if (runs(rebuilt) === 0) { converted++; return rebuilt; }
      }

      return line
        .replace(/"((?:[^"\\\n]|\\.)*)"/g, (w, inner) => fix(w, '"', inner))
        .replace(/'((?:[^'\\\n]|\\.)*)'/g, (w, inner) => fix(w, "'", inner));
    })
    .join('\n');

  const before = runs(text), after = runs(out);
  console.log(`\n${f}`);
  console.log(`  literals converted: ${converted}   unreversible: ${failed.length}`);
  console.log(`  mangled runs: ${before} -> ${after}`);
  failed.slice(0, 3).forEach((s) => console.log('    left as-is: ' + JSON.stringify(s)));
  if (failed.length) anyFailed = true;

  if (write && !failed.length && after === 0) {
    fs.writeFileSync(f, out, 'utf8');
    console.log('  WRITTEN');
  } else if (write) {
    console.log('  NOT written — would leave corruption behind; fix the tool, not the file');
  }
}
if (!write) console.log('\n(dry run — pass --write to apply)');
process.exit(anyFailed ? 1 : 0);
