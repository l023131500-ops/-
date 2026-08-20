# בקלות — מערכת עיצוב גלובלית (Design System)

מקור-אמת יחיד לעיצוב של **כל** מערכות בקלות: הקטלוג, הניהול, השוואת מחירים, ומערכות עתידיות.

## איך זה עובד

```
tokens.json   →  node build.js  →  bkalot-theme.css  →  Supabase Storage  →  כל המערכות
(מקור-אמת)                          (CSS גלובלי)          (אחסון ציבורי)
```

1. **`tokens.json`** — כל הצבעים, הפונטים, הרדיוסים והצללים במקום אחד.
2. **`build.js`** — ממיר את ה-tokens לקובץ CSS גלובלי עם משתני `:root`, מצב כהה, ורכיבים משותפים (כפתורים, כרטיסים, תגיות).
3. **`bkalot-theme.css`** — הקובץ שכל המערכות טוענות. **אל תערוך ידנית** — ערוך את `tokens.json` והרץ build.
4. **`style-guide.html`** — מדריך סגנון חי שמציג את כל ה-tokens והרכיבים.

## עדכון העיצוב לכל המערכות (בבת אחת)

```bash
# 1. ערוך את הצבע/פונט/גודל
nano tokens.json

# 2. בנה מחדש את ה-CSS
node build.js

# 3. העלה ל-Supabase Storage
./upload.sh
```

כל המערכות שמחוברות ימשכו את העדכון אוטומטית (ייתכן צורך ברענון cache).

## הכתובת הציבורית של ה-CSS

```
https://bieebmnmkffwbqlsfozh.supabase.co/storage/v1/object/public/design/bkalot-theme.css
```

## איך מחברים מערכת חדשה

הוסף ל-`<head>` של כל דף, **לפני** ה-CSS המקומי:

```html
<link rel="stylesheet"
      href="https://bieebmnmkffwbqlsfozh.supabase.co/storage/v1/object/public/design/bkalot-theme.css">
<link rel="stylesheet" href="style.css">  <!-- ה-CSS המקומי של המערכת (אופציונלי) -->
```

מכאן זמינים כל המשתנים: `var(--teal)`, `var(--gold)`, `var(--radius)`, וכו', וגם רכיבים מוכנים: `.bk-btn`, `.bk-card`, `.bk-badge--must`.

## מבנה הקבצים

| קובץ | תפקיד |
|------|-------|
| `tokens.json` | מקור-אמת יחיד לכל ה-tokens |
| `build.js` | ממיר tokens → CSS |
| `bkalot-theme.css` | הפלט (נטען ע"י כל המערכות) |
| `style-guide.html` | מדריך סגנון חי |
| `upload.sh` | מעלה את הקבצים ל-Supabase Storage |

## פונטים ורקעים

מעבר לזוג ברירת המחדל (`--font-body` / `--font-heading`), יש עוד 5 פונטים
ייעודיים וזמינים כמחלקת CSS (`bk-font-display` / `bk-font-formal` /
`bk-font-modern` / `bk-font-friendly` / `bk-font-alt-body`) — ראו `style-guide.html`
לדוגמה חיה של כל אחד ומתי להשתמש בו. וגם 4 גרדיאנטים + 2 טקסטורות רקע
(`bk-bg-brand` / `bk-bg-hero` / `bk-bg-gold` / `bk-bg-subtle` / `bk-bg-dots` /
`bk-bg-grid`), בנויים ממשתני הצבע הקיימים כך שמתאימים אוטומטית גם למצב כהה.

---
מותג בקלות · Heebo + Frank Ruhl Libre + 5 פונטים נוספים · RTL
