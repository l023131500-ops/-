# 0074 — שורת המסמך אינה אומרת איזה מכתב יושב בתוכה

14/08/2026 · §5ב · שכפול בקלות שכבה 3 · מיגרציה בלבד

## הקו שנלקח

הקו הפתוח שנוסח בשלוש הפעימות האחרונות (3fd1524, 978ab68, fb607a0), מילה במילה
מהאחרונה: «documents אינה שומרת מאיזו תבנית הופק המסמך, ומסמך #70 החזיק כאן את
שני הנוסחים בזה אחר זה ו-upsert על (case_id,kind) דרס». נלקח כפי שנוסח ולא הורחב.

## הבסיס לפני (נמדד)

```
cases=0  case_rights=0  documents=0  templates=2 (שתיהן enabled)  catalog=888
contacts=4  admin_users=1  admin_sessions=5
outbound_queue(app_key=bkalot)=8  fp=da28ec6315535ec0bfbebad4d57752a7  delivery_log=3
```

## מה נמדד

הפניות נוצרו דרך `bkalot_clone_intake` — נתיב הקליטה עצמו ולא הזרקה ל-`cases`.
שתי פניות, שני טלפונים שונים בכוונה: **#82** נבדקה, **#83** היא הבקרה שלא
נגעו בה כלל.

### הרשאות — נמדדו ולא הונחו

`create or replace` שומר ACL ולכן קל להניח. `bkalot_clone_render`:
anon=false, authenticated=false, service_role=true — זהה לפני ואחרי. בלי זה
`SECURITY DEFINER` כאן היה נותן לכל מחזיק מפתח anon להפיק מסמך על כל פנייה.

### 1 — הפקה ראשונה, בלי מפתח (ברירת מחדל)

`render(case_id=82)` → `template_key=rights_treatment_reply`, `fallback=false`,
2,483 תווי טקסט, מסמך **#72**.

בשורה: `template_key=rights_treatment_reply`, `template_fallback=false`,
`created_at = updated_at = 03:28:23.996668`.

### 2 — ההפקה שדורסת. זו המדידה שקונה את הפעימה

`render(case_id=82, template_key=general_inquiry_reply)` → אותו מסמך **#72**,
2,483 → **215** תווי טקסט.

| | לפני | אחרי |
|---|---|---|
| `template_key` | `rights_treatment_reply` | `general_inquiry_reply` |
| `created_at` | 03:28:23.996668 | 03:28:23.996668 — **קפוא** |
| `updated_at` | 03:28:23.996668 | 03:28:35.435237 — **זז 11.439 שניות** |

השדה עוקב אחרי הגוף ולא אחרי הפנייה: `#82` היא `treatment`, כלומר ברירת המחדל
שלה היא `rights_treatment_reply`, והשורה אומרת `general_inquiry_reply` — כלומר
היא מדווחת מה יושב בה ולא מה היה אמור לשבת. עד המיגרציה הזאת אותה שורה בדיוק
הייתה נראית זהה בשני המצבים.

שלוש קריאות ה-render רצו בשלוש טרנזקציות נפרדות. שאילתה אחת עם CTE-ים הייתה
מודדת אפס — כל ה-CTE-ים רואים אותו snapshot ו-`now()` קפוא בתוכם, וזו בדיוק
הטעות שנרשמה ונפסלה ב-0072.

### 3 — הבקרה שקונה את הכרעה (2): נפילה

`rights_treatment_reply` נוטרלה במסד, ואז `render(case_id=82)` בלי מפתח:

```
fallback=true   template_key=rights_treatment_reply   template_fallback=true
96 תווי טקסט (ולא 2,483)   הגוף: «שלום בדיקת 0074 א, קיבלנו את פנייתך…»
```

זהו הרגע שבו המפתח לבדו היה משקר: השורה נושאת `rights_treatment_reply`, והגוף
הוא נוסח הנפילה שבתוך `render` ולא התבנית הזאת. הדגל אומר את ההבדל, ובלעדיו זה
היה שקר שצורתו בדיוק כצורת האמת — 96 תווים שנרשמים כתוצר של מכתב הזכויות.

התבנית הוחזרה ל-`enabled=true` עם `updated_at = updated_at` בשני הכיוונים, כדי
לא לזייף חותמת עדכון על שורה שלא באמת נערכה.

### 4 — הבקרה שלא נגעו בה

`#83` נוצרה באותה ריצה, `treatment`, 42 זכויות, ולא הופקה: אפס שורות ב-
`documents`. בלעדיה כל המדידה הייתה יכולה להיות תוצר של משהו שרץ על כל פנייה.

## מצב טסט — נמדד ולא הוצהר

```
outbound_queue(bkalot)=8  fp=da28ec63… (זהה)   delivery_log=3
documents עם queue_id ≠ null = 0    cases ב-status=sent = 0
שורות עם sent_at = 0                שורות mode=live = 0
```

`render` מפיק לתוך `documents` ותו לא — אין בו `net.http`, אין `pg_net` ואין ולו
קריאה יוצאת אחת. אין מייל, אין הודעה ואין מסמך שיצא החוצה.

## המקור לא נגע

8 שורות `app_key=bkalot` נשארו 8, טביעת אצבע `da28ec6315535ec0bfbebad4d57752a7`
(id:status:attempts) זהה לפני ואחרי. אין נגיעה ב-08/09/`bkalut-app`/
`bkalot-admin`/`zr_*`/`NEDARIM3873` ולא בסכמות `csj`/`csj_src`/`igud`.

## גלגול לאחור

מסמך אחד, 84 `case_rights`, 2 פניות, 2 אנשי קשר — בסדר הזה (`cases_contact_id_fkey`
הוא `ON DELETE SET NULL`). אחרי:

```
cases=0  case_rights=0  documents=0  templates=2 (שתיהן enabled)  catalog=888
contacts=4  admin_users=1  admin_sessions=5  q_bkalot=8  fp=da28ec63…  delivery_log=3
```

זהה בדיוק לבסיס. שלוש העמודות נשארו.

## מה שנשאר פתוח ולא נבלע

- **השדות אינם מגיעים למסך.** `bkalot_clone_admin_case` מונה את עמודות המסמך
  אחת-אחת ולכן עמודה חדשה אינה מופיעה בתשובה מאליה; המנהל עדיין רואה «מסמך #72»
  בלי לדעת איזה מכתב יושב בו. זו הלבנה הבאה (RPC ואז UI ואז פריסה), אותו פיצול
  כמו 0073 → 978ab68 → fb607a0.
- **`template_key is null` לא נמדד בפועל.** `documents` הייתה ריקה, ולכן אין ולו
  שורה אחת מלפני 0074 שתדגים את «הופק לפני 0074, לא ידוע». זו הבטחה על הצורה
  שהמיגרציה מבטיחה, ולא התנהגות שנצפתה. גם המילוי לאחור של `updated_at` נגע
  באפס שורות.
- **הכתיבה היא בכל הפקה** ולא רק כשהגוף השתנה: הפקה חוזרת מאותה תבנית מזיזה את
  `updated_at` בלי שהגוף זז. זו הכרעה (3) ולא תופעת לוואי.
- «מי הפיק» אינו נכתב לשום מקום — אין בסכמה טבלת יומן, ולא הומצאה עמודה
  `admin_id` שאין לה לאן ללכת.
- `template_disabled` נשאר בלתי-נגיש מהמסך לפי הכרעה (2) של 978ab68;
  `template_unknown` אינו נגיש כי הבורר בונה את הערכים מהרשימה שהשרת החזיר.
- `sent` בלתי-ניתן-להשגה בכוונה; `bkalot_clone_admin_create` אינה חשופה ב-HTTP;
  `pdf`/`audio` → `channel_unsupported`.
- `public_visible` ו-`show_in_showcase` של #37 נשארים false.
