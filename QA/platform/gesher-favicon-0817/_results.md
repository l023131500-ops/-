# 31 גשר — favicon.svg — 17/08/2026

NEEDS_USER.md §0פ (רשומת favicon): אחרי studio ו-crm, נשארו bkalot (מוגן) · gesher · kesef.
gesher: אותו תבנית תג בדיוק כמו crm — `RoleLayout.tsx` מצייר בכל עמוד תג מעוגל
`bg-sidebar-primary/20` עם אייקון lucide `Shield` ב-`text-sidebar-primary-foreground`.
`__root.tsx` לא הצהיר `rel="icon"` כלל (כמו torah/crm).

## מדידה (Playwright, מחובר כ-test@more30.com, https://more30.com/gesher/client/status)

- אייקון (`svg.lucide-shield`): `getComputedStyle(svg).color` = `lab(98.84 ~0 ~0)` = `#fcfcfc`.
- הצבע הבסיסי `--sidebar-primary` (ללא ה-`/20`, לצורך רקע דגל מוצק): `#59758d`.
- ניגודיות `#fcfcfc` על `#59758d` ≈ 4.7:1 — AA לטקסט גדול/סמלים, לא 4.5:1 המלא לטקסט קטן
  (אותה רמת בדיקה כמו crm/studio, לא מחמירה יותר כי זו לשונית סמל ולא טקסט קריאה).

## מה נכתב

- `apps/31-hebrew-bridge-crm/public/favicon.svg` — עותק נאמן של lucide `Shield`
  (ללא סימן ה-check, זה ההבדל מ-crm שהוא `ShieldCheck`), רקע `#59758D`, קו `#FCFCFC`.
- `<link rel="icon" href="/gesher/favicon.svg">` נוסף ל-`__root.tsx` (מונט-יחסי).
- `vercel.json`: rewrite חדש `/gesher/favicon.svg -> /favicon.svg`, לצד ה-rewrite הקיים
  ל-`/gesher/assets/*`.

## פריסה

`vite build` מקומי (22.88s), `vercel deploy --prod` **ממקור** (לא `--prebuilt` — אותה סיבה
כמו crm: ה-`config.json` שה-nitro/vercel preset מייצר לא כולל rewrites מ-`vercel.json`).
`dpl_H5CDPazhtmVA8BEeqJ6VAVnTcRft`, READY.

## אימות (Playwright מול הייצור, cachebust)

- `GET https://more30.com/gesher/favicon.svg?cachebust=0817gesher` → `image/svg+xml`, 32×32
  (לא הוחלף ע"י NetFree, בשונה מ-studio).
- `more30.com/gesher/client/status?cachebust=0817gesher`: `document.querySelector('link[rel=icon]').href`
  = `/gesher/favicon.svg`. שגיאת קונסולה יחידה — `netfree.link/api/card/data.js` 502, תשתית
  הפרוקסי המקומי, לא האפליקציה. צילום מסך: `tab-icon.png`.

**אין צורך יותר בקובץ ממך עבור gesher.** נשארו: `bkalot` (מוגן) · `kesef` (source not-vendored).
