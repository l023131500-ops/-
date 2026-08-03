# ניהול פיננסי מבית בקלות — אתר שיווקי

אתר ציבורי לשירות **ניהול פיננסי מבית בקלות**. עברית, RTL, סטטי לחלוטין (HTML/CSS/JS).

## הפעלה מקומית

```bash
python -m http.server 8081
# או
npx serve .
```

ואז פתחו `http://localhost:8081`.

## פריסה

כל אחסון סטטי מתאים: GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3+CloudFront.

## קישורים פעילים

האתר כולל שני CTA פעילים:

1. **"כניסה למערכת"** — מוביל לדף ההתחברות של המערכת הראשית (`/#/user-login`).
2. **"עדיין לא רשומים?"** / טופס יצירת קשר — שולח שם, טלפון, דוא"ל והערות לנקודת קצה
   של ליבת המערכת.

## הגדרה (Configuration)

ניתן להגדיר את כתובת המערכת ואת נקודות הקצה בשלוש דרכים:

### 1. Query string (לבדיקה מהירה)

```
https://marketing.example.com/?app=https://app.example.com
```

### 2. משתני חלון (Window globals) — לפני טעינת `script.js`

```html
<script>
  // בסיס המערכת (קישור "כניסה למערכת" יבנה מעליו)
  window.BKALUT_APP_BASE = "https://app.example.com";

  // בסיס ה-API לקליטת לידים (אם שונה מהאפליקציה)
  window.BKALUT_BACKEND_BASE = "https://api.example.com";

  // לחלופין — רשימת endpoints מפורשת (תינסה לפי הסדר)
  window.BKALUT_LEAD_ENDPOINTS = [
    "https://api.example.com/api/inbound/leads",
    "https://app.example.com/api/financial/leads",
    "https://n8n.example.com/webhook/NEDARIM3873"
  ];
</script>
<script src="script.js" defer></script>
```

### 3. ברירת מחדל (ללא הגדרה)

אם לא הוגדר דבר, האתר ינסה את הסדר הבא:

1. `/api/inbound/leads` (אותו origin)
2. `/api/financial/leads` (אותו origin)
3. Fallback חיצוני: `https://n8n.l023131500.work/webhook/NEDARIM3873`

ועבור קישור "כניסה למערכת" — `/app/#/user-login`.

## מבנה הקבצים

```
.
├─ index.html       # תוכן ושיווק (RTL, עברית)
├─ styles.css       # עיצוב — נייבי + ענבר + שנהב
├─ script.js        # אינטראקציות + שליחת ליד
├─ favicon.svg
└─ README.md
```

## נגישות

- RTL מלא, `lang="he"`, סקיפ-לינק.
- `prefers-reduced-motion`.
- ניגודיות AA, focus-visible מובלט.
- שדות עם labels, aria-live על סטטוס הטופס.
