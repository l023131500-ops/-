/**
 * Inflate a PDF's FlateDecode streams and hand back the raw content-stream
 * operators as text.
 *
 * Written because two cheaper signals disagreed about whether Chromium renders
 * @page margin boxes: a byte-length A/B said "something changed", a latin1
 * search for the header string said "not there". Both are indirect — byte
 * length also moves when a font subset changes, and a text search misses
 * glyphs written through a subset encoding. Reading the operators settles it,
 * because a painted box leaves a fill operator whatever the encoding is.
 *
 * Not a PDF parser. It finds `stream`/`endstream` pairs and tries to inflate
 * each; anything that will not inflate is skipped.
 */
import zlib from "node:zlib";

/** @param {Buffer} buf @returns {string} concatenated inflated content streams */
export function pdfContentOps(buf) {
  const out = [];
  const hay = buf.toString("latin1");
  let i = 0;
  for (;;) {
    const s = hay.indexOf("stream", i);
    if (s < 0) break;
    const e = hay.indexOf("endstream", s);
    if (e < 0) break;
    // skip the EOL after the `stream` keyword (CRLF or LF)
    let start = s + "stream".length;
    if (hay[start] === "\r") start++;
    if (hay[start] === "\n") start++;
    const raw = buf.subarray(start, e);
    try {
      out.push(zlib.inflateSync(raw).toString("latin1"));
    } catch {
      /* not a flate stream (font file, image, metadata) — ignore */
    }
    i = e + "endstream".length;
  }
  return out.join("\n");
}

/**
 * Fill-colour operators present in the content streams, as [r,g,b] in 0..1.
 * Used to ask "did this rectangle get painted at all".
 */
export function fillColors(ops) {
  return [...ops.matchAll(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg\b/g)].map((m) => [
    +m[1],
    +m[2],
    +m[3],
  ]);
}

/**
 * Was `#rrggbb` painted?
 *
 * ⚠️ Compare with a tolerance, never by string equality. A PDF writes colour
 * components rounded to three decimals: #008040 comes back as `0 0.502 0.251`,
 * not `0 0.501961 0.25`. An exact match reports "not painted" for a box that
 * plainly was — which is exactly the false negative this probe produced first
 * time round.
 */
export function paintedColor(colors, hex, tol = 0.002) {
  const want = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return colors.some((c) => c.every((v, i) => Math.abs(v - want[i]) <= tol));
}
