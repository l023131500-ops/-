# apps/ — מרשם המערכות (Phase 1)

כל מערכת רשומה כאן כ-`NN-slug/app.json` — **manifest** (מספר, מחלקה, שלב, Supabase
project+schema, יעד פריסה, basePath). המספור **01–31 מאושר**; **32** = נדל"ן ברגע.

## מה נמצא ב-git ומה לא (חשוב!)

הריפו הזה **ציבורי**, והמערכות המקוריות **פרטיות ומכילות סודות**. לכן:

- ✅ **נעקב ב-git:** manifests (`app.json`), `STATUS.md`, ה-README הזה, ה-core schema,
  לוח ה-admin, מרשם ה-config, ותיעוד — הכל **ללא ערכי סוד**.
- 🚫 **לא נעקב (נשמר מקומית בלבד):** **קוד המקור המלא** של כל מערכת. הוא יובא מקומית
  ב-Phase 1 (לצורך מיפוי מדויק והמשכיות) אך **אסור לדחוף אותו לריפו ציבורי** — זה
  יחשוף קוד פרטי ויזליג `.env`/סודות. ראה `.gitignore` ו-`../CONNECTIONS.md`.
- **מוגן 🔒 (לא יובא):** `08-bkalut-app`, `09-bkalot-admin` — manifest בלבד.
- **ארכיון 📦 (`_archive/`):** קפוא, לא נפרס, לא נמחק, לא נעקב.

**החלטת אירוח פתוחה:** כדי לאחסן את הקוד עצמו במונו-רפו צריך להחליט — להפוך את הריפו
לפרטי, או לחבר את המערכות כ-git submodules. עד אז: manifests בלבד.

## מטריצת סטטוס (32 מערכות)

| # | מערכת | מחלקה | שלב | חי | פרוס | Supabase | פריסה | קבצים* |
|---|---|---|---|---|---|---|---|---|
| 01 | torah-platform (HUB) | עורך תורני | live | ✅ | ✅ | bieebmnm | vercel | 219 |
| 02 | igud-transcribe | עורך תורני | beta | ✅ | ✅ | bieebmnm | vercel | 40 |
| 03 | igud-ads | עורך תורני | live | ✅ | ✅ | bieebmnm | vercel | 101 |
| 04 | imud-torani | עורך תורני | beta | ✅ | — | ? | railway | 92 |
| 05 | financial-marketing-site | פיננסי | wip | — | — | — | — | 7 |
| 06 | kupot-holim | בריאות | wip | — | — | csjekrvu | — | 17 |
| 07 | zol | שונות | wip | — | — | — | — | 2 |
| 08 | 🔒 bkalut-app | בקלות | protected | ✅ | ✅ | pwcswdfg | — | manifest |
| 09 | 🔒 bkalot-admin | בקלות | protected | ✅ | ✅ | ? | — | manifest |
| 10 | bkalot-rights | זכויות | wip | — | — | bieebmnm | — | 35 |
| 11 | bkalut-marketing2 | בקלות | wip | — | — | — | — | 6 |
| 12 | smel-ndln | נדל"ן | wip | — | — | csjekrvu | — | 86 |
| 13 | property-identity | נדל"ן | wip | — | — | — | — | 11 |
| 14 | bsmachot-plus | שונות | wip | — | — | — | — | 36 |
| 15 | egod | עורך תורני | live | ✅ | — | hkkky | lovable | 154 |
| 16 | chatzor-connect | קהילה | wip | — | ✅ | mwljkonw | vercel | 144 |
| 17 | chizukim-transcribe | עורך תורני | wip | — | ✅ | csjekrvu | vercel | 85 |
| 18 | torah-editor-mvp | עורך תורני | wip | — | — | bieebmnm | — | 38 |
| 19 | igud-shiurim-portal | עורך תורני | wip | — | — | — | — | 6 |
| 20 | igud-portal | עורך תורני | wip | — | — | — | — | 7 |
| 21 | mthbram | שונות | wip | — | — | aypsq | — | 204 |
| 22 | get-your-rights | זכויות | wip | — | — | trerolyv | — | 122 |
| 23 | haorech-torani | עורך תורני | wip | — | — | — | — | 1 |
| 24 | galilee-connect-hub | קהילה | wip | — | — | mwljkonw | — | 148 |
| 25 | mor1-main-site | שונות | wip | — | — | — | — | 0 (ריק) |
| 26 | modaot-studio | עורך תורני | wip | — | — | — (AI) | — | 132 |
| 27 | bkalut-price | בקלות | wip | — | — | csjekrvu | — | 255 |
| 28 | kupot-health-funds | בריאות | wip | — | ✅ | ? | vercel | 89 |
| 29 | bkalot-design | בקלות | wip | — | — | — | — | 7 |
| 30 | zchuyotpro-crm | זכויות | wip | — | — | jhbeelzv | — | 148 |
| 31 | hebrew-bridge-crm | קהילה | wip | — | — | ygaqq | — | 155 |
| 32 | **נדל"ן ברגע** | נדל"ן | live | ✅ | ✅ | uhnrgujb/nadlan | vercel | 47 |

*קבצים = נספרו בייבוא המקומי. סטטוס חי מלא: `core.project_overview` + לוח `admin/`.
