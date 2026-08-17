# POLISH_BACKLOG.md — ליטוש נדחה (לא פונקציונלי, לא שובר)

> נוצר 17/08/2026. מקום ריכוז לניסוח/קופי/נגישות/ניגודיות/מצב-כהה/מיקרו-UX
> שנדחו מ"פונקציה עכשיו" (`more30-priority.md`, כלל-העל א). אחרי סבב מלא על כל
> המערכות — עברו על הרשימה הזאת והשלימו.

## מצב כהה — פקד ידני חסר (5 מערכות, 1 הושלמה 17/08)

**מה חסר.** ל-02 (תמלול), 03 (מודעות), 06 (בריאות), ~~10 (בקלות-תצוגה)~~,
35 (קיוסק) אין פקד גלוי בעמוד שמאפשר למי שה-OS שלו **בהיר** לבחור כהה בכל
זאת (ל-smel, chatzor, galil יש כזה פקד). **זו לא הייתה פונקציונליות חסרה** —
כל חמש עוקבות אחרי `prefers-color-scheme: dark` בפועל, כלומר מי שה-OS שלו
כהה מקבל עמוד כהה בלי שום פעולה. נמדד ונאושר מחדש 17/08:

✅ **10 בקלות-תצוגה — הושלם 17/08.** נוסף כפתור `#themeToggle` (🌙/☀️) בניווט,
עם שמירה ל-`localStorage`. זו הייתה היחידה מבין החמש שהיא אתר סטטי (בלי
build), ולכן הראשונה שנסגרה. נפרס ואומת בייצור. ראה
`QA/platform/theme-toggle-bkalot-0817/`. 02/03/06 (Next.js) ו-35 (Vite,
kioskfleet) דורשים build ונשארים ברשימה.

```
/tamlul      os-dark:follows  toggle:none    => reachable
/modaot      os-dark:follows  toggle:none    => reachable
/briut       os-dark:follows  toggle:none    => reachable
/bkalot      os-dark:follows  toggle:none    => reachable
/kiosk       os-dark:follows  toggle:none    => reachable
```

ראיות: `QA/platform/dark-toggle-recheck-0817/`, סקריפט חוזר-הרצה:
`scripts/qa/dark-toggle-probe.mjs`.

**מה נדרש כשמגיעים לזה:** פקד toggle (button/switch) שכותב `data-theme`/מחלקת
`dark` על ה-root ושומר העדפה (localStorage), בכל אחת מהחמש. לכל מערכת ×1 שינוי
קטן. עדיפות נמוכה — המצב הכהה כן מגיע לגולש שמבקש אותו דרך ה-OS.
