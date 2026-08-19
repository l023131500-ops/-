# מפרט בנייה — פלטפורמת מודעות חרדית (מנוע עריכה שכבתי חי)

## מטרת-על
מתחרה איכותי ל-GraphoLike ליצירת מודעות חרדיות מקצועיות. הלקוח:
**בוחר עיצוב → כותב טקסט → רואה חי איך זה נראה על העיצוב → מוריד PDF ערוך ומוכן.**
כל השלבים גמישים — לא חייבים הכל בכל פעם.

## שינוי ארכיטקטוני קריטי מול ה-POC הישן
ה-POC הישן: רקע AI + Puppeteer overlay בשרת. **זה לא הגישה החדשה.**
הגישה החדשה: **מנוע canvas שכבתי חי בצד הלקוח** (React-Konva). הטקסט הוא שכבה נפרדת עם פונט אמיתי — תמיד חד ומושלם, ניתן לעריכה חיה. ה-AI מייצר רק רקעים/אלמנטים דקורטיביים.

## סטאק
- Frontend: React + **react-konva + konva** (מנוע השכבות), Tailwind + shadcn, wouter (hash routing)
- ייצוא: **jspdf** (PDF בצד לקוח מ-canvas), הורדת PNG ישירה מ-Konva stage
- Backend: Express + SQLite (Drizzle) — שמירת פרויקטים, תבניות, בסיס-ידע
- פונטים: קיימים ב-server/fonts/ (FrankRuhlLibre, DavidLibre, Heebo, Rubik, Assistant, Amatic). לטעון בפרונט דרך @font-face מ-CSS (להעתיק ל-client/public/fonts או להגיש מהשרת).
- AI: Gemini (custom-cred:generativelanguage.googleapis.com) — כרגע חסום בחיוב (429). לבנות עם fallback: כפתור "צור רקע AI" שאם נכשל מציג הודעה ידידותית ומשתמש ברקעים מובנים (גרדיאנטים/דוגמאות/טקסטורות).

## מודל הנתונים (shared/schema.ts)
- `templates`: id, category (מפתח קטגוריה), style (malchut/chasidic_royal/modern_torani/classic), format (ig_feed_45/ig_square/story/a4_print/newspaper), name, thumbnail, layersJson (TEXT — מערך שכבות), width, height
- `projects`: id, templateId, name, layersJson (מצב ערוך), createdAt

## סכמת שכבה (Layer) — לב המערכת
כל תבנית = `{ width, height, background, layers[] }`.
סוגי שכבות:
- `text`: { id, type:'text', text, x, y, width, fontFamily, fontSize, fontWeight, fill, align, lineHeight, letterSpacing, editable:true, locked, autoFit:true (shrink-to-fit), maxFontSize, minFontSize, role: 'title'|'subtitle'|'body'|'field:<name>' }
- `image`: { id, type:'image', x, y, width, height, src, placeholder:true|false, fit:'cover'|'contain', label (למשל "תמונת הרב") }
- `shape`: { id, type:'rect'|'circle'|'line', x,y,width,height, fill, stroke, strokeWidth, cornerRadius }
- `decoration`: { id, type:'decoration', kind:'frame'|'corner_ornament'|'divider'|'star_of_david'|'crown', x,y,width,height, fill } — SVG-based ornaments rendered as Konva paths/images
- `background`: { type:'solid'|'gradient'|'pattern'|'image', value }

## מנוע האוטו-פיט (shrink-to-fit) — חובה
לכל שכבת טקסט עם autoFit: לולאה שמקטינה fontSize עד שהטקסט נכנס לרוחב/גובה המוקצה (עד minFontSize). מונע חריגה. חובה לעברית RTL.

## בסיס-ידע מובנה (shared/knowledge.ts)
לבנות אובייקט KNOWLEDGE_BASE עם הקטגוריות הבאות (מבוסס על קבצי research/kb_*.md). לכל קטגוריה: { key, label, group ('lifecycle'|'yearcycle'|'shiurim'|'events'), fields[] (שדות המבנה עם label+placeholder+role), copyExamples[] (2-3 ניסוחים אותנטיים מהמחקר), honorifics[], defaultStyle, palette, symbols[], sensitivity[] }.

קטגוריות מינימום ל-POC (הרחב בהמשך לכולן):
### קבוצת שיעורים (המיקוד ל-POC — לבנות הכי מלא):
- shiur_daf_yomi, shiur_gemara, shiur_halacha, shiur_mussar, shiur_chasidut, shiur_parsha, shiur_women, shiur_youth, shiur_series, siyum_masechet
### מעגל החיים:
- birth, brit, zeved_habat, pidyon_haben, aliyah_torah, upsherin, bar_mitzvah, bat_mitzvah, engagement, wedding_chasidic, sheva_brachot, pidyon_nefesh, petira (אבל — מבנה קבוע ש"ל!), levaya, shiva, shloshim, azkara, yahrzeit, matzeva
### מעגל השנה:
- rosh_hashana, yom_kippur, sukkot, chanukah, tu_bishvat, purim, pesach, lag_baomer, shavuot, bein_hametzarim, elul, shabbat
### אירועים/ארגונים:
- kenes, hatrama, hachnasat_sefer_torah, chanukat_bayit, dinner, milgot, mosdot_registration

**מקורות הקופי:** חלץ ניסוחים אותנטיים מהקבצים ב-research/kb_*.md. אל תמציא — השתמש בדוגמאות שכבר תועדו. כל דוגמה עם שדה source (URL).

## הסגנונות (shared/styles.ts) — מבוסס kb_styles_formats.md
- malchut (מלכות וקסברגר): זהב #C9A227/#D4AF37, בורדו #5C0A1E, נייבי #0B1E3D, קרם #F5EEDD, שחור #0D0D0D. פונטים: David Libre עבה כותרות, Frank Ruhl גוף. קישוט גבוה — מסגרות מפוארות, כתר, רימונים.
- chasidic_royal (חסידי-מלכותי): זהב+בורדו/נייבי, עיטורים עשירים, גמיש נקי↔עמוס.
- modern_torani: כחול/אפור/לבן, מגע זהב עדין, Assistant/Rubik/Heebo, מינימלי נקי.
- classic (עיתונות): שחור-לבן + מותג, Frank Ruhl/David, פונקציונלי.
- **מודעת אבל = תת-סגנון קבוע:** שחור-לבן בלבד, מסגרת שחורה עבה, פונט חיים/David, ללא קישוטים, מבנה קבוע (בדה"א→שם+אב→ז"ל→תאריכים→לוויה→אבלים→ת.נ.צ.ב.ה).

## הפורמטים (shared/formats.ts) — מבוסס kb_styles_formats.md
- ig_feed_45: 1080×1350 (4:5)
- ig_square: 1080×1080 (1:1)
- story: 1080×1920 (9:16), safe zone מרכזי
- a4_print: 2480×3508 (300DPI), CMYK-ready, bleed
- a3_poster: 3508×4961
- newspaper_quarter: ~170×127 מ"מ (2008×1500 @300)

## הזרימה (UI) — נקודות כניסה גמישות
מסך בית → בחירת נקודת כניסה:
1. "צור מודעה חדשה" → בחר קבוצה → קטגוריה → סגנון → פורמט → פותח את העורך עם תבנית מתאימה
2. "יש לי קופי" → הזן טקסט → קפוץ לבחירת עיצוב
3. "יש לי עיצוב" → בחר תבנית → מלא טקסט
עורך (Editor):
- Canvas מרכזי (Konva stage) עם התבנית החיה
- פאנל צד ימין: רשימת שכבות, לכל שכבת טקסט — עריכת טקסט inline + בחירת פונט/גודל/עובי/צבע/יישור
- פאנל שדות חכם: לפי הקטגוריה — שדות מובנים (כותרת, שם הרב, נושא, זמן, מקום) + כפתור "הצע קופי" (ממנוע הקופי — כרגע מבסיס-הידע, בעתיד AI)
- העלאת תמונה (תמונת הרב/לוגו) → נכנס לשכבת placeholder
- כפתור "רקע AI" (Gemini, עם fallback)
- כפתורי ייצוא: "הורד PNG", "הורד PDF"

## מנוע הקופי
כרגע: מציג את copyExamples מבסיס-הידע לקטגוריה, עם כפתורי "השתמש"/"ערוך". מבנה השדות ממולא אוטומטית. בעתיד: Claude API. תכנן את השכבה כך שקל להחליף מקור (function suggestCopy(category, fields) שכרגע מחזיר מבסיס-ידע).

## POC — מיקוד ראשון: שיעור תורה
בנה לפחות 3-4 תבניות שיעור תורה מלאות ומרשימות בסגנונות שונים (malchut, chasidic_royal, modern_torani), כל אחת עם שכבות אמיתיות, אוטו-פיט, ומקום לתמונת הרב. השתמש בדוגמה shiur1.jpg (research/examples/) כרפרנס לאיכות: כותרת ענק, היררכיה עשירה, גריד ימים אפשרי, לוגו למעלה. חובה שהתוצאה תיראה כמו עבודת מעצב אמיתי — לא "תמונת AI עם טקסט".

## איכות
- RTL מלא, עברית מושלמת
- לבדוק עם Playwright: לטעון את העורך, למלא טקסט, לראות רינדור חי, לייצא
- אין טקסט חורג/נשבר
- ממשק נקי, מקצועי, בעברית
