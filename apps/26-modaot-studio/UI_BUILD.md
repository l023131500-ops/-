# משימת בנייה: ממשק ה-UI המלא (הפרונט) — מנוע מודעות חרדי

## הקשר — מה כבר קיים ומוכן (אל תבנה מחדש!)
כל התשתית בנויה ועובדת. אתה בונה **רק את שכבת ה-UI/React** מעליה.
- `shared/layers.ts` — סכמת השכבות (TextLayer/ImageLayer/ShapeLayer/DecorationLayer, TemplateDoc). קרא אותו!
- `shared/templates.ts` — 4 תבניות מובנות (TEMPLATE_DEFS).
- `shared/styles.ts` — STYLES (5), FONTS (6), getStyle.
- `shared/formats.ts` — FORMATS (6), getFormat.
- `shared/knowledge.ts` — KNOWLEDGE_BASE (20 קטגוריות), GROUPS (4), getCategory. כל קטגוריה: fields[], copyExamples[], honorifics[], symbols[], defaultStyle, sensitivity[].
- `client/src/components/CanvasStage.tsx` — **מנוע הרינדור החי מוכן!** מקבל props: doc, selectedId, onSelect, onChangeLayer, maxDisplayWidth, stageRef, interactive. מרנדר TemplateDoc לקנבאס עם auto-fit. השתמש בו כמו שהוא.
- `client/src/lib/autofit.ts` — fitText, wrapText, ensureFontsLoaded.
- `client/src/lib/copyEngine.ts` — getCategoryCopy, getCategoryFields, applyCategoryDefaults, setFieldText, suggestCopyAI.
- `client/src/lib/exporter.ts` — downloadPNG(stage, fullWidth, filename), downloadPDF(stage, fullWidth, fullHeight, filename), stageThumbnail.
- `client/src/lib/ornaments.ts` — עיטורי SVG.
- פונטים עבריים טעונים ב-index.css (Frank Ruhl Libre, David Libre, Heebo, Assistant, Rubik, Amatic SC). RTL כבר מוגדר.
- **Backend מוכן ורץ על 5000**: 
  - GET /api/meta → {styles, formats, knowledge, groups}
  - GET /api/templates → תבניות מובנות (עם layersJson כ-string, יש לעשות JSON.parse)
  - GET/POST/PATCH/DELETE /api/projects → CRUD פרויקטים
  - POST /api/ai/background {prompt, aspectRatio, enhance} → {dataUrl} או שגיאה {error, fallback:true} (429 חסום כרגע בחיוב — טפל בחן)

## מה לבנות (client/src/)
### App.tsx — routing (hash)
עטוף Switch ב-`<Router hook={useHashLocation}>`. עמודים:
- `/` → Home (בחירת נקודת כניסה + גלריית תבניות)
- `/editor` → Editor (העורך החי)

### עמוד Home (`pages/Home.tsx`)
מסך פתיחה מרשים בעברית RTL, אווירה חרדית-מכובדת (רקע כהה/נייבי, מגע זהב):
1. כותרת/לוגו: "מודעות · מנוע העיצוב החרדי"
2. שלוש נקודות כניסה (כרטיסים): "צור מודעה חדשה" (בחר קבוצה→קטגוריה→סגנון→פורמט), "התחל מקופי" (הזן טקסט→בחר עיצוב), "בחר תבנית מוכנה".
3. **גלריית תבניות**: משוך /api/templates, לכל תבנית רנדר תצוגה מקדימה קטנה עם `<CanvasStage doc={parsed} interactive={false} maxDisplayWidth={220}/>`, כותרת (name + label הסגנון). לחיצה → פותחת עורך עם התבנית.
4. מסנן לפי קבוצה (טאבים: שיעורי תורה / מעגל החיים / מעגל השנה / אירועים).
מכיוון שרוב התבניות המובנות הן שיעור תורה (POC) — הצג בבירור שהמיקוד הנוכחי הוא שיעורי תורה, ושאר הקטגוריות "בקרוב" (הבסיס-ידע קיים לכולן).

### עמוד Editor (`pages/Editor.tsx`) — הלב
קבל את התבנית שנבחרה דרך state (השתמש ב-Context או ב-query param עם id; **אל תשתמש ב-localStorage** — חסום). פריסה: פאנל צד ימין (שדות+שכבות) + קנבאס מרכזי + סרגל עליון (כותרת, שינוי פורמט, כפתורי ייצוא).

state מרכזי: `doc: TemplateDoc` (מ-useState). כל שינוי שכבה מעדכן את doc ומרנדר מחדש חי.
- **CanvasStage** במרכז עם stageRef (useRef<Konva.Stage>), onSelect, onChangeLayer שמעדכן את doc.
- **פאנל שדות חכם** (לפי הקטגוריה, getCategoryFields): לכל field קלט טקסט בעברית עם label ו-placeholder. שינוי → setFieldText(doc, fieldName, value) → עדכון חי בקנבאס. כשנכנסים לעורך, מלא ברירות מחדל עם applyCategoryDefaults.
- **כפתור "הצע קופי"**: פותח דיאלוג עם copyExamples מהקטגוריה (getCategoryCopy). לחיצה על דוגמה → ממלאת את שדה הכותרת/גוף המתאים. הצג גם honorifics ו-symbols כ"טיפים" של הקטגוריה.
- **פאנל שכבות**: רשימת doc.layers (טקסט/תמונה). בחירת שכבת טקסט → עורך פונט (Select מ-FONTS), גודל (Slider), עובי (400/700/900), צבע (color input + פלטת הסגנון), יישור (ימין/מרכז/שמאל). עדכון → onChangeLayer.
- **העלאת תמונה**: input file → FileReader.readAsDataURL → מציב ב-src של שכבת ה-image שסומנה כ-placeholder (תמונת הרב). כפתור "העלה תמונת הרב".
- **כפתור "רקע AI"**: דיאלוג עם שדה תיאור (ברירת מחדל לפי הסגנון, למשל "רקע יודאיקה נייבי עם עיטורי זהב, ללא טקסט"). POST /api/ai/background. בהצלחה → מציב dataUrl ב-doc.background (type:image, src). בכשל (fallback:true) → הצג toast ידידותי "מנוע ה-AI דורש הפעלת חיוב — נעשה שימוש ברקע המובנה" ואל תשנה את הרקע.
- **החלפת פורמט**: Select מ-FORMATS. בשינוי — פשוט עדכן width/height של doc (התבניות בנויות ל-1080×1350; מספיק לעדכן מידות והקנבאס יתאים; אין צורך במיקום מחדש מורכב ל-POC, אבל שמור יחס).
- **כפתורי ייצוא**: "הורד PNG" → downloadPNG(stageRef.current, doc.width). "הורד PDF" → downloadPDF(stageRef.current, doc.width, doc.height). "שמור פרויקט" → POST/PATCH /api/projects עם layersJson=JSON.stringify({background,layers}).

## עיצוב הממשק (chrome) — לא המודעה עצמה
ממשק העורך בעברית RTL, מקצועי, כהה-אלגנטי (רקע slate/נייבי כהה, אקצנט זהב #C9A227, טקסט בהיר). שתמש ב-shadcn (Card, Button, Select, Slider, Tabs, Dialog, Input, Textarea, Label, toast). אייקונים מ-lucide-react. text-xl מקסימום לכותרות ממשק. נקי ומרווח.

## דרישות איכות
- RTL מלא, עברית מושלמת, ללא טקסט אנגלי בממשק.
- הקנבאס חייב לרנדר את התבניות המובנות יפה (כותרת ענקית, מסגרת זהב, עיטורים) — כמו עבודת מעצב.
- עריכת טקסט משנה את הקנבאס בזמן אמת עם auto-fit (הטקסט לא חורג).
- ייצוא PNG/PDF עובד ברזולוציה מלאה.
- אל תשתמש ב-localStorage/sessionStorage/cookies (חסום ב-iframe). state ב-React + backend בלבד.
- react-konva כבר מותקן (18.2.10). jspdf, use-image מותקנים.

## בדיקה (חובה)
לאחר הבנייה, הרץ `npm run dev` (כבר רץ על 5000) ובדוק עם Playwright דרך js_repl:
1. טען את localhost:5000, צלם את ה-Home.
2. פתח עורך של תבנית שיעור, צלם.
3. שנה טקסט בשדה, ודא שהקנבאס מתעדכן, צלם.
תקן כל בעיה ויזואלית (טקסט חורג/נשבר, פונט לא נטען, RTL הפוך) לפני סיום.
כשמסיים — כתוב סיכום קצר של מה שנבנה ומצב הבדיקות. אל תפרוס (deploy) — המנהל יפרוס.
