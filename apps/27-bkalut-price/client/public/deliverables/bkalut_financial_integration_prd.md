# PRD — אינטגרציה בין בקלות זכויות לבין הניהול הפיננסי

מסמך זה מגדיר כיצד שתי המערכות נשארות **נפרדות** אך **מסונכרנות**. אין שיתוף בסיס נתונים, אין שכפול מידע אישי, אלא תקשורת מבוקרת ב-API.

---

## 1. עקרונות ארכיטקטוניים

1. **הפרדה מלאה של data ownership**:
   - **בקלות זכויות** = מקור האמת לזכויות, עמותות, פניות (`submissions`), טפסים, n8n, ימות, נציגים.
   - **ניהול פיננסי** = מקור האמת לפרופיל פיננסי, הוצאות, תקציבים, משימות, חשבוניות, מאמנים.
2. **תקשורת דרך REST / Webhook** — לא דרך DB משותף.
3. **טוקני סנכרון ייעודיים** — ראה `docs/EXTERNAL_INTEGRATION.md` שבקוד המקור הפיננסי:
   - `LUX_PREMIUM_STATUS_URL` (בודק האם משתמש פרימיום).
   - `LUX_PREMIUM_SYNC_TOKEN` (חתימה ב-header `x-sync-token`).
4. **הסכמה מפורשת** — כל העברת מידע בין שתי המערכות דורשת אישור משתמש (consent flag), חוץ מבדיקת סטטוס מנוי שאינה כוללת PII מעבר למייל.

---

## 2. נקודות אינטגרציה

### 2.1 בדיקת סטטוס פרימיום (כיוון: בקלות → פיננסי)

- **שימוש**: בקלות זכויות צריך לדעת אם משתמש שלוח טופס הוא מנוי פרימיום במוצר הפיננסי (לקבלת ליווי VIP).
- **שיטה**:
  ```
  POST {LUX_PREMIUM_STATUS_URL}
  Headers: x-sync-token: {LUX_PREMIUM_SYNC_TOKEN}
  Body: { "email": "client@example.com" }
  Response: { "exists": true, "premium": true, "plan": "premium" }
  ```
- **לא מועברים**: שם, סיסמה, פרטים פיננסיים.

### 2.2 פתיחת פנייה לבקלות (כיוון: פיננסי → בקלות)

- **שימוש**: משתמש בפיננסי לחץ על "בדוק זכאות" (`RightsInquiryForm`) או על "המלצת זכויות" שזוהתה אוטומטית.
- **שיטה**:
  ```
  POST {BKALUT_INTAKE_URL}
  Headers: x-bkalut-token: {BKALUT_INTAKE_TOKEN}
  Body: {
    "channel": "financial_app",
    "source_user_id_hash": "sha256(uid)",
    "right_hint": "medical_tax_refund",
    "client_name": "...",
    "client_phone": "...",
    "client_email": "...",
    "free_text_he": "...",
    "consent": {
      "terms": true,
      "data_transfer": true,
      "version": "2026-01"
    }
  }
  Response: { "submission_id": "12345", "status": "received" }
  ```
- **רישום**: ב-`submissions` של בקלות עם `channel=financial_app`.

### 2.3 קטלוג זכויות (Rights API; כיוון: בקלות → פיננסי, קריאה בלבד)

- **שימוש**: הפיננסי רוצה להראות באנר "המלצת זכויות" מבוסס פרופיל.
- **שיטה**:
  ```
  GET {BKALUT_RIGHTS_URL}/api/rights/match?categories=health,housing&age=35
  Headers: x-bkalut-token: ...
  Response: [{ id, title_he, category, eligibility_he, benefit_amount, form_url }, ...]
  ```
- **אין** העברת פרופיל מלא בקריאה זו — רק categories/age/family_status מעובדים כפרמטרים.

### 2.4 רענון סטטוס פנייה (כיוון: בקלות → פיננסי)

- כאשר ב-bkalut סוגרים פנייה (`status=closed_success`), שולחים webhook אופציונלי לפיננסי כדי שיראה למשתמש: "הפנייה שלך טופלה — חיסכון משוער X ש"ח".
- שיטה: `POST {FINANCIAL_WEBHOOK_URL}/api/bkalut/callback`.

### 2.5 פודקאסט/IVR משותף

- מערכת קולית שלוחה 7 = שער ראשי. שלוחות משנה:
  - 7/1 — פודקאסט זכויות (בקלות).
  - 7/2 — תזכורות פיננסיות חודשיות (אופציה עתידית, מבוסס פרופיל פיננסי).
- מס׳ ימות: **02-3131500**.

---

## 3. מודל סנכרון נתונים

```
┌─────────────────────────┐                ┌──────────────────────────────┐
│  בקלות זכויות           │                │  ניהול פיננסי                │
│  bklot-app              │                │  (Supabase + Lovable code)   │
│  Express + SQLite       │                │  React + Supabase            │
│                         │                │                              │
│  rights                 │◀── GET /rights─│  RightsBanner (קריאה)        │
│  organizations          │                │                              │
│  submissions            │◀── POST intake─│  RightsInquiryForm            │
│                         │                │                              │
│  (no financial data)    │── premium? ───▶│  premium-status edge fn      │
│                         │                │                              │
│  audit_log              │                │  audit_log                   │
└─────────────────────────┘                └──────────────────────────────┘
            ▲                                          ▲
            │                                          │
            └────────────── n8n hub ───────────────────┘
                  WhatsApp / Email / Yemot / Cron
```

---

## 4. אבטחה והסכמות

- **טוקנים**: שונים לכל כיוון. נשמרים ב-secrets ולא בקוד.
- **TLS חובה**.
- **לוג**: כל קריאה בין-מערכתית מתועדת ב-`audit_log` של שתי המערכות עם hash של ה-payload.
- **PII minimization**: לא שולחים פרטים מעבר לחיוני.
- **טוקן הלקוח**: יוצרים hash חד-כיווני של user_id כדי שלא לחשוף את המזהה הפנימי.

---

## 5. אדמין/דמו

לצורך פיתוח ובדיקות פנימיות (לא לייצור):

- מייל אדמין: `l023131500@gmail.com`
- מספר טלפון (דמו): `023131500`
- קוד דמו: `123456`

**אזהרה**: זה אינו פתרון אבטחה אמיתי. בייצור חובה:

1. אימות דו-שלבי (MFA).
2. ניהול סיסמאות מאובטח (hash + salt, bcrypt/argon2).
3. ניהול session עם cookie מאובטח (`HttpOnly`, `Secure`, `SameSite`).
4. הגבלת קצב (rate limiting) על endpoint התחברות.
5. תיעוד כניסות לאדמין ב-`audit_log` עם IP ו-User-Agent.

---

## 6. קריטריונים לקבלה

### 6.1 משתמש שולח בקשת זכויות מתוך הפיננסי

- **Given** משתמש מחובר בפיננסי, מאשר תנאים, ולוחץ על "בדוק זכאות".
- **When** הטופס נשלח.
- **Then** נוצר POST ל-`BKALUT_INTAKE_URL` עם payload תקין; בבקלות מופיע submission חדש; המשתמש רואה הודעת אישור עם מספר פנייה.

### 6.2 בנר זכויות מבוסס פרופיל

- **Given** משתמש שמילא פרופיל עם 3 ילדים ושכר דירה.
- **When** נכנס לדשבורד.
- **Then** מופיע בנר עם לפחות 2 זכויות רלוונטיות שהגיעו מ-GET של בקלות.

### 6.3 סטטוס פרימיום

- **Given** משתמש פרימיום במוצר הפיננסי שולח טופס בבקלות עם מייל מזהה.
- **When** Backend של בקלות בודק סטטוס.
- **Then** המערכת מסמנת את הפנייה כ"VIP" ומקצה אותה לרכז בכיר.

---

## 7. סיכונים ומגבלות

1. **חוסר זמינות של אחד המוצרים** — נדרש fallback. אם API של בקלות נופל, הפיננסי שומר את הבקשה ב-queue ושולח מאוחר יותר.
2. **שינויי סכמה ללא תיאום** — דורש versioning של API (`/api/v1/rights/...`) ופרוטוקול שינוי.
3. **חוקי פרטיות** — העברת מידע אישי בין שתי ישויות משפטיות נפרדות מחייבת הסכמה מפורשת ורישום במאגר נתונים אצל רשם מאגרי המידע.
4. **קוד Lovable קנייני** — חלק מהקוד שמולבן ב-`uploaded_financial_source_code` משתמש ב-`@lovable.dev/cloud-auth-js` שדורש Lovable account חי. בהעברה למפתחים פנימיים — להחליף ב-Supabase Auth טהור.

---

## 8. תוכנית הטמעה

1. **שלב 1 — תיעוד וגישות**: מסמכי PRD (קיים) + הוספת ספריית `integrations/bkalut/` בכל מערכת.
2. **שלב 2 — Endpoint למיצוי זכויות**: ב-bklot-app, יצירת `POST /api/v1/intake` שמקבל מהפיננסי. בקוד הפיננסי, הוספת service ב-`src/integrations/bkalut/`.
3. **שלב 3 — Rights API**: `GET /api/v1/rights` עם cache.
4. **שלב 4 — Premium check** (כבר קיים, ראה `EXTERNAL_INTEGRATION.md`).
5. **שלב 5 — Callback סגירת פנייה**.
6. **שלב 6 — אינטגרציית IVR משותפת**.

---

## 9. הערות העברה למפתחים

- שתי המערכות **לא צריכות לרוץ באותו שרת**.
- בפיתוח: שתי תיקיות נפרדות, כל אחת `npm install && npm run dev`.
- בייצור: שני subdomains (`app.bkalut.co.il`, `pini.bkalut.co.il` לדוגמה), עם CORS מותאם.
- ייצוא נתונים: כל מערכת מייצאת בנפרד. אין לאחד.
- בקלות זכויות = source of truth ל-rights schema. כל שינוי בסכמה (הוספת שדה) — אחראי על תאימות לאחור.
