# Bkalut Rights — Marketing Site

אתר שיווקי עצמאי עבור **בקלות מיצוי זכויות**. RTL עברית, סטטי לחלוטין.

## הרצה מקומית

האתר הוא קוד HTML/CSS/JS טהור — אין צורך ב-build.

```bash
# הצגה מהירה
python -m http.server 8080 --directory bkalut-marketing-site
# או:
npx serve bkalut-marketing-site
```

ואז גלשו ל-`http://localhost:8080`.

## פריסה

- העלו את התוכן של התיקייה לכל סטטיק-הוסט (S3 + CloudFront / Vercel / Netlify / Cloudflare Pages / GitHub Pages).
- אין צורך בשרת backend. טופס הצרו-קשר הוא מודל מקדמת — בייצור יש לחבר ל-n8n webhook של בקלות.

## מבנה

```
bkalut-marketing-site/
├─ index.html           # דף יחיד עם sections
├─ styles.css           # מערכת עיצוב + RTL
├─ script.js            # מודלים, smooth scroll, שליחת טופס אסינכרונית ל-n8n
├─ favicon.svg          # לוגו מצומצם
└─ README.md
```

## מערכת מיתוג (לא להעתיק מ-Lovable!)

- **פלטה**: deep teal (#0f5e57) + warm sand + parchment cream. תחושת בטוח, רשמי-חם, בלי להיות "פיננסי-קר".
- **טיפוגרפיה**: Satoshi מ-Fontshare. ניגודיות במשקלים, לא בפונטים.
- **טון**: שירותי, אזרחי-מודרני. שקיפות > הבטחות.
- **לוגו**: סמן גיאומטרי מינימליסטי (משולש שמסמל גרסות הררי + נקודת מיקוד) ש"מצביע" על נקודה — מצביע על זכות.

## חיבור ל-bklot-app

האתר הזה הוא ממשק הציבור. הלידים אמורים לעבור ל-`https://n8n.l023131500.work/webhook/NEDARIM3873`.
בקוד הקיים לא משולב webhook חי (כדי לא לזהם פרוד מסביבת פיתוח). הוסיפו אותו ידנית לפני העלאה.

## ייצוא

```bash
# יצירת ZIP לשיתוף
cd /home/user/workspace
zip -r bkalut-marketing-site.zip bkalut-marketing-site
```

## ניהול תוכן עתידי

הקטגוריות, המספרים והציטוטים — נמצאים ישירות ב-`index.html`. לארכיטקטורה גדולה יותר (CMS), שקלו 11ty / Astro מאוחר יותר. בגרסה זו פשטות נבחרה במכוון.

## נגישות

- RTL מלא, `lang="he"`, סקיפ-לינק.
- מצב `prefers-reduced-motion` מכובד.
- ניגודיות צבעים עומדת ב-WCAG AA.

## תלות חיצונית

- Fontshare CSS (`api.fontshare.com`) לפונט Satoshi. אופציונלי — אם רוצים autonomy מלא, החליפו לפונט מקומי.
