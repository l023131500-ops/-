# 30 CRM זכויות — favicon.svg

NEEDS_USER.md §0פ: מתוך חמש שנשארו (`studio`/`bkalot`/`crm`/`gesher`/`kesef`),
`studio` כבר נסגר. `crm` נבדק עכשיו — יש לה סימן גרפי חי בנווט
(`app-sidebar.tsx`: תג מעוגל `bg-primary` עם אייקון lucide `ShieldCheck` ב-
`text-primary-foreground`, בכל עמוד אחרי כניסה). אין `rel="icon"` בכלל
ב-`__root.tsx` הקודם — הלשונית נפלה ל-favicon של הדומיין (`more30.com`).

**צבעים.** נמדדו ב-Playwright מול הייצור (`getComputedStyle` על התג החי,
`https://more30.com/crm/dashboard`, מחובר כ-`test@more30.com`):
- תג רקע (`bg-primary`): `lab(40.63 -29.46 -8.82)` → `rgb(0, 109, 109)` = `#006D6D`
- אייקון (`text-primary-foreground`): `lab(98.89 -1.58 -0.67)` → `rgb(248, 253, 253)` = `#F8FDFD`
- ניגודיות `#F8FDFD` על `#006D6D` ≈ 6.0:1 — AA תקין.

**מה נכתב.**
- `apps/30-zchuyotpro-crm/public/favicon.svg` — 32×32, `rx=7`, רקע `#006D6D`,
  אייקון `ShieldCheck` (מ-`node_modules/lucide-react/dist/esm/icons/shield-check.js`,
  נתיב מדויק מהחבילה המותקנת) ב-`#F8FDFD`, אותו פורמט כמו `studio`.
- `apps/30-zchuyotpro-crm/src/routes/__root.tsx` — נוספה שורת `links`:
  `{ rel: "icon", href: "/crm/favicon.svg", type: "image/svg+xml" }`.
- `apps/30-zchuyotpro-crm/vercel.json` — נוספה שורת rewrite:
  `{ "source": "/crm/favicon.svg", "destination": "/favicon.svg" }`, לצד
  ה-rewrite הקיים ל-`/crm/assets/*` (אותו דפוס בדיוק — בלעדיו הנתיב
  המונט-יחסי לא נפתר).

**בנייה ופריסה.** `vite build` מקומי אימת שאין שגיאות ושה-favicon נכנס ל-
`.output`/`.vercel/output/static/favicon.svg`. הפריסה עצמה בוצעה **ממקור, לא
`--prebuilt`** (`vercel deploy --prod --yes`) — כי `config.json` שנוצר ע"י
ה-nitro/vercel preset של TanStack Start **אינו** כולל את ה-rewrites מ-
`vercel.json` (0 התאמות ל-"rewrites"/"favicon" ב-`.vercel/output/config.json`
המקומי), כלומר פריסת `--prebuilt` הייתה שוברת גם את ה-rewrite הקיים של
`/crm/assets/*` וגם את החדש. `dpl_4jBUsuzs9d8ytUixZbJJ1SYPUsrC`, READY.

**אימות.**
- `GET https://more30.com/crm/favicon.svg?cachebust=0817crm` → `200`.
- `GET https://crm-more30.vercel.app/favicon.svg` (ישירות, בלי המונט) → `200`.
  (שני אלה חוזרים `content-type: image/webp` — זו החלפת NetFree ברמת הפרוקסי
  המקומי, לא תקלת ייצור; אותו דפוס כמו `studio`.)
- `Vercel API GET /v13/deployments/{id}/files` (לא עובר דרך NetFree): הקובץ
  `public/favicon.svg` קיים בעץ שהועלה לפריסה.
- הדף החי (`more30.com/crm/dashboard?cachebust=0817crm`) כותב
  `<link rel="icon" href="/crm/favicon.svg" type="image/svg+xml">`.
- 0 שגיאות קונסולה בטעינת הדשבורד אחרי הפריסה — ה-rewrite הקיים ל-assets לא נשבר.

**אין צורך יותר בקובץ ממך עבור `crm`.**
