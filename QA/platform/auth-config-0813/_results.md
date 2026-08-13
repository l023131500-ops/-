# §1א — אישור המייל, נמדד הפעם מצד ההגדרה ולא מצד האתר · 13/08/2026

`SUPABASE_ACCESS_TOKEN=… node scripts/qa/auth-config-sweep.mjs` → `_results.json`

## למה עוד סריקה

הסריקה של 12/08 (`QA/platform/autoconfirm-0812`) שאלה את השאלה דרך **האתרים
החיים**: כל חבילת ייצור → הזוג `SUPABASE_URL` + מפתח שבתוכה → `GET
/auth/v1/settings`. זה היה הכלי הנכון אז, כי הוא לא דורש שום הרשאה. היא נסגרה
במשפט הזה:

> "מתוך שמונת הפרויקטים שאינם `uhnrgujbdxhhmoxcjria`, **אף אחד** אינו נראה
> מהסביבה הזו (`list_projects` מחזיר פרויקט אחד). לכן זה של המשתמש."

`list_projects` אכן מחזיר פרויקט אחד. **`SUPABASE_ACCESS_TOKEN` מחזיר עשרה**,
ועבורם ה-Management API מחזיר את כל קונפיגורציית ה-auth — כולל `site_url`
ו-`smtp_host`, ששני אלה אינם מופיעים ב-`/auth/v1/settings` לעולם. אותו טוקן הוא
שסגר את #198 בפועל, כלומר המסלול היה קיים גם באותו יום.

## מה נמדד

עשרת הפרויקטים שהטוקן מגיע אליהם. קריאה בלבד — לא נוצר משתמש, לא נשלח מייל,
ולא נכתבה שום הגדרה.

| ref | autoconfirm | הרשמה | site_url |
| --- | --- | --- | --- |
| `rpamomtvqweqqiotgtta` (ניהול תקציב חכם) | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `eygjmfftosigbmzpndib` (מחוברים) | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `zxckwefnuectxqhtpfib` (חיבור לשיעורים) | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `tltfpznyqxpuydgefmnp` (chatzor-connect) | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `bieebmnmkffwbqlsfozh` (bkalut-production) | ❌ **כבוי** | פתוחה | `https://more30.com` |
| `csjekrvukbdznetsrodj` (bkalut-production-user-owned) | ✅ **דלוק** | פתוחה | `https://more30.com` |
| `tsnmjjnollodauelnvsz` | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `svvpuypogqnkgcmtqlgu` (זכויות פרו) | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `qkszcdkzgfcpfwvskdna` | ❌ כבוי | פתוחה | `http://localhost:3000` |
| `uhnrgujbdxhhmoxcjria` (הפורטל) | ✅ דלוק | פתוחה | `https://more30.com` |

## שלוש מערכות חיות היו רשומות שבורות תחת קריאה בת יום

`csjekrvukbdznetsrodj` — הפרויקט של **06 בריאות, 12 סמל ו-17 חיזוקים** — נמדד
ב-12/08 כ-`mailer_autoconfirm=false` ונרשם כך בטבלה של אותו יום. היום הוא
**דלוק**. השינוי לא נעשה כאן ולא תועד; מה שכן — הוא נכון עכשיו, ולכן שלוש
המערכות האלה אינן חלק מ-§1א יותר.

**נמדד בשני מכשירים בלתי-תלויים, ולא באחד:** ה-Management API
(`GET /v1/projects/{ref}/config/auth`) ונקודת הקצה הציבורית שכל דפדפן קורא
(`GET /auth/v1/settings` עם מפתח ה-anon). שניהם מחזירים `true` עבור
`csjekrvukbdznetsrodj` ו-`false` עבור `bieebmnmkffwbqlsfozh`. הסכמה בין השניים
היא מה שהופך את זה למדידה ולא לקריאה בודדת שאפשר לטעות בה.

**המניין ב-§1א יורד מתשע מערכות לשש:** 01 torah, 15 egod, 21 mthbram,
24 galil, 30 crm, 31 gesher.

## הפרויקט האחד שנגיש מכאן — ואסור לגעת בו

`bieebmnmkffwbqlsfozh` הוא היחיד מבין שבעת ה"כבויים" של 12/08 ש-`SUPABASE_ACCESS_TOKEN`
כן מגיע אליו. כלומר `PATCH /v1/projects/bieebmnmkffwbqlsfozh/config/auth` עם
`{"mailer_autoconfirm": true}` היה פותח כאן את הסבב הרשמה→התחברות עבור 01 torah,
בלי דשבורד ובלי המשתמש.

**לא בוצע, במכוון.** שמו של הפרויקט הוא `bkalut-production`, והוא נושא את
**08 "בקלות זכאות" ו-09 "בקלות ניהול"** — מוגנות מפורשות ב-RUN_INSTRUCTIONS
("אסור לשנות/למחוק/לפרוס/לשבור"). שינוי `mailer_autoconfirm` בפרויקט הוא שינוי
בהתנהגות ההרשמה של **כל** מי שיושב עליו, כלומר שינוי ב-08/09. זו הכרעה של
המשתמש ולא שלי, וזו הכרעה בת שורה אחת — לא טיול לדשבורד. רשום ב-`NEEDS_USER.md`.

חמשת הנותרים (`hkkkynyoigzlttpynoeo` 15, `aypsqqvfohekxxuqsmrw` 21,
`mwljkonwdeuaahsigjdp` 24, `jhbeelzvjvhnkxldqvxx` 30, `ygaqqnuyfnumezxxmtbh` 31)
אינם בעשרה — עבורם החסם של 12/08 עומד כלשונו.

## שבעה פרויקטים שולחים מייל אל המחשב של הנמען — ואף אחד מהם אינו בייצור

שבעה מהעשרה עדיין עם `site_url=http://localhost:3000`. זו בדיוק התקלה של #198
(high): קישור איפוס נשלח, נראה תקין, ומצביע על `localhost` של מי שקיבל אותו.

**אף אחד מהשבעה אינו מוגש בייצור.** הסריקה של 12/08 מדדה אילו refs נושאים
26 האתרים החיים בפועל, והם תשעה: `uhnrgujbdxhhmoxcjria`, `bieebmnmkffwbqlsfozh`,
`csjekrvukbdznetsrodj`, `hkkkynyoigzlttpynoeo`, `aypsqqvfohekxxuqsmrw`,
`trerolyveytzgksawrme`, `mwljkonwdeuaahsigjdp`, `jhbeelzvjvhnkxldqvxx`,
`ygaqqnuyfnumezxxmtbh`. אף אחד משבעת ה-`localhost` אינו ברשימה. נבדק גם מהכיוון
ההפוך על השם המטעה ביותר שבהם: `tltfpznyqxpuydgefmnp` נקרא `chatzor-connect`,
ואילו `apps/16-chatzor-connect` נושא בקוד את `uhnrgujbdxhhmoxcjria` בלבד.

כלומר אלה כפילויות/נטושים, ולא תקלה חיה. **לא תוקנו** — תיקון `site_url` של
פרויקט שאיש אינו מוגש ממנו הוא בדיוק "משימת מילוי" שכלל אנטי-דריפט אוסר. נרשם
כדי שריצה עתידית לא תגלה אותם מחדש ותקרא להם תקלה, וכדי שהמשתמש יוכל למחוק אותם.

## מה זה לא אומר

- **לא נבדק שהרשמה בפועל מצליחה** באף מערכת. נמדדה הצהרת השרת, לא סבב חי.
  הסבב עצמו רץ ב-`QA/platform/own-form-login-0812` על שלוש מערכות בלבד.
- **מי הפך את `csjekrvukbdznetsrodj` לא ידוע.** ה-Management API אינו מחזיק
  היסטוריית שינויים, ואין רישום שלנו. ייתכן שהמשתמש עשה זאת בעקבות
  `NEEDS_USER §0א״`. מה שנמדד הוא המצב, לא הסיבה.
- **השורה השנייה של §1א — "המסך אומר את האמת" — כבר סגורה בכל המערכות שיש להן
  טופס כניסה משלהן.** שבע מהן נושאות `src/lib/authErrors.ts` שממפה
  `email_not_confirmed` להודעה עברית נפרדת מ-"סיסמה שגויה" (01, 15, 16, 21, 22,
  30, 31), ולחמש מהן גם בדיקת יחידה. 06, 12, 17 ו-24 אינן קוראות
  `signInWithPassword` בקוד שלהן כלל.
