# Pinkas — Financial Management Marketing Site

אתר שיווקי עצמאי עבור **ניהול פיננסי מבית בקלות**. RTL עברית, סטטי לחלוטין.

## הרצה מקומית

האתר הוא קוד HTML/CSS/JS טהור.

```bash
python -m http.server 8081 --directory financial-marketing-site
# או:
npx serve financial-marketing-site
```

ואז `http://localhost:8081`.

## פריסה

- כל סטטיק-הוסט: S3 + CloudFront, Vercel, Netlify, Cloudflare Pages, GitHub Pages.
- בטופס יש לחבר ל-`leads-api` (Supabase Edge Function שכבר קיים בקוד המקור הפיננסי).
- המעבר ל"בקשת זכויות" צריך לפתוח טופס שמתקשר ל-API של בקלות מיצוי זכויות (לפי `bkalut_financial_integration_prd.md`).

## מבנה

```
financial-marketing-site/
├─ index.html
├─ styles.css
├─ script.js
├─ favicon.svg
└─ README.md
```

## מערכת מיתוג (לא להעתיק מ-Lovable!)

- **שם מותג**: "פינקס" — שם בעל גוון יהודי-מסורתי, אך מודרני. אפשר להחליף לפני השקה אם מעדיפים שם אחר.
- **פלטה**: deep navy (#16224c) + warm amber (#d09431) + ivory (#f7f5ee). תחושת מדויקת, אמינה, חמה.
- **טיפוגרפיה**: General Sans לכותרות, Satoshi לגוף הטקסט. שניהם מ-Fontshare.
- **טון**: בטוח, אזרחי-מודרני, תכליתי. בלי הבטחות גרנדיוזיות.
- **הקשר ל-bkalut-marketing-site**: שני המוצרים חולקים אסתטיקה של "אזרחי-מודרני, עברית מודרנית, פלטה חמה ולא קרה" — אבל כל אחד עם זהות צבעונית משלו (teal vs navy/amber). ככה ברור שזה משפחה, לא תאומים.

## ייצוא

```bash
cd /home/user/workspace
zip -r financial-marketing-site.zip financial-marketing-site
```

## חיבור ל-bklot-app ולמוצר הפיננסי

הלידים מהאתר נקלטים ב-`leads-api` (Supabase Edge Function). בקשת זכויות מצד הלקוח עוברת ל-bkalut דרך endpoint שעוד נדרש לכתוב (פירוט ב-`deliverables/bkalut_financial_integration_prd.md`).

## נגישות

- RTL מלא, `lang="he"`, סקיפ-לינק.
- `prefers-reduced-motion`.
- ניגודיות AA. focus-visible מובלט.
