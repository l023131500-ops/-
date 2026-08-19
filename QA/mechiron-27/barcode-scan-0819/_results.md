# mechiron (27) — camera barcode scan — 19/08/2026

## What was built
`client/src/components/barcode-scanner-dialog.tsx` (new) — a Dialog with a
camera viewport, using the native `BarcodeDetector` API + `getUserMedia`.
Wired into `client/src/pages/public-price-comparison.tsx`: a new
"סריקת ברקוד" button next to the existing search bar, feature-detected via
`isBarcodeScanSupported()` (checks `window.BarcodeDetector` and
`navigator.mediaDevices.getUserMedia`). On a detected barcode it fills the
existing search input and calls the existing `runSearch()` — no backend
change, search-by-barcode already worked server-side.

## Why this is additive-only
The button only renders when the browser supports `BarcodeDetector`
(Android Chrome / ChromeOS today; not desktop Chrome/Firefox or iOS Safari).
Everywhere else it simply doesn't render — the existing manual
type-the-barcode search (already in the placeholder text) is unaffected.

## Verification
- `tsc --noEmit` — clean, 0 errors.
- `script/build.ts` (vite) — clean build, 2410 modules.
- Local: served `dist/public` statically under `/mechiron/`, confirmed via
  Playwright that on this desktop Chromium build `BarcodeDetector` is absent
  (`'BarcodeDetector' in window` → false), so the button correctly does not
  render — matches expected desktop behavior.
- Local (temporary test-only override, reverted before commit): forced
  `scanSupported=true` to confirm the dialog itself renders correctly —
  opens with heading "סריקת ברקוד", viewport, instruction text; clicking
  triggers a real `getUserMedia` permission request (confirmed pending via
  a direct `evaluate` call that hung on the browser's own permission
  prompt, as expected with no fake-device flag configured) — i.e. the
  camera-request code path is real, not a stub.
- Deployed `dpl_DhrftyoMQEhtgaEhrwkzWAHG3MZE` (mechiron-more30, production,
  prebuilt-style deploy from `_deploy/mechiron-more30`, ~10s — the healthy
  fast profile for this project).
- Live verification (Playwright, `more30.com/mechiron/?cachebust=0819barcode`):
  0 console errors, scan button correctly absent (same desktop-Chromium
  reason as local), and every existing control still present and working —
  search input, "חיפוש", "סינון", "עוזר חיסכון חכם", "הורדת דוח PDF",
  "שיתוף", "רשימת קניות", category chips.

## Not verified (documented, not hidden)
- Real end-to-end scan-to-result on a `BarcodeDetector`-supporting browser
  (e.g. real Android Chrome) — no such device/browser available in this
  environment. The button visibility logic, dialog mount, and camera
  permission flow are all confirmed real; only the final "detector reads a
  real barcode and navigates to the right product" step is unverified live.
