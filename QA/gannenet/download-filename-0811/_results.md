# gannenet (40) — what a downloaded file is called

2026-08-11. Production build (`next build`, `next start -p 3043`,
`APP_BASE_PATH=/gannenet`), real `gannenet-shelf` bucket, real catalogs.

## The defect

All three shelf sources stream through one of our own routes, and every one of
them answered a bare `Content-Disposition: attachment` — no `filename`. So the
browser named the download after the URL's last path segment, which is an id:

| source | items | saved as | title on the shelf |
|---|---|---|---|
| `/api/drive/<id>` | 2,977 | `1xBLOKC5Yje5p6E9xl-YOGNYw57g2Ro1Y` — **no extension at all** | `Fwd: תקייה על דפי משימה.pdf` |
| `/api/shelf/<id>.<ext>` | 258 | `1lfiQT79XaO-05RO7Qj8sVeXaoEbnLI6f.pdf` | `שבוע טוב וחודש טוב! - קטלוג ט''ו בשבט` |
| `/api/upload/up_…​.<ext>` | teacher's own | `up_msp02sp4_cr56.jpg` | whatever she typed |

The first row is the shelf's dominant source, and an extensionless file does not
open by double-click on Windows at all.

`catalog-scan.mjs` — measured over both real catalogs, and each number is why a
rule exists in `lib/download-name.ts`:

```
== drive: 2977 items
   titles with no trailing extension: 25 {google-apps.document 19, google-apps.spreadsheet 3, ms-tnef 1, audio/mpeg 2}
   titles carrying a character illegal in a filename: 1648
== seed: 258 items
   titles with no trailing extension: 40 {application/pdf 36, image/jpeg 2, image/png 2}
   titles carrying a character illegal in a filename: 70
   longest title: 117 chars (drive: 133)
```

## The fix

`lib/download-name.ts` — one `downloadFilename()` and one `contentDisposition()`,
called by all three routes. Sanitises what the OS rejects, canonicalises the
extension from the mime, bounds the length at 80, and emits RFC 6266's two
parameters (`filename` ASCII fallback + `filename*=UTF-8''…`) because every title
here is Hebrew.

## Verification

`name-check.mjs` evaluates the shipped `.ts` source (annotations stripped, not a
copy that could drift) over **every** catalog row:

```
checked 3235 catalog rows
failures: 0            (empty / illegal char / leading or trailing dot / >100 chars
                        / doubled extension / CR-LF header injection / malformed header)
still without any extension: 1   — application/ms-tnef, deliberately: an unknown
                                   mime yields no extension rather than a wrong one
```

Worked examples:

```
was:  1xBLOKC5Yje5p6E9xl-YOGNYw57g2Ro1Y
now:  Fwd תקייה על דפי משימה.pdf
was:  1DLzqJnpO01wOqE__MQk4eX7F1e-hSgD2sV6kfY-Pums   (Google Doc, no extension in the title)
now:  summary_5-februar_structured.docx
was:  1Tv-LMlNJpart5XozieWDF46glE4bfVni
now:  דוידוני במקלט - הסיפור שכולם חיכו לו, זמין עכשיו לרכישה! ו... יש זוכה - למקלט_לצ.png
```

Injection and edge cases:

```
"report\r\nX-Injected: 1"  -> "report X-Injected 1.pdf"     (no CR/LF survives)
'a"b\c'                    -> "a b c.png"                   (cannot close the quoted string)
""                         -> "1AbCdEfGhIj.pdf"             (falls back to the id, never empty)
"שם.JPEG" + image/jpeg     -> "שם.jpg"                      (extension canonicalised, not doubled)
"…ותנועה.pdf.pdf"          -> "…ותנועה.pdf"                 (20 Drive titles carry it twice)
dl=false                   -> "inline"                      (unchanged)
```

`serve-check.mjs`, against the running server and the real bucket:

```
/api/shelf/16QLfhd7JsxdUZtVXgs33DhIXUZGT916_.jpg
  inline: 200  inline
  dl=1  : 200  attachment; filename="_____, …___.jpg"; filename*=UTF-8''%D7%95%D7%95…
  saves as: וואוו, איזה פתרון גאוני קיבלה הגננת תמר---- - מודעה יוני גננות.jpg
/api/shelf/../../etc      404      /api/upload/up_zzzz_zzzz.png   404
```

`upload-roundtrip.mjs` — the upload route is the one that reads the title back out
of Storage at download time (`titleFor()`), so it was exercised with a real upload
through the real form route and removed through the real admin delete:

```
title uploaded: דף עבודה: ט"ו בשבט / כיתת גן — עותק?
POST /api/catalog -> 200   file: /api/upload/up_msp2wn7h_2w83.png
  inline: 200  inline
  dl=1  : 200  saves as: דף עבודה ט ו בשבט כיתת גן — עותק.png    (: " / ? all gone)
  HEAD  : 200  inline      (no metadata read — the SW's existence check stays cheap)
cleanup /api/admin/delete -> 200 removed [up_msp2wn7h_2w83.png, uploads/up_msp2wn7h_2w83.json]
catalog items after cleanup: 0    file after cleanup: 404    drive catalog: 2977
```

**In the real browser, through the real UI**, service worker active, on a file the
profile had never fetched — `item-page-download.png` is that page:

```
clicked "הורדת הקובץ" on /shelf/1E5LUC8aYmijfBR3zDYg3Gz222ft3s9nO
saved as: הופה, סוף שנה כבר כאן! - דוגמא לעמוד מתוך הקטלוג.png
(was:     1E5LUC8aYmijfBR3zDYg3Gz222ft3s9nO.png)
```

`tsc --noEmit` 0. `next build` ✓ 65 pages. Bucket left exactly as found:
`uploads/` empty, `seed/` 258, `/api/catalog` 0 items, `/api/drive-catalog` 2,977.

## What this machine could not show, and one thing the run found

`/api/drive/[id]` answers **502 here for every id**, before any header is set:
`drive.usercontent.google.com` returns NetFree's block page (**418**, verified
directly this run), so `upstream.ok` is false. The route differs from
`/api/shelf/[name]` — which is proven live above — only in that upstream fetch,
and `name-check.mjs` covers its lookup and header for all 2,977 rows. Seed PDFs
are 502 here for the same reason (NetFree answers 418 to PDF bodies from
`supabase.co`); the image proves the same code path end to end.

**Open, and reproduced this run.** The first file tested kept saving as its id
after the change, and the cause is not the change: `files-gannenet-v3` held a
copy fetched by an earlier run of the pre-change build, and `cacheFirst()` in
`public/sw.js` returns a cache hit *ignoring the request's cache mode* — a
`fetch(url, {cache: "reload"})` from the page never reached the network, and the
cached response carries the old headers for ever. Measured:

```
caches.match(".../16QLfhd7…jpg?dl=1").headers["content-disposition"]  ->  "attachment"
fetch(same URL)                                                       ->  "attachment"
fetch(same URL + "&z=<random>")                                       ->  full header
server, node, exact URL                                               ->  full header
```

Two things follow, both for a later step. A teacher who viewed a file before an
update keeps its old response headers indefinitely — the same staleness class the
catalog cache was moved off, still true for `FILES`. And the cache holds the
`?dl=1` variant *and* the bare URL as two entries for one file: two full copies of
every file she both views and downloads, against her storage quota, when the only
difference between them is one header. Not fixed here: `FILES` is her offline
material and bumping its version drops it.
