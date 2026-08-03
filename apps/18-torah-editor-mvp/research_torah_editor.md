# מחקר מעמיק: עולם העריכה התורנית הממוחשבת והאוטומטית

**מטרת המחקר:** בסיס ידע מקצועי לבניית "העורך התורני" — מערכת AI לעריכה, הגהה, ניקוד, אימות מקורות וזיהוי ציטוטים בספרים תורניים. המחקר מסכם את המאגרים הדיגיטליים הקיימים, כלי ה-NLP העברי המובילים, שיטות העבודה של עורכים תורניים מקצועיים, וארכיטקטורות RAG מתאימות.

---

## חלק א' — מאגרים תורניים דיגיטליים וממשקי API

### 1. Sefaria — המאגר הפתוח המרכזי

**מה יש בו:** ספריא (Sefaria) היא הספרייה הדיגיטלית הפתוחה הגדולה בעולם לטקסטים יהודיים: תנ"ך, משנה, שני התלמודים (בבלי וירושלמי), מדרשים, משנה תורה לרמב"ם, שולחן ערוך ונושאי כליו, קבלה, ספרי מחשבה, שו"ת ועוד — למעלה מ-100 מיליון מילים בעברית ובאנגלית, כולל תרגומים ופרשנויות ([Sefaria Developers MCP](https://developers.sefaria.org/docs/the-sefaria-mcp)).

**רישיון:** קוד המקור של ספריא מופץ ברישיון **GNU AGPLv3** ([OpenAPI spec של ספריא](https://github.com/Sefaria/Sefaria-Project/blob/master/docs/openAPI.json)), אך **אין רישיון אחיד לטקסטים עצמם** — כל טקסט מתויג ברישיון נפרד (Public Domain, CC0, CC-BY, CC-BY-SA או CC-BY-NC), והמידע מופיע בשדה `license` בתוך קובץ ה-JSON של כל גרסת טקסט ([Sefaria-Export LICENSE.md](https://github.com/Sefaria/Sefaria-Export/blob/master/LICENSE.md)). לכן לפני שילוב טקסט במוצר מסחרי יש לבדוק את שדה הרישיון הספציפי לכל ספר/גרסה.

**Sefaria API (api.sefaria.org / www.sefaria.org/api):**
- **Texts API (v3):** `GET /api/v3/texts/{tref}` — שליפת טקסט לפי מ"מ (Ref), עם אפשרות לציין שפה וגרסה (`?version=english` או `language|versionTitle`). לדוגמה: `https://www.sefaria.org/api/v3/texts/Genesis 25:19-28:9` ([Sefaria FAQ](https://developers.sefaria.org/reference/others-have-asked)).
- **Index API:** `GET /api/index/` — מחזיר את "עץ" כל הטקסטים המוכרים (טבלת תוכן), עם מטא-דאטה ([Sefaria API Documentation Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation/948bb3dcf283653163a2d0a6b88dca152cabaf76)).
- **Related API:** שליפת קישורים/פרשנויות/מקבילות הקשורות לטקסט נתון (למשל כל פרשני התורה על פסוק מסוים).
- **Links API:** רשימת כל הקישורים הבין-טקסטואליים (commentary, quotation, related וכו').
- **Search API (v1/v2):** מבוסס ElasticSearch, מאפשר חיפוש טקסטואלי מלא, כולל שדה `naive_lemmatizer` לחיפוש לפי למה בעברית ([Search API v2 Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/Search-API-(v2))).
- **Calendars API:** שליפת הפרשה השבועית / דף היומי לפי תאריך.
- **Name API:** אוטוקומפליט לזיהוי שמות ספרים, מ"מ, נושאים ומחברים — שימושי לזיהוי ציטוטים.
- כל ה-endpoints המתועדים ניגשים **בלי מפתח API** לבקשות GET; POST (עריכה/העלאה) דורש `apikey` שמתקבל בפנייה לרשימת התפוצה של המפתחים ([Sefaria API Documentation Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation/948bb3dcf283653163a2d0a6b88dca152cabaf76)).
- תיעוד רשמי ומלא, כולל OpenAPI spec ומגרש משחקים אינטראקטיבי, נמצא ב־[developers.sefaria.org](https://developers.sefaria.org/reference/getting-started). קיים גם קובץ `llms.txt` המיועד לסוכני AI: `https://developers.sefaria.org/llms.txt`.

**מבנה ה-Ref (מ"מ):** מזהה טקסטואלי טקסטואלי ("citation") הוא המפתח לכל המערכת. לדוגמה `Genesis 1:1`, `Berakhot 2a:1`, `Mishneh Torah, Sabbath 1:1`. תיעוד מלא של חוקי בניית Refs נמצא במדריך [Text References](https://developers.sefaria.org/docs/text-references).

**Sefaria-Export (GitHub):** מאגר [Sefaria/Sefaria-Export](https://github.com/Sefaria/Sefaria-Export) הוא הדרך הרשמית להורדה מלאה (ללא תלות ב-API בזמן ריצה) — כ-26GB, כ-85,000 קבצים, מתעדכן חודשית, מאוחסן ב־Google Cloud Storage הציבורי `gs://sefaria-export/`. מבנה התיקיות:
```
gs://sefaria-export/
  json/{categories}/{title}/{language}/{versionTitle}.json
  txt/{categories}/{title}/{language}/{versionTitle}.txt
  links/          → CSV של כל הקישורים הבין-טקסטואליים הידועים
  schemas/        → מבני JSON schema לכל טקסט
```
קובץ אינדקס יחיד `books.json` מכיל את כל המטא-דאטה וכתובות ההורדה, ומתעדכן ב-CI חודשי ([Sefaria-Export CLAUDE.md](https://github.com/Sefaria/Sefaria-Export/blob/master/CLAUDE.md)). ניתן גם לקבל **MongoDB dump מלא** של מסד הנתונים של ספריא להרצה מקומית, וכן גרסת SQL/SQLite באמצעות [Sefaria-SQL](https://github.com/Sefaria/Sefaria-SQL).

**Sefaria Linker API — זיהוי ציטוטים אוטומטי (חשוב מאוד לפרויקט):** ה-Linker API ([תיעוד](https://developers.sefaria.org/docs/linker-api)) הוא בדיוק הפתרון ל"זיהוי אוטומטי של ציטוטים בטקסט חופשי":
- Endpoint: `POST /api/find-refs` (מזוהה עם המילת מפתח "מוצאי-מ"מ")
- קלט: אובייקט `{ title, body }` (טקסט חופשי).
- פלט: לכל ציטוט מזוהה — טווח תווים (`startChar`/`endChar`), הטקסט המצוטט, ורשימת `refs` אפשריים (יותר מאחד אם הציטוט אמביגואלי, למשל "שם" / "שם"), וקישור ל-URL בספריא.
- מנוע השפה **העברי מבוסס BERT** (טרנספורמר), והאנגלי מבוסס CNN; שני המנועים תומכים בציטוטי "שם"/"ibid" ומזהי הקשר (מ"מ שהופיע ב-title משמש כברירת מחדל להקשר בגוף הטקסט).
- ניתן לבקש `with_text=1` להחזרת תוכן הטקסט המצוטט עצמו (לאימות/השוואה), ו-`debug=1` לניתוח מפורט של פירוק הציטוט לחלקים.
- זהו בדיוק אבן היסוד לפיצ'ר "הצמדת מראה-מקום מדויק" ו"אימות מקורות" שהמשתמש מבקש לבנות.

### 2. Otzaria (אוצריא) — פרויקט קוד פתוח ישראלי

**מה זה:** אוצריא היא אפליקציית קוד פתוח (Flutter/Dart) שמנגישה ספרייה תורנית של למעלה מ-6,000 ספרי קודש ומקורות, כחלופה חינמית למאגרים מסחריים כמו אוצר החכמה ובר-אילן ([ויקיפדיה על אוצריא](https://info.org.il/wikipedia/%D7%90%D7%95%D7%A6%D7%A8%D7%99%D7%90.html); [GitHub Sivan22/otzaria](https://github.com/Sivan22/otzaria)).

**רישיון:** קוד המקור משוחרר תחת **Unlicense** (רישיון ציבורי-דומיין למעשה); הטקסטים עצמם שאובים ממקורות פתוחים שונים (ספריא, דיקטה ואחרים) ולכל טקסט הרישיון שלו — יש לבדוק פרטנית באתר ספריא ([GitHub Sivan22/otzaria](https://github.com/Sivan22/otzaria)).

**ארכיטקטורה טכנית:** האפליקציה נכתבה ב-Dart עם מסגרת Flutter (חוצה-פלטפורמות: Windows, Linux, macOS, Android, iOS). הצגת PDF מבוססת על ספריית `pdfrx`. במפת הדרכים (Roadmap) של הפרויקט מתוכננים: מעבר לאחסון בסיס-נתונים SQLite, שכבת ניהול מצב (Bloc), **וחיפוש סמנטי מבוסס embeddings ו-vector database** — כלומר הפרויקט עצמו מכוון לכיוון RAG ([GitHub Sivan22/otzaria](https://github.com/Sivan22/otzaria)).

**גישה טכנית לטקסט:** נכון למועד המחקר, בפרויקט הראשי **אין API רשמי חשוף**; הגישה היא דרך ריצה מקומית של האפליקציה מול מאגר טקסטים (ספריית "otzaria-library" הנפרדת בגיטהאב, למשל [zevisvei/otzaria-library fork](https://github.com/zevisvei)) שמכילה קבצי טקסט (TXT/DOCX/HTML/PDF) בפורמט פתוח. קיים גם שרת **MCP (Otzaria MCP Server)** שמנגיש את הספרייה למודלי שפה בפרוטוקול MCP ([Jewish-Interest-MCP-Projects](https://github.com/danielrosehill/Jewish-Interest-MCP-Projects)) — כלומר ניתן "להושיב" LLM על אוצריא באופן דומה לספריא.

**אוצר החכמה (Otzar HaHochma):** מאגר **מסחרי** ולא פתוח — הגדול בעולם מסוג זה, מכיל כ-156,000-157,000 ספרי יהדות סרוקים דף-אחר-דף בצורתם המקורית (לא טקסט דיגיטלי נקי אלא סקאנים עם שכבת OCR לחיפוש) ([אוצר החכמה — ויקיפדיה](https://he.wikipedia.org/wiki/%D7%90%D7%95%D7%A6%D7%A8_%D7%94%D7%97%D7%95%D7%9B%D7%9E%D7%94); [otzar.org](https://www.otzar.org/)). אין API פומבי; הגישה היא בתשלום דרך תוכנת שולחן עבודה או גישה מבוססת דפדפן (`tablet.otzar.org`), ומיועדת בעיקר למוסדות וספריות ([Otzar HaHochma Information for institutions](https://www.otzar.org/institgen.asp)). **לא מתאים כמקור טקסט-נקי לפרויקט AI** בשל מגבלות רישוי ומגבלת הפורמט (תמונת עמוד).

### 3. DICTA — מרכז דיקטה לניתוח טקסטים

דיקטה היא עמותה ישראלית שמפתחת כלי בלשנות חישובית לעברית ולספרות התורנית, ומשחררת רבים מהכלים בקוד פתוח לתועלת הציבור ([דיקטה — Wikiwand](https://www.wikiwand.com/he/articles/%D7%93%D7%99%D7%A7%D7%98%D7%94)).

**כלים רלוונטיים לפרויקט (מ־[dicta.org.il/tools](https://dicta.org.il/tools?lang=en)):**

| כלי | תיאור | רלוונטיות לעורך התורני |
|---|---|---|
| **Nakdan (נקדן מהיר / נקדן מקצועי)** | ניקוד אוטומטי לעברית מודרנית, רבנית ופואטית, תוך כדי הקלדה | ניקוד אוטומטי — פיצ'ר מרכזי |
| **Nakdan API** | `POST https://nakdan-5-3.loadbalancer.dicta.org.il/addnikud` — מקבל טקסט, `genre` (`modern`/`rabbinic`/`poetic`), מחזיר טקסט מנוקד + ניתוח מורפולוגי | ממשק API ישיר לשילוב בפייפליין |
| **Citation Finder** | "Identify exact or approximate quotations of biblical and talmudic sources in a given text" | בדיוק זיהוי הציטוטים המבוקש |
| **Parallel Finder** | איתור מקבילות טקסטואליות בטקסטים עבריים | אימות מקורות / זיהוי ציטוטים סמויים |
| **Dicta Library** | מוסיף אוטומטית ניקוד, פיסוק, פענוח ראשי-תיבות והפניות למקורות בספרות רבנית | דוגמה מוכנה לפייפליין עריכה שלם |
| **Abbreviation Expander** | פענוח אוטומטי של ראשי תיבות בטקסט היסטורי (`abbreviation.dicta.org.il`) | פתרון לבעיית ראשי-התיבות בהגהה |
| **Maivin** | OCR + ניקוד + פיסוק + פענוח ראשי תיבות + זיהוי מקורות מתמונה של עמוד (גם בכתב רש"י) | פתרון end-to-end מדפוס לדיגיטל |
| **מפתח לשו"ת** | כלי ליצירת אינדקס נושאים אוטומטי מספרי שו"ת, מפיק CSV | דוגמה למיפוי אוטומטי של תוכן |
| **Talmud-Bavli-with-Nikud** | הש"ס המנוקד במלואו (כתיב חסר/מלא), ברישיון **CC BY-SA**, זמין ב-[GitHub](https://github.com/Dicta-Israel-Center-for-Text-Analysis/Talmud-Bavli-with-Nikud) | מאגר טקסט מוכן מנוקד להזנה/אימות |

**הישג טכני מתועד:** בעזרת הנקדן הרבני הצליחה דיקטה להפיק גרסה מנוקדת מלאה של כל התלמוד הבבלי בתוך כארבע שנים בעבודת עובד אחד במשרה חלקית — לעומת עבודה של צוות שלם על פני שנים רבות בלעדיו ([דיקטה — Wikiwand](https://www.wikiwand.com/he/articles/%D7%93%D7%99%D7%A7%D7%98%D7%94)). זו עדות חזקה לפוטנציאל ה-ROI של ניקוד אוטומטי בקנה מידה.

**Rav Dicta:** "רב וירטואלי" מבוסס AI שעונה על שאלות הלכתיות מתוך הספרות הרבנית הקלאסית, כרגע בבטא ([dicta.org.il](https://dicta.org.il/?lang=en); [rav.dicta.org.il](https://rav.dicta.org.il)). סקירה בלתי-תלויה מציינת שהמקורות שהוא מביא נכונים ברוב המקרים אך המערכת "נתקעת בכל פעם שהיא צריכה להשתמש בהיגיון כדי להסיק דברים מהנתונים שלה", ועדיין אינה יודעת "לנתח טקסטים" לעומק ([Exploring Rav Dicta – Irrationalist Modoxism](https://irrationalistmodoxism.substack.com/p/exploring-rav-dicta-the-most-advanced)) — תזכורת חשובה למגבלות מודלים גם עם גישה למקורות טובים.

**DictaBERT ו-DictaLM:** דיקטה משחררת גם משפחת מודלי שפה עברית (ראו חלק 5 להלן).

### 4. HebrewBooks, פרויקט השו"ת (בר-אילן), על-התורה, ויקיטקסט עברי

| מאגר | כיסוי | פורמט/API | הערות רישוי |
|---|---|---|---|
| **HebrewBooks.org** | סריקות של אלפי ספרי קודש (בעיקר ספרים ישנים שאינם מודפסים יותר), הרחיב את פעילותו לכלול את כל ספרי הקודש שהודפסו | קבצי PDF להורדה/הדפסה, אינדוקס וחיפוש טקסטואלי מלא ע"י מנוע **dtSearch**, OCR ע"י חברת **Ligature** ([HebrewBooks – מיזם המכלול](https://www.hamichlol.org.il/HebrewBooks)) | חינם לשימוש אישי בלבד; אין API רשמי מתועד; המשנה תורה והתלמוד הבבלי זמינים בטקסט מלא, שאר הספרים בעיקר כסקאן+OCR |
| **פרויקט השו"ת (בר-אילן) — Responsa Project** | מאגר תורני ממוחשב עצום: תנ"ך ופרשנים, תלמוד בבלי עם רש"י ותוספות, ירושלמי, משנה תורה, שו"ע ונושאי כלים, מדרשים, מאות ספרי שו"ת, אנציקלופדיה תלמודית, כ-700 מיליון מילים ולמעלה מ-150,000 שאלות-ותשובות ([אודות – שו"ת בר-אילן](https://www.responsa.org.il/%D7%90%D7%95%D7%93%D7%95%D7%AA-%D7%A9%D7%95%D7%B4%D7%AA-%D7%91%D7%A8-%D7%90%D7%99%D7%9C%D7%9F/)) | תוכנת שולחן-עבודה/דיסק-און-קי, מנוע חיפוש מורפולוגי ייחודי (Filtered/Immediate Search); אין API ציבורי | **מסחרי, בהרשמה/רכישה בלבד**; לא מתאים כמקור פתוח לפרויקט AI |
| **על-התורה (AlHaTorah.org)** | מהדורות מבוססות מקרא ("מקראות גדולות") עם פרשנים רבים, כלי קונקורדנציה, השוואת מדרשים | ממשק אתר מבוסס MediaWiki-חלקי; יש תכונת קונקורדנציה שדורשת התחברות (login) ([Concordance Guide – AlHaTorah](https://mg.alhatorah.org/Concordance_Guide)) | חינמי לצפייה; ללא API רשמי מתועד לפיתוח חיצוני |
| **ויקיטקסט עברי (he.wikisource.org)** | טקסטים תורניים/קלאסיים בנחלת הכלל, כולל תנ"ך, ולעיתים ספרות רבנית קלאסית | ניגש דרך **MediaWiki Action API** הסטנדרטי (`https://he.wikisource.org/w/api.php`), וכן דרך Wikimedia dumps מלאים ([Wikimedia Downloads](https://dumps.wikimedia.org/)) | רישיון פתוח (CC BY-SA / נחלת הכלל), API חינמי ופתוח מלא |
| **פרויקט בן-יהודה** | ספרות עברית קלאסית (לאו דווקא תורנית) בנחלת הכלל | יש **API רשמי** מתועד ([benyehuda.org/page/api](https://benyehuda.org/page/api)) | פתוח |

**מסקנת ביניים:** מבין המאגרים הגדולים, **ספריא היא היחידה עם API פתוח מלא, מתועד ומודרני, וברישיון ברור לרוב הטקסטים** — ולכן היא עמוד השדרה הטבעי לפרויקט. אוצריא/דיקטה משלימים אותה בטקסטים נוספים ובכלי NLP ייעודיים. אוצר החכמה ובר-אילן הם מאגרים איכותיים אך **סגורים מסחרית** ואינם מתאימים לשילוב טכני-אוטומטי בקנה מידה (למעט אם המשתמש מחזיק רישיון מוסדי מפורש ומקבל אישור שימוש ב-API/scraping — ברירת המחדל אצלם אינה תומכת בכך).

### 5. מאגרי ניקוד ומודלי NLP עבריים

| מודל/כלי | גוף מפתח | ארכיטקטורה | ייעוד | קישור |
|---|---|---|---|---|
| **Nakdan** | דיקטה (ד"ר אבי שמידמן, פרופ' משה קופל, פרופ' יואב גולדברג) | רשתות עצביות + ידע לשוני ידני | ניקוד עברית מודרנית/רבנית/פואטית עם ממשק תיקון ידני | [Nakdan: Professional Hebrew Diacritizer (paper)](https://deepai.org/publication/nakdan-professional-hebrew-diacritizer) |
| **Nakdimon** | אלעזר גרשוני, יובל פינטר (Bar-Ilan) | LSTM דו-שכבתי ברמת תו | דיאקריטיזציה של עברית מודרנית ללא מילון חוקים | [arXiv 2105.05209](https://arxiv.org/abs/2105.05209), [GitHub](https://github.com/elazarg/nakdimon) |
| **D-Nikud** | נדב שקד, עדי רוזנטל | TavBERT + Bi-LSTM | ניקוד משופר בשילוב מודל BERT מאומן מראש | [arXiv 2402.00075](https://arxiv.org/html/2402.00075v1), [GitHub](https://github.com/NadavShaked/D_Nikud) |
| **MenakBERT** | Ido Cohen | TavBERT ברמת-תו + ראש סיווג משולש | ניקוד seq2seq | [HuggingFace](https://huggingface.co/idoco/MenakBERT) |
| **AlephBERT** | OnlpLab, אונ' בר-אילן | BERT-base (12 שכבות, אוצר מילים 52K), מאומן על 95M משפטים | סגמנטציה מורפולוגית, POS, NER, סנטימנט — SOTA לעברית מודרנית (2021) | [arXiv 2104.04052](https://arxiv.org/abs/2104.04052), [HuggingFace](https://huggingface.co/onlplab/alephbert-base) |
| **AlephBERTGimmel** | דיקטה | BERT עם אוצר מילים גדול יותר (128K token pieces) | שיפור SOTA על כל המדדים העבריים | [arXiv 2211.15199](https://arxiv.org/pdf/2211.15199.pdf) |
| **HeBERT** | Avichay Chriqui, Inbal Yahav (אונ' ת"א) | BERT-Base, מאומן על OSCAR + ויקיפדיה + UGC | ניתוח סנטימנט ורגשות (HebEMO) | [GitHub](https://github.com/avichaychriqui/HeBERT) |
| **DictaBERT** | דיקטה (Shaltiel Shmidman, Avi Shmidman, Moshe Koppel) | BERT SOTA לעברית מודרנית | Segmentation, Morphological Tagging, Lemmatization (dictabert-lex), NER, QA (dictabert-heq), Joint Parsing (dictabert-joint) — הכל דרך קריאת HuggingFace יחידה | [arXiv 2308.16687](https://arxiv.org/abs/2308.16687), [HuggingFace](https://huggingface.co/dicta-il/dictabert) |
| **BEREL / BEREL_3.0** | דיקטה | BERT for Early/Rabbinic Hebrew | מודל שפה ייעודי ל**עברית רבנית ומקראית** — קריטי לטקסטים תורניים | [Hebrew-AI-Models catalog](https://github.com/danielrosehill/Hebrew-AI-Models) |
| **MsBERT (Manuscript BERT)** | דיקטה | BERT מיועד לכתבי-יד | שחזור מילים חסרות בכתבי-יד קטועים, הבחנת ציטוט מול חידוש פרשני | [MAFAT NNLP-IL resources](https://resources.nnlp-il.mafat.ai/?dc6e3d3b_page=2) |
| **DictaLM 3.0 (1.7B–24B)** | דיקטה | LLM עברי מלא (Base/Instruct/Thinking) | מודל שפה גנרטיבי עברי מקומי — אלטרנטיבה למודלים גנרים | [Hebrew-AI-Models catalog](https://github.com/danielrosehill/Hebrew-AI-Models) |
| **MiqraBERT** | David Smiley | Sentence-BERT מכוון-כוונן מ-AlephBERT | דמיון סמנטי בין פסוקים למקראה (זיהוי מקבילות מקראיות) | [arXiv 2606.19638](https://arxiv.org/pdf/2606.19638v1.pdf) |
| **Morfix (מורפיקס)** | מילון רב-מילים | מילון תרגום עברית-אנגלית מבוסס אתר/אפליקציה | תרגום/בדיקת מילים; ללא API ציבורי מתועד | [App Store](https://apps.apple.com/us/app/%D7%9E%D7%95%D7%A8%D7%A4%D7%99%D7%A7%D7%A1-%D7%9E%D7%99%D7%9C%D7%95%D7%9F-%D7%AA%D7%A8%D7%92%D7%95%D7%9D-%D7%A2%D7%91%D7%A8%D7%99-%D7%90%D7%A0%D7%92%D7%9C%D7%99/id360548887) |
| **Hspell** | קוד פתוח (AGPL) | בדק-כתיב ומנתח מורפולוגי חוקי | בדיקת כתיב עברי בסיסית | [Hebrew-Resources](https://github.com/NNLP-IL/Hebrew-Resources/blob/master/models_tools_services.rst) |

**המלצה מעשית:** לצורכי "העורך התורני" יש חשיבות מכרעת למודלים שהותאמו לעברית **רבנית/מקראית** ולא רק עברית מודרנית — כלומר **BEREL, MsBERT, DictaBERT (עם ה-Nakdan הרבני), ו-AlephBERTGimmel** רלוונטיים הרבה יותר מ-AlephBERT הבסיסי או HeBERT (המכוונים לעברית מודרנית/רשתות חברתיות).

---

## חלק ב' — פונקציות עריכה תורנית מקצועית

### 1. זיהוי אוטומטי של ציטוטים והצמדת מראה-מקום

שני כלים מוכנים כבר פותרים חלק ניכר מהבעיה:
- **Sefaria Linker API** (`POST /api/find-refs`, ראו חלק א׳.1) — מזהה ציטוטים מקראיים ותלמודיים בטקסט חופשי בעברית ובאנגלית, כולל התמודדות עם ציטוטי "שם"/הקשר, אמביגואליות (מספר אפשרויות), והחזרת קישור ישיר למקור בספריא.
- **DICTA Citation Finder** — "מזהה ציטוטים מדויקים או משוערים ממקורות מקראיים ותלמודיים בטקסט נתון" ([Dicta Tools](https://dicta.org.il/tools?lang=en)).
- **DICTA Parallel Finder** — מאתר מקבילות טקסטואליות (למשל בין מדרשים שונים או בין נוסחים מקבילים), חשוב לזיהוי ציטוטים שאינם מדויקים מילה-במילה.

הארכיטקטורה המומלצת: שכבת **NER ייעודית לזיהוי מ"מ** (כמו זו שמפעילה ספריא, מבוססת BERT לעברית) ← המרה ל-Ref קנוני ← אימות מול הטקסט המקורי (חלק ב'.2) ← הצמדת ההערה/סוגריים בפורמט הנכון (חלק ב'.5).

### 2. אימות מקורות — השוואת ציטוט למקור

לאחר זיהוי ה-Ref, יש לשלוף את הטקסט המקורי (למשל דרך Texts API של ספריא עם `with_text=1` ב-Linker, או ישירות `GET /api/v3/texts/{ref}`) ולהשוות:
- **השוואה מדויקת (exact match)** — לזיהוי ציטוט מדויק להיפך, כלומר לבדוק אם המצוטט בטקסט תואם מילה-במילה למקור (בהתאמה לניקוד/כתיב).
- **השוואה מקורבת (fuzzy/approximate)** — הכלים של דיקטה (Citation Finder, Parallel Finder) תומכים גם בציטוטים לא מדויקים (paraphrase, קיצור, שיבוש), שהם המקרה הנפוץ בספרות תורנית (ציטוט מהזיכרון, מובאה חלקית).
- אלגוריתמית: שילוב Levenshtein distance / diff על התו, בתוספת embeddings סמנטיים (למשל **MiqraBERT** לזיהוי מקבילות מקראיות, ([arXiv 2606.19638](https://arxiv.org/pdf/2606.19638v1.pdf)) לזיהוי דמיון גם כשהניסוח שונה חלקית.
- הפלט הרצוי לעורך: "ציטוט תואם" / "ציטוט עם סטייה (מוצג ה-diff)" / "מקור לא נמצא — ודא מראה-מקום".

### 3. ניקוד אוטומטי — האתגרים המיוחדים לטקסט תורני

עברית תורנית (מקרא, תלמוד, ראשונים, אחרונים) שונה משמעותית מעברית מודרנית:
- **ניקוד ארמית תלמודית** — מצריך מחקר בלשני נפרד, כפי שדיקטה תיארה בעצמה לגבי פרויקט ניקוד הש"ס ([דיקטה — Wikiwand](https://www.wikiwand.com/he/articles/%D7%93%D7%99%D7%A7%D7%98%D7%94)).
- **שמות קודש** — ניקוד שמות ה' (יו"ד-ה"א, אלף-דל"ת) כרוך בשאלות הלכתיות (איסור מחיקת שם ה') ולא רק לשוניות; יש לתת אופציה לצמצום/הימנעות מניקוד מלא של שמות קודש בהתאם למדיניות ההוצאה.
- **ראשי תיבות** — "רמב"ם", "שו"ע", "או"ח", "יו"ד", "רש"י" וכו' — צריכים להתפענח נכון להקשרם (יש ראשי-תיבות מרובי-משמעות) לפני ניקוד/פענוח מלא. ל-DICTA יש כלי ייעודי — **Abbreviation Expander** ([Digital Forum Showcase: DICTA](https://www.eurojewishstudies.org/digital-forum-showcase-reports/dicta-the-israel-center-for-text-analysis/)).
- **כתיב מלא/חסר** — כללי האקדמיה ללשון העברית (עדכון 2017) מגדירים את הכתיב חסר-הניקוד ה"מלא" (למשל "תוכנית" במקום "תכנית") ([עדכון כללי הכתיב המלא – Ynet](https://www.ynet.co.il/articles/0,7340,L-4977193,00.html); [האקדמיה ללשון העברית — כתיב מלא](https://hebrew-academy.org.il/topic/hahlatot/missingvocalizationspelling/)). דיקטה תומכת בכתיב **גם מלא וגם חסר** בהש"ס המנוקד ([Talmud-Bavli-with-Nikud repo](https://github.com/Dicta-Israel-Center-for-Text-Analysis/Talmud-Bavli-with-Nikud)) — יש לתת למשתמש בחירה, שכן ספרים תורניים רבים נצמדים למסורת כתיב חסר קלאסית ולא לתקן האקדמיה המודרני.
- **גורם השגיאה השיורי (residual error)** — גם הנקדן הטוב בעולם טועה; המלצת התיעוד עצמו של DICTA וכלים מתחרים (Nakdimon) היא **שכבת עריכה ידנית** עם הצגת חלופות מסודרות לפי סבירות ([Nakdimon paper](https://arxiv.org/abs/2105.05209)) — כלומר "העורך התורני" חייב תמיד ממשק Review-and-Correct ולא רק פלט אוטומטי סופי.

**כלים מדורגים לפי דיוק/התאמה לטקסט רבני (מהחזק לחלש לצורך זה):** Nakdan הרבני (DICTA, מכוון ספציפית לטקסטים רבניים) → D-Nikud/MenakBERT (BERT-based, כלליים) → Nakdimon (LSTM קליל, ל"מקרים כלליים" של עברית מודרנית, פחות מכוון לרבנית).

### 4. הגהה תורנית: שגיאות כתיב, נוסח, ראשי תיבות

עריכה תורנית מקצועית (כפי שמלמדים מדריכי סטייל של אתרי תורן, כמו [מדריך לכתיבה תורנית — המכלול](https://www.hamichlol.org.il/%D7%94%D7%9E%D7%9B%D7%9C%D7%95%D7%9C:%D7%9E%D7%93%D7%A8%D7%99%D7%9A_%D7%9C%D7%9B%D7%AA%D7%99%D7%91%D7%94_%D7%AA%D7%95%D7%A8%D7%A0%D7%99%D7%AA)) מבחינה בין שלוש שכבות עריכה:
1. **עריכה עניינית** — בדיקת תוכן, סדר הנושאים, השלמת מידע חסר.
2. **עריכה לשונית** — תיקון שגיאות לשון וסגנון, כתיבה תורנית לעומת שפה מדוברת; יש להימנע מתיאורים סובייקטיביים (למשל "זצ"ל" אלא כשהוא חלק משם רשמי) ומכתיבה רגשית.
3. **עריכה טכנית** — הוספת קישורים למקורות (למשל להיברובוקס), מיון, בדיקת תקינות קישורים.

בהגהה תורנית קלאסית (למשל, מסורת הגהה על כתבי-יד/דפוסים) יש נהלים מדויקים:
- **ציטוט מדויק חובה**: "מובאות ממקור מסוים יש לצטט בדיוק כבמקור, גם אם נראה שיש שם שיבוש; את הנראה כשיבוש יש להקיף בסוגריים עגולים ואת הצעת התיקון בסוגריים מרובעים, או להעיר על כך בהערה" ([מדריך הגהה — daat.ac.il](https://daat.ac.il/daat/kitveyet/beyt/9.doc)) — כלל קריטי לפונקציית "אימות מקורות" של המערכת: כשיש סטייה מהמקור, אין "לתקן" את הטקסט המצוטט אלא לסמן חשד לשיבוש ולהציע תיקון בסוגריים מרובעים, לא למחוק את המקור.
- **מילה שקריאתה מסופקת** — מסמנים סימן שאלה בסוגריים.
- **הגהה ידנית על כתב-יד** — משתמשים בעט בצבע בולט, מסמנים גם בטקסט וגם בשולי הגיליון.
- **ראשי תיבות** (רמב"ם, שו"ע, או"ח, רמ"א) — נוהג מקובל להימנע מפתיחתם בכתיבה תורנית פנימית (לחילופין דורש פתיחה בטקסט מיועד לקהל רחב/אקדמי).

### 5. פורמט מראי מקום מקובל

הפורמט הסטנדרטי במסורת התורנית (מתועד גם במדריכי כתיבה אקדמית-תורנית כמו זה של [משרד החינוך](https://meyda.education.gov.il/files/AdultEducation/hed_haulpan/hed_105_vera_agranovsky_02.pdf) ומדריכי הגהה של [daat.ac.il](https://daat.ac.il/daat/kitveyet/beyt/9.doc)):

| מקור | פורמט מראה-מקום | דוגמה |
|---|---|---|
| תנ"ך | ספר פרק, פסוק | ויקרא ג, ד |
| תלמוד בבלי | מסכת דף עמוד (א'/ב' או ע"א/ע"ב) | סנהדרין כ"ו ע"ב |
| רא"ש | מסכת פרק סימן | שבת פ"ב סי' ה |
| טור/שו"ע | חלק (או"ח, יו"ד, אה"ע, חו"מ) סימן, (סעיף) | שו"ע או"ח סי' ...; אה"ע סי' לב |
| רמב"ם | ספר/הלכות פרק הלכה | רמב"ם הל' שבת פכ"ב הי"ד |
| שו"ת | שם הספר סימן | שו"ת מהרי"ק קסה |

כללי טיפוגרפיה נלווים:
- אין לציין את האותיות המסמנות מספרי דפים/פרקים/סימנים בגרש/גרשיים.
- ראשי תיבות מסומנים בגרש (אחת) לראש-תיבה יחיד (למשל וכו') ובגרשיים (״) בראשי-תיבות מרובי-אותיות (למשל רמב"ם).
- מובאות מקור מוקפות במרכאות/גרשיים, סטיות-מהמקור מסומנות בסוגריים עגולים, הצעות תיקון בסוגריים מרובעים.
- אין לשים סימני פיסוק כפולים לפני/אחרי מקפים, סימני קריאה ושאלה.

**מסקנה טכנית:** יש לבנות טבלת "דפוסי Regex/NER" ממופה מכל אחד מהפורמטים הנ"ל (בדומה למנוע ה-Linker של ספריא, שממנו אפשר לשאוב גם דוגמאות התנהגות רבות) ולתמוך בפלט אחיד שממיר בין מ"מ "כפי שכתוב בטקסט המקור" למ"מ קנוני של ספריא (Ref) לצורך אימות, ואז מציג בחזרה בפורמט המקובל בעולם התורני (ולא בפורמט ספריא הפנימי, שהוא לרוב אנגלי: "Sanhedrin 26b").

### 6. המלצת כותרות ותתי-כותרות

זו משימת **סיכום מונחה-מבנה (structure-aware summarization)** ולא זיהוי-ישויות: המודל צריך לזהות חלוקה טבעית של הטקסט (למשל לפי נושא הלכתי, פרשה, סוגיה) ולהציע כותרת המבוססת על מוסכמות הסוגה התורנית (למשל "בענין...", "בביאור שיטת...", "בירור הלכה ל...", "פרק א' — ..."). כלי ה-**מפתח לשו"ת** של דיקטה — שמזהה נושאים אוטומטית ומפיק אינדקס CSV מספר שו"ת — הוא דוגמת-על מוכנה לגישה זו ([DICTA — מפתח לשו"ת](https://dicta.org.il/)), וניתן לשכפל את העיקרון (חלוקה לפסקאות ← זיהוי מילות-מפתח הלכתיות/תוכניות ← ניסוח כותרת בסגנון) בעזרת LLM עם system prompt מכוון-סגנון, בתוספת אימות מול DictaBERT/BEREL ל-NER הלכתי.

---

## חלק ג' — ארכיטקטורת AI על מאגר (RAG לתורה)

### 1. "הושבת" LLM על מאגר תורני — עקרונות RAG

הגישה הסטנדרטית ל-RAG (Retrieval-Augmented Generation) על טקסט מבני כמו ספרות תורנית שונה מ-RAG כללי בכמה מובנים:

- **Chunking לפי יחידת מ"מ טבעית, לא לפי גודל טוקנים קבוע.** טקסט תורני הוא כבר "מקוטע" באופן טבעי (פסוק, דף/עמוד גמרא, הלכה, סעיף בשו"ע). לכן ה-chunk האידאלי הוא ה-Ref עצמו (או קבוצת Refs קטנה, למשל "עמוד" גמרא שלם), ולא חלוקה עיוורת לפי אורך תווים כפי שנהוג ב-RAG כללי — כי חלוקה עיוורת "תשבור" יחידות הלכתיות אורגניות ותפגע בהקשר. מבנה ה-Index/Schema של ספריא (שכבר מגדיר ratio של book→chapter→verse) מספק את יחידת ה-chunking "בחינם".
- **מטא-דאטה עשירה על כל chunk** — יש לשמור בווקטור-DB את ה-Ref הקנוני, קטגוריה (תנ"ך/תלמוד/הלכה/וכו'), מחבר, שם ספר, וקישורים (links) לצורך retrieval דו-שכבתי: גם חיפוש סמנטי (embeddings) וגם חיפוש גרפי לפי קישורים ("הבא לי את כל הפרשנים על פסוק זה") — הגרף הזה כבר קיים אצל ספריא בLinks API.
- **Embeddings לעברית/ארמית תורנית:** מודלים כלליים רב-לשוניים כמו **multilingual-e5-large/base** ([arXiv 2402.05672](https://arxiv.org/abs/2402.05672)) או **OpenAI text-embedding-3** תומכים בעברית אך אומנו בעיקר על עברית מודרנית/אינטרנטית; ליישום תורני מומלץ לבחון embeddings שמקורם ב-**AlephBERT/DictaBERT/BEREL** (מודלים שהוכשרו/כוונו על עברית מקראית-רבנית) או fine-tuning ייעודי (כדוגמת **MiqraBERT** ל-Sentence-BERT על פסוקים מקראיים, [arXiv 2606.19638](https://arxiv.org/pdf/2606.19638v1.pdf)) לשיפור זיהוי מקבילות סמנטיות (parallel passages) ולא רק דמיון מילים.
- **Vector DB — pgvector על Supabase:** תומך בפעולות similarity search סטנדרטיות (`<->`, `<#>`, cosine) ישירות ב-SQL, כולל אינדקס HNSW ותמיכה ב-**iterative search** לשליפה מדויקת מספר תוצאות מבוקש ([Supabase pgvector docs](https://supabase.com/docs/guides/database/extensions/pgvector)). ארכיטקטורה טיפוסית: טבלה עם עמודות `ref`, `text_he`, `text_translation`, `category_path`, `embedding vector(N)`, ואינדקס HNSW על העמודה `embedding`; שכבת retrieval משולבת (hybrid search: BM25/full-text-search של Postgres + וקטור) לשיפור דיוק בשמות פרטיים/ראשי-תיבות שמדדי embedding מתקשים בהם.
- **Hybrid retrieval מומלץ** — שילוב חיפוש מבוסס-Ref/מטא-דאטה (מדויק) עם חיפוש וקטורי (סמנטי) ועם re-ranking (cross-encoder) לשיפור סדר התוצאות, כמומלץ בפרקטיקה הסטנדרטית של תעשיית ה-RAG ([Cadence blog: LLM hallucinations in production](https://cadence.withremote.ai/blog/llm-hallucinations-production)).

### 2. איך מוודאים ציטוט מדויק בלי הזיות — Grounding

זו הבעיה הקריטית ביותר עבור מוצר תורני, כי "הזיית מקור" (ציטוט לא-קיים או שגוי בשם ה' או חכם) היא כישלון חמור מבחינה תורנית ולא רק טכנית. הפרקטיקה המומלצת ומיושמת בפרויקטים דומים:

- **Tool-use / Function calling חובה, לא "ידע פנימי" של המודל.** יש לאסור על ה-LLM לצטט מהזיכרון הפנימי שלו ("training memory") ולחייבו לבצע קריאת פונקציה (tool call) שמחזירה את הטקסט המדויק ממאגר אמין (ספריא/DICTA), ולצטט רק את מה שהתקבל בפועל. זה העיקרון שמדגיש **Sefaria MCP** (`https://mcp.sefaria.org/sse`): "The AI isn't making up the quote anymore... it's a partner who has the book open in front of them" ([My Weird Prompts — AI Just Got a Library Card](https://www.myweirdprompts.com/episode/sefaria-mcp-ai-talmud/)). ספריא מריצה שני שרתי MCP רשמיים: **Sefaria Texts MCP** (לשליפת טקסטים וציטוטים מדויקים) ו-**Sefaria Developers MCP** (ל-API/קוד) ([The Sefaria MCPs](https://developers.sefaria.org/docs/the-sefaria-mcp)).
- **דרישת ציטוט חובה בפרומפט המערכת** — "every factual claim must attach a quoted source from the retrieved context, or the model refuses" — עיקרון production-grade נגד הזיות ([Cadence — handling hallucinations](https://cadence.withremote.ai/blog/llm-hallucinations-production)).
- **אימות שלאחר-הפקה (post-hoc verification)** — לאחר שה-LLM מפיק תשובה עם ציטוט, יש להריץ שוב את ה-Ref שצוטט מול ה-Linker/Texts API כבדיקת "second pass" שהטקסט שהוצג תואם בפועל את המקור.
- **Structured output / JSON schema** — לכפות על המודל להחזיר תשובה במבנה קבוע (כגון `{claim, ref, exact_quote, confidence}`) כדי לאפשר בדיקה מכנית אוטומטית שכל טענה מגובה ב-Ref אמיתי, ולא רק טקסט חופשי ("prose") שקשה לאמת ([Cadence — structured outputs](https://cadence.withremote.ai/blog/llm-hallucinations-production)).
- **הפרדת שכבות אחריות**: שכבת retrieval (חיפוש/שליפה) אמינה ודטרמיניסטית (API/DB), ושכבת generation (ניסוח/הסבר) שממנה לא נדרשת דיוק עובדתי אלא ניסוח — כאשר כל "עובדה" (מקור, שם חכם, תאריך) מגיעה מהשכבה הראשונה בלבד.

### 3. מודלים מתאימים

| שכבה | אפשרות מומלצת | הערות |
|---|---|---|
| LLM לניתוח/ניסוח | Claude Opus / Claude Sonnet (עם tool use) | חשיבה משפטית-תורנית מורכבת, יכולת tool-use מתקדמת, נתמך ע"י Sefaria MCP ישירות |
| Embeddings כלליים רב-לשוניים | multilingual-e5-large, OpenAI text-embedding-3-large | טובים ל"רשת ביטחון" כללית ותמיכה גם באנגלית |
| Embeddings ייעודיים לעברית תורנית | DictaBERT / BEREL / AlephBERTGimmel (embeddings שמופקים מהם) / MiqraBERT (מכוון לפסוקים) | לשיפור זיהוי מקבילות והקשר תורני-ספציפי |
| מודל ניקוד ייעודי | DICTA Nakdan הרבני (API) כברירת מחדל; D-Nikud/MenakBERT כגיבוי open-source | Nakdan הרבני מכוון ספציפית לעברית רבנית/תלמודית ולכן מדויק יותר לצורך זה |
| זיהוי ציטוטים/NER הלכתי | Sefaria Linker (BERT עברי) + DICTA Citation/Parallel Finder | שילוב שני מנועים משלימים לכיסוי מקסימלי |
| מודל שפה עברי מקומי (fallback/on-prem) | DictaLM 3.0 (1.7B–24B) | אלטרנטיבה עברית-נייטיבית אם נדרשת עצמאות ממודלים חוצי-לאום |

### 4. פרויקטים קיימים של AI+תורה — מפת שוק

| פרויקט | תיאור | טכנולוגיה נחשפת | קישור |
|---|---|---|---|
| **AI on Sefaria** | תוכנית רשמית של ספריא: תרגום מתקדם ע"י AI (בפיקוח עורך אנושי), כותרות והקדמות ל-Topic pages, Pirkei Avot Learning Guide (Gemini) | Claude 3.7 לתרגום, Google Gemini לסיכום פרשנים, שקיפות מלאה (סימון "AI" על תוכן) | [sefaria.org/ai](https://www.sefaria.org/ai) |
| **Sefaria MCP servers** | Texts MCP + Developers MCP — חיבור ישיר של Claude/ChatGPT/Cursor למאגר ספריא בפרוטוקול MCP סטנדרטי | Model Context Protocol (Anthropic) | [developers.sefaria.org/docs/the-sefaria-mcp](https://developers.sefaria.org/docs/the-sefaria-mcp) |
| **Virtual Havruta (AppliedAI)** | שיתוף פעולה Sefaria + TUM Venture Labs + appliedAI: RAG שמציג את דעות הזרמים (רפורמי/קונסרבטיבי/אורתודוקסי) עם מקורות, נועד למנוע הזיות | LLM-based RAG דומיין-ספציפי | [GitHub Sefaria/AppliedAI](https://github.com/Sefaria/AppliedAI) |
| **ChavrutAI** | פלטפורמת לימוד תלמוד עם חיתוך-משפטים חכם, מפת סוגיה, ומקורות מספריא | Sefaria API, LLM לחיתוך טקסט וסיכום | [chavrutai.com/about](https://chavrutai.com/about) |
| **Rav Dicta** | "רב וירטואלי" — משיב הלכתי מגובה-מקורות | RAG על ספרות רבנית קלאסית | [rav.dicta.org.il](https://rav.dicta.org.il) |
| **Rebbe.io** | תשובות מצוטטות ("cited answer") מתוך תנ"ך/תלמוד/שו"ע/רמב"ם | RAG, טוען "doesn't make things up" | [rebbe.io](https://rebbe.io/) |
| **Ask the Rambam (Sefaria tutorial)** | דוגמת קוד רשמית ל-RAG שעונה רק מתוך משנה תורה לרמב"ם | Tutorial פתוח | [Powered by Sefaria](https://developers.sefaria.org/docs/powered-by-sefaria) |
| **Mishneh AI / GoTorah / Torah Scholar (MCP skill)** | פלטפורמות למידה נוספות עם ציטוט מקורות מלא מספריא | Sefaria API/MCP | [Powered by Sefaria](https://developers.sefaria.org/docs/powered-by-sefaria) |
| **Otzaria MCP Server** | חיבור ספריית אוצריא ל-LLM בפרוטוקול MCP | MCP | [Jewish-Interest-MCP-Projects](https://github.com/danielrosehill/Jewish-Interest-MCP-Projects) |

**תובנה חשובה מהשוק:** ביקורת בלוג טכני (Jello Menorah) על ניסיון "חברותא" עם ChatGPT מצאה שהמודל "יכול לספק הרבה מהמידע שצריך ללמוד טקסט מתקדם, אבל הוא לא תופס את הטעויות שלך והופך לא-יציב אם מנסים לגרום לו לקחת יוזמה" — כלומר גם RAG טוב עדיין לא פותר את בעיית ה"חברותא האמיתית" (אתגור, הקשבה לטעויות המשתמש) ([Could AI be a good havruta? — Jello Menorah](https://www.jellomenorah.com/p/is-ai-a-good-havruta)). זה מרמז שגם "העורך התורני" (שהוא כלי עריכה ולא שיח חופשי) נמצא בעמדה נוחה יותר מבחינת אמינות מוצרי "רב וירטואלי" כלליים — כי מדובר במשימת אימות/הגהה ממוקדת ולא בשיחה פתוחה.

---

## סיכום — המלצות ארכיטקטורה ל"העורך התורני"

1. **בסיס טקסטואלי:** לבנות על **Sefaria-Export** (הורדה ל-Postgres/pgvector מקומי ב-Supabase, כדי לא להיות תלוי ב-rate limits של ה-API החיצוני) ולהעשיר מתוכן **DICTA** (הש"ס המנוקד, כלי ניקוד/פענוח-ראשי-תיבות) ומתכני **אוצריא** (טקסטים נוספים מעבר לספריא, בפרט ראשונים/אחרונים שאינם בספריא). לבדוק פרטנית רישיון כל טקסט לפני שילוב מסחרי (שדה `license` ב-JSON).
2. **זיהוי ציטוטים:** להשתמש ב-**Sefaria Linker API** (`/api/find-refs`) כשכבה ראשונה (מנוע BERT עברי מובנה, תומך ב"שם"/ibid, מחזיר Refs מדויקים וקישורים) ולשלב איתו את **DICTA Citation Finder / Parallel Finder** לכיסוי ציטוטים לא-מדויקים ומקבילות.
3. **אימות מקורות (anti-hallucination):** לכל טענה על ציטוט — **tool call חיצוני חובה** לשליפת הטקסט המקורי (לא הסתמכות על "ידע" המודל), השוואה מדויקת+מקורבת (diff/Levenshtein + embeddings), והחזרת סטטוס ("תואם"/"סטייה"/"לא נמצא") בפורמט JSON קבוע לאימות מכני.
4. **ניקוד:** להשתמש ב-**Nakdan הרבני של DICTA** כברירת מחדל (Genre=rabbinic), עם שכבת Review-and-Correct למשתמש (כי אף מודל לא מגיע ל-100%), ותמיכה בבחירת כתיב מלא/חסר.
5. **RAG:** Chunking לפי Ref טבעי (לא לפי טוקנים), מטא-דאטה עשירה (קטגוריה/מחבר/קישורים), **pgvector על Supabase** עם חיפוש היברידי (full-text + וקטור + re-ranking), Embeddings משולבים — כלליים (multilingual-e5/OpenAI) + ייעודיים-תורניים (DictaBERT/BEREL/MiqraBERT).
6. **מודל שפה:** **Claude Opus/Sonnet עם tool-use מלא** מול Sefaria MCP / DICTA APIs, המחייב ציטוט ממוקור-שנשלף בלבד ("book open in front of them", לא "מזיכרון").
7. **פורמט תוצר:** נורמליזציה של מ"מ בין הפורמט הקנוני (ספריא, אנגלי) לפורמט המקובל בעולם התורני (עברי, ראשי-תיבות מקוצרים — למשל "סנהדרין כ"ו ע"ב", "שו"ע או"ח סי'...") כשכבת תרגום נפרדת.
8. **בקרת אדם:** בכל הפונקציות (ניקוד, זיהוי ציטוט, כותרות) — ממשק Review-and-Approve ולא אוטומציה עיוורת; זה גם המודל שדיקטה עצמה נוקטת (Nakdan Pro) וגם עיקרון בטיחות מתחייב מאופי התוכן (קדושת הטקסט, אחריות הלכתית).

---

### רשימת מקורות מלאה (לפי סדר הופעה בטקסט)

- [Sefaria Developers Portal — Getting Started](https://developers.sefaria.org/reference/getting-started)
- [Sefaria-Export GitHub repository](https://github.com/Sefaria/Sefaria-Export)
- [Sefaria-Export CLAUDE.md — מבנה נתונים טכני](https://github.com/Sefaria/Sefaria-Export/blob/master/CLAUDE.md)
- [Sefaria-Export LICENSE.md](https://github.com/Sefaria/Sefaria-Export/blob/master/LICENSE.md)
- [Sefaria OpenAPI spec](https://github.com/Sefaria/Sefaria-Project/blob/master/docs/openAPI.json)
- [Sefaria API Documentation Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation/948bb3dcf283653163a2d0a6b88dca152cabaf76)
- [Sefaria FAQ — Frequently Asked Questions](https://developers.sefaria.org/reference/others-have-asked)
- [Sefaria Search API v2 Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/Search-API-(v2))
- [Sefaria Text References documentation](https://developers.sefaria.org/docs/text-references)
- [Sefaria-SQL GitHub](https://github.com/Sefaria/Sefaria-SQL)
- [The Sefaria Linker API documentation](https://developers.sefaria.org/docs/linker-api)
- [The Sefaria MCPs documentation](https://developers.sefaria.org/docs/the-sefaria-mcp)
- [Sivan22/mcp-sefaria-server GitHub](https://github.com/Sivan22/mcp-sefaria-server)
- [AI on Sefaria](https://www.sefaria.org/ai)
- [Powered by Sefaria — Projects List](https://developers.sefaria.org/docs/powered-by-sefaria)
- [GitHub Sefaria/AppliedAI — Virtual Havruta](https://github.com/Sefaria/AppliedAI)
- [My Weird Prompts — AI Just Got a Library Card to Ancient Jewish Texts](https://www.myweirdprompts.com/episode/sefaria-mcp-ai-talmud/)
- [Sivan22/otzaria GitHub](https://github.com/Sivan22/otzaria)
- [אוצריא — ויקיפדיה](https://info.org.il/wikipedia/%D7%90%D7%95%D7%A6%D7%A8%D7%99%D7%90.html)
- [Jewish-Interest-MCP-Projects (Otzaria MCP)](https://github.com/danielrosehill/Jewish-Interest-MCP-Projects)
- [אוצר החכמה — ויקיפדיה](https://he.wikipedia.org/wiki/%D7%90%D7%95%D7%A6%D7%A8_%D7%94%D7%97%D7%95%D7%9B%D7%9E%D7%94)
- [otzar.org — Otzar HaHochma](https://www.otzar.org/)
- [Otzar HaHochma Information for institutions](https://www.otzar.org/institgen.asp)
- [דיקטה — Wikiwand](https://www.wikiwand.com/he/articles/%D7%93%D7%99%D7%A7%D7%98%D7%94)
- [Dicta Tools page](https://dicta.org.il/tools?lang=en)
- [Digital Forum Showcase: DICTA](https://www.eurojewishstudies.org/digital-forum-showcase-reports/dicta-the-israel-center-for-text-analysis/)
- [DICTA homepage](https://dicta.org.il/?lang=en)
- [Talmud-Bavli-with-Nikud GitHub](https://github.com/Dicta-Israel-Center-for-Text-Analysis/Talmud-Bavli-with-Nikud)
- [Exploring Rav Dicta — Irrationalist Modoxism](https://irrationalistmodoxism.substack.com/p/exploring-rav-dicta-the-most-advanced)
- [Rebbe.io](https://rebbe.io/)
- [HebrewBooks — מיזם המכלול](https://www.hamichlol.org.il/HebrewBooks)
- [שו"ת בר-אילן — אודות](https://www.responsa.org.il/%D7%90%D7%95%D7%93%D7%95%D7%AA-%D7%A9%D7%95%D7%B4%D7%AA-%D7%91%D7%A8-%D7%90%D7%99%D7%9C%D7%9F/)
- [AlHaTorah.org — Concordance Guide](https://mg.alhatorah.org/Concordance_Guide)
- [Wikimedia Downloads](https://dumps.wikimedia.org/)
- [פרויקט בן-יהודה — API](https://benyehuda.org/page/api)
- [Nakdan: Professional Hebrew Diacritizer (DeepAI paper)](https://deepai.org/publication/nakdan-professional-hebrew-diacritizer)
- [Nakdimon — arXiv 2105.05209](https://arxiv.org/abs/2105.05209)
- [elazarg/nakdimon GitHub](https://github.com/elazarg/nakdimon)
- [D-Nikud — arXiv 2402.00075](https://arxiv.org/html/2402.00075v1)
- [NadavShaked/D_Nikud GitHub](https://github.com/NadavShaked/D_Nikud)
- [idoco/MenakBERT HuggingFace](https://huggingface.co/idoco/MenakBERT)
- [AlephBERT — arXiv 2104.04052](https://arxiv.org/abs/2104.04052)
- [onlplab/alephbert-base HuggingFace](https://huggingface.co/onlplab/alephbert-base)
- [AlephBERTGimmel — arXiv 2211.15199](https://arxiv.org/pdf/2211.15199.pdf)
- [avichaychriqui/HeBERT GitHub](https://github.com/avichaychriqui/HeBERT)
- [DictaBERT — arXiv 2308.16687](https://arxiv.org/abs/2308.16687)
- [dicta-il/dictabert HuggingFace](https://huggingface.co/dicta-il/dictabert)
- [dicta-il/dictabert-joint HuggingFace](https://huggingface.co/dicta-il/dictabert-joint)
- [Hebrew-AI-Models catalog — danielrosehill GitHub](https://github.com/danielrosehill/Hebrew-AI-Models)
- [MAFAT NNLP-IL Hebrew and Arabic NLP Resources](https://resources.nnlp-il.mafat.ai/?dc6e3d3b_page=2)
- [MiqraBERT — arXiv 2606.19638](https://arxiv.org/pdf/2606.19638v1.pdf)
- [Hebrew-Resources models_tools_services](https://github.com/NNLP-IL/Hebrew-Resources/blob/master/models_tools_services.rst)
- [מדריך לכתיבה תורנית — המכלול](https://www.hamichlol.org.il/%D7%94%D7%9E%D7%9B%D7%9C%D7%95%D7%9C:%D7%9E%D7%93%D7%A8%D7%99%D7%9A_%D7%9C%D7%9B%D7%AA%D7%99%D7%91%D7%94_%D7%AA%D7%95%D7%A8%D7%A0%D7%99%D7%AA)
- [מדריך הגהה — daat.ac.il](https://daat.ac.il/daat/kitveyet/beyt/9.doc)
- [כתיב מלא — ויקיפדיה](https://he.wikipedia.org/wiki/%D7%9B%D7%AA%D7%99%D7%91_%D7%9E%D7%9C%D7%90)
- [האקדמיה ללשון העברית — הכתיב המלא](https://hebrew-academy.org.il/topic/hahlatot/missingvocalizationspelling/)
- [עדכון כללי הכתיב המלא — Ynet](https://www.ynet.co.il/articles/0,7340,L-4977193,00.html)
- [Supabase pgvector documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Multilingual E5 Text Embeddings — arXiv 2402.05672](https://arxiv.org/abs/2402.05672)
- [Cadence — Handling LLM hallucinations in production](https://cadence.withremote.ai/blog/llm-hallucinations-production)
- [Could AI be a good havruta? — Jello Menorah](https://www.jellomenorah.com/p/is-ai-a-good-havruta)
- [ChavrutAI — About](https://chavrutai.com/about)
- [Talmud & Tech — Proposal for ChavrutAI](https://www.ezrabrand.com/p/proposal-for-chavrutai-an-ai-chavruta)
