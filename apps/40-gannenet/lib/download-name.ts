/**
 * What a downloaded file is called on the teacher's disk.
 *
 * All three shelf sources stream through one of our own routes and every one of
 * them answered a bare `Content-Disposition: attachment`, with no `filename`. So
 * the browser fell back to the last path segment of the URL, which is an id:
 *
 *   /api/drive/1xBLOKC5Yje5p6E9xl-YOGNYw57g2Ro1Y   → saved as that, no extension
 *   /api/shelf/1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f.pdf → right extension, no name
 *   /api/upload/up_msp02sp4_cr56.jpg                → the teacher's own name lost
 *
 * The first is the shelf's dominant source — 2,977 of 3,235 items — and an
 * extensionless file does not open by double-click on Windows at all. The title
 * is right there in the catalog; this builds a filename out of it.
 *
 * Measured against the real catalogs (`QA/gannenet/download-filename-0811/`),
 * which is why each rule below exists:
 *  - 1,648 drive titles and 70 seed titles carry a character that is illegal in a
 *    filename (`Fwd: …`, `"דוידוני במקלט"…`, `מה שרים אצלכם לפני התפילה?`), so a
 *    title cannot be used raw.
 *  - 2,952 of 2,977 drive titles already end in their own extension, so one must
 *    not be appended twice; the 25 that do not are Google-native docs and audio.
 *  - the longest title is 133 characters, past what some filesystems accept once
 *    a download folder path is in front of it.
 */

// Only formats the shelf actually holds. An unknown mime yields no extension
// rather than a wrong one — a correctly-named file with no suffix is still
// better than a 33-character Drive id, and a wrong suffix is worse than none.
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/x-photoshop": "psd",
  "video/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "text/html": "html",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  // Drive exports its native types on download; these are what it hands back.
  "application/vnd.google-apps.document": "docx",
  "application/vnd.google-apps.spreadsheet": "xlsx",
  "application/vnd.google-apps.presentation": "pptx",
};

// Windows rejects these outright and every OS mangles some of them; the control
// range would also let a header be split.
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

const MAX_BASE = 80;

export function extForMime(mime: string): string {
  return EXT_BY_MIME[(mime || "").toLowerCase().split(";")[0].trim()] || "";
}

/** The extension already at the end of a title or object name, if there is one. */
function trailingExt(name: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/**
 * A filename for `title`, carrying the right extension exactly once.
 *
 * `objectName` is the URL's own last segment — the name the browser would have
 * used — and is the last resort for both the stem and the extension, so this is
 * never worse than the behaviour it replaces.
 */
export function downloadFilename(opts: {
  title?: string;
  mime?: string;
  objectName?: string;
}): string {
  const raw = String(opts.title || "").trim();
  const objectName = String(opts.objectName || "");

  const ext = extForMime(opts.mime || "") || trailingExt(raw) || trailingExt(objectName);

  // Drop the title's own extension before sanitising, so it can be re-appended
  // in its canonical form ("…‎.JPEG" and "…‎.jpg" name one file, not two).
  // Repeatedly, because 20 Drive titles already carry it twice — Google's own
  // data holds "…סביבון אוריינות ותנועה.pdf.pdf".
  let base = raw;
  for (;;) {
    const t = trailingExt(base);
    if (!t || (ext && t !== ext)) break;
    base = base.slice(0, base.lastIndexOf("."));
    if (!ext) break; // nothing canonical to re-append: strip the one and stop
  }

  base = base
    .replace(ILLEGAL, " ")
    .replace(/\s+/g, " ")
    // A name may not end in a dot or a space on Windows, and a leading dot
    // hides the file everywhere else.
    .replace(/^[.\s]+|[.\s]+$/g, "");

  if (base.length > MAX_BASE) base = base.slice(0, MAX_BASE).replace(/[.\s]+$/, "");

  // An id is still a name; an empty string is not a filename at all.
  if (!base) base = (objectName.split(".")[0] || "file").replace(ILLEGAL, "_");

  return ext ? `${base}.${ext}` : base;
}

/**
 * `Content-Disposition` for a shelf file.
 *
 * Hebrew filenames need RFC 6266's two-parameter form: `filename` is the
 * ASCII-only fallback an old client reads, `filename*` carries the real name as
 * UTF-8. `encodeURIComponent` leaves `'()*` alone and RFC 5987's attr-char set
 * does not admit them, so those are escaped on top of it.
 */
export function contentDisposition(dl: boolean, filename: string): string {
  if (!dl) return "inline";
  if (!filename) return "attachment";

  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
  // A fallback of nothing but underscores says less than the id would.
  const fallback = /[A-Za-z0-9]/.test(ascii) ? ascii : "file";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${utf8}`;
}
