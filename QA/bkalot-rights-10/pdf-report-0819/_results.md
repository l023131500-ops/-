# 10 bkalot-rights — verify "no personal PDF report" audit_gap (19/08/2026)

## מה נבדק
`core.projects.audit_gaps` (מ-2026-07-29) לגבי מערכת 10 (בקלות — מימוש זכויות)
טען: "2) אין דו"ח PDF אישי (המוצר הטבעי בתשלום)". נבדק אם זה עדיין נכון.

## מה נמצא (קוד + חי)
- `apps/10-bkalot-rights/app.js:215,222` — כפתור `<button id="printRes">הדפסה / שמירה
  כ-PDF</button>` בתוך `renderResults()`, מחובר ל-`window.print()`.
- `apps/10-bkalot-rights/style.css:223-226` — כלל `@media print` ייעודי שמסתיר
  `.site-header,.hero,.how,#check,.catalog,.funds,.site-footer,.res-actions,.json-out`
  ומשאיר רק את בלוק התוצאות האישי — אותה שיטה בדיוק כמו 27/28
  (`window.print()` + CSS print-only).

## אימות חי (Playwright, `more30.com/bkalot`)
1. נטען העמוד, נלחץ "בנו לי את רשימת הזכויות" (שאלון ריק — מותר, "שדות ריקים
   פשוט יידלגו").
2. תוצאה: `#results` גלוי, **7 כרטיסי המלצה אמיתיים** מתוך המאגר המרכזי
   (`RightsRepo`, 888 נושאים), לא נתון מזויף.
3. כפתור `#printRes` קיים ולחיץ; נבדק ש-`onclick` שלו קורא בפועל ל-
   `window.print()` (הוחלף זמנית ל-mock, אושר `printCalled:true`).
4. צילום מסך: `bkalot-rights-results-0819.png` — תוצאות אישיות מלאות, כפתור
   ההדפסה מוצג ליד "הצג JSON".

## מסקנה
**הפער "אין דו"ח PDF אישי" אינו נכון יותר (וייתכן שלא היה נכון גם ב-07/29) —
יש דו"ח PDF אישי עובד, בדיוק לפי הדפוס שכבר אושר במחירון/קופות.** אין שינוי
קוד — תיקון תיעוד בלבד. `core.projects.audit_gaps` (10) עודכן להסיר את סעיף 2
ולהשאיר את שאר הפערים האמיתיים (חשבון משתמש, חיבור ל-CRM 30, סליקה, מעקב
מימוש). לא דורש את המשתמש.
