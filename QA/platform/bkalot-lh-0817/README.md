# bkalot-lh-0817 — 10 בקלות: Lighthouse ראשון + תוקן meta description חסר

המשך ישיר לסבב סריקת הלילה 17/08 (`fix/nadlan-a11y`, אחרי 02/04/06):
`bkalot`(10) עוד לא נמדד ב-Lighthouse אף פעם. הרצתי
`node scripts/qa/lighthouse-run.mjs QA/platform/bkalot-lh-0817 bkalot` מול
`https://more30.com/bkalot` החי.

## תוצאה
פרפורמנס **82** · נגישות **100** · Best Practices **77** · SEO **91**.

בשונה מ-02/04/06 — הנגישות כבר מלאה (100), אין ליקוי אמיתי לתקן שם.
`failedAudits` חשף פער אמיתי אחד: `meta-description` (score 0, "Document
does not have a meta description").

## מה תוקן
`apps/10-bkalot-rights/index.html` — נוסף
`<meta name="description" content="בקלות — בדיקה מקיפה וחינמית של כל
הזכויות וההטבות שמגיעות לך, כולל השוואת קופות חולים והורדת המסמכים
הדרושים למימוש.">` אחרי ה-`<title>`.

## פריסה ואימות
`_deploy/bkalot-more30/bkalot/index.html` עודכן מהמקור, אומת זהה
byte-for-byte לפני הפריסה (`Compare-Object` עם `-Encoding UTF8` — ברירת
המחדל של Get-Content נתנה false positive על שוויון בגלל עברית, ראה
`ps1-without-bom-parsed-as-cp1255` בזיכרון לתקלה דומה). `vercel deploy
--prod --scope l023131500-ops-projects` מ-`_deploy/bkalot-more30` —
`dpl_FtnA4fmg9yFn76Mc1frPd5aopoSt`, READY, alias
`bkalot-more30.vercel.app`. אומת חי: `Invoke-WebRequest
https://more30.com/bkalot?cachebust=0817c` — התג מופיע ב-HTML המוגש.

## נשאר פתוח (לא נחקר בסבב הזה)
פרפורמנס 82 (מתחת לסף 90) ו-Best Practices 77 — תואם דפוס NetFree/
`third-party-cookies` שכבר מתועד ב-32 נדל"ן, 02 תמלול, 04 עימוד, 06
בריאות. לא עבודה חדשה כאן.

## מצב טסט / מוגן
שינוי תצוגה בלבד ב-`apps/10-bkalot-rights` (מערכת 10, לא מוגנת — נבדל
מ-08/09). אין נגיעה במסד/לידים/שליחה. Supabase MCP אינו מחובר לסשן הזה —
heartbeat נכתב כקובץ `_heartbeat-pending.sql`.
