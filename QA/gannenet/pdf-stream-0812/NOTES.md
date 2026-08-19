# gannenet (40) — the shelf preview waited for the last byte of the PDF

`components/PdfViewer.tsx`, the preview under every PDF on `/shelf/[id]`.

## What was wrong

The component fetched the whole file into an `ArrayBuffer`, wrapped it in a
`Blob`, and only then handed a `blob:` URL to `<object>`. A blob cannot exist
until the last byte has landed in JS, so the reader sat on **טוען תצוגה…** for
the entire download before a single page appeared — even though nothing about
the untrimmed file needed rewriting. 234 of the 258 shelf files are PDFs and the
largest are ~1.9 MB (`והפעם נדבר על החמץ`, 1944 KB).

The blob was also a second full copy of the document in memory, and the embedded
viewer's title bar showed the blob UUID instead of the file's name.

## The change

When nothing is hidden (the overwhelming majority — `hiddenPages` is admin
curation), `<object data>` is now `fileUrl` itself, set synchronously as the
effect runs. The native viewer paints page 1 while the rest is still arriving.
The buffer the page-selection tool needs is still fetched, from the same
same-origin URL, served `Cache-Control: public, max-age=86400`.

Trimmed files are untouched: their preview is a genuinely different document
(visible pages only) and still goes through pdf-lib and a blob.

Error handling keeps its meaning: a failure *before* the bytes arrive takes the
optimistic preview back down and shows the notice (the `<object>` is reading the
same URL and would fail the same way); a failure *after* them — the pdf-lib
chunk, trimming — leaves the preview up, as it did before.

## Verification

This machine cannot reach the `gannenet-shelf` bucket (`/api/shelf/…` answers
502; the 258 seed objects are present in Storage — checked over MCP), so the
component was exercised against a local 12-page PDF (`make-test-pdf.mjs`,
`qa-pdfviewer.pdf`) added to `content/catalog.json` as two temporary entries —
`qa-plain` and `qa-trimmed` (`hiddenPages: [1,2]`) — for the run. Both entries
and the PDF were removed afterwards; `content/catalog.json` is back to 258 items,
byte-identical to its pre-run copy.

`/shelf/qa-plain` — `shelf-plain-direct-url.png`
- `<object data>` = `/gannenet/qa-pdfviewer.pdf` (**not** `blob:`)
- embedded viewer reads `1 / 12` and names the file `qa-pdfviewer.pdf`
- page tool: `12 עמ׳ · נבחרו 12`
- Resource timing for the file: the `<object>` request returned
  `transferSize 300, encodedBodySize 0` — a 304 revalidation, no second copy of
  the body over the wire. (Dev's StrictMode double-invokes the effect, so two
  `fetch` entries appear; both read from cache, `transferSize 0`.)

`/shelf/qa-trimmed` — `shelf-trimmed-blob-unchanged.png`
- `<object data>` still `blob:` — unchanged path
- page tool: `10 עמ׳ (הוסתרו 2) · נבחרו 10`; the preview opens on **QA PAGE 3**,
  so pages 1–2 really are gone from it

Build/typecheck on the real catalog, before the QA entries went in:
- `tsc --noEmit` → 0
- `next build` → 194 pages, 180 `/lesson/[id]` paths, `/shelf/[id]` 2.78 kB /
  98.8 kB first load — unchanged from the previous step
- console: 0 errors; 1 pre-existing `apple-mobile-web-app-capable` deprecation
  warning
