import type { SourceRegistryItem } from './types';

// ==== מרשם המקורות (Source Registry) ====
// טבלת אמת יחידה של כל מקורות הנתונים. מסומן: חינם/בתשלום, זמינות API.
// כל שדה במערכת מצביע לכאן דרך sourceKey.

export const SOURCES: Record<string, SourceRegistryItem> = {
  /**
   * מה שהלקוח הזין בטופס.
   *
   * ⚠️ נוסף אחרי שהתגלה בדוח אמיתי: "מספר בית", "מספר חדרים", "קומת הדירה"
   * ו"מספר הכניסה" הוצגו עם המקור "המרכז למיפוי ישראל", בעוד שההערה שלהם
   * עצמה אמרה "כפי שהוזן בטופס". לזקוף קלט של הלקוח למרשם ממשלתי זו הצגה
   * שגויה של מקור — וזה בדיוק מה שהדוח הזה מתיימר לא לעשות.
   */
  user_input: {
    key: 'user_input',
    displayName: 'הוזן בטופס על ידי מבקש הדוח',
    publicName: 'מה שהזנתם בטופס',
    category: 'ממשלתי',
    isPaid: false,
    apiAvailable: false,
    url: '',
    refreshCadence: 'לפי בקשה',
    notes: 'קלט של המשתמש. אינו מאומת מול שום מרשם, ומסומן כך במפורש.',
    publicNotes: 'הנתון הזה הוא מה שכתבתם בטופס, ולא נתון שנשלף ממרשם.',
  },
  nadlan_gov: {
    key: 'nadlan_gov',
    displayName: 'אתר הנדל"ן הממשלתי (nadlan.gov.il)',
    publicName: 'אתר הנדל"ן הממשלתי',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://www.nadlan.gov.il',
    refreshCadence: 'עסקאות: שוטף · טאבו: עדכון לילי',
    notes: 'מאחד עסקאות מכר, שכירות ומידע סביבתי. REST לא רשמי.',
  },
  carmen: {
    key: 'carmen',
    displayName: 'כרמ"ן / מידע נדל"ן (רשות המסים)',
    publicName: 'רשות המסים — מרשם העסקאות',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://www.nadlan.gov.il',
    refreshCadence: 'שוטף (לפי דיווח)',
    notes: 'כל עסקאות המכר מ-1989: מחיר, שווי, גוש/חלקה, שטח, חדרים, קומה, שנה.',
  },
  govmap: {
    key: 'govmap',
    displayName: 'GovMap (מפ"י)',
    publicName: 'המרכז למיפוי ישראל',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://www.govmap.gov.il',
    refreshCadence: 'תב"ע כל 24 שעות',
    notes: 'גוש/חלקה, כתובות, בעלות, תב"ע, תשתיות. REST/JS + WMS/WFS.',
  },
  tabu: {
    key: 'tabu',
    displayName: 'טאבו — רשות רישום המקרקעין',
    category: 'ממשלתי',
    isPaid: true,
    costIls: '~15–131 ₪',
    apiAvailable: false,
    url: 'https://www.gov.il',
    refreshCadence: 'בזמן אמת (נכון ליום הפקה)',
    notes: 'נסח: בעלות, שעבודים, עיקולים, הערות אזהרה. PDF, אין API. לפי דרישה.',
  },
  rami: {
    key: 'rami',
    displayName: 'רשות מקרקעי ישראל (רמ"י)',
    category: 'ממשלתי',
    isPaid: true,
    costIls: 'אישור ~81 ₪',
    apiAvailable: false,
    url: 'https://www.gov.il/he/service/my-ramitech',
    refreshCadence: '—',
    notes: 'חכירות, זכויות, מכרזים. "רמ"י שלי" בהזדהות. 3 מאגרים ב-data.gov.il.',
  },
  xplan: {
    key: 'xplan',
    displayName: 'מנהל התכנון — XPLAN / mavat',
    publicName: 'מנהל התכנון',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://ags.iplan.gov.il',
    refreshCadence: 'שוטף',
    notes: 'תב"ע, ייעוד קרקע, זכויות בנייה, יח"ד. ArcGIS REST/WMS.',
  },
  rishui: {
    key: 'rishui',
    displayName: 'רישוי זמין — היתרי בנייה',
    category: 'ממשלתי',
    isPaid: true,
    costIls: 'אגרות',
    apiAvailable: false,
    url: 'https://www.gov.il',
    refreshCadence: '—',
    notes: 'מערכת סגורה — אין API ציבורי. בדיקת תיק בניין ידנית מול הוועדה.',
  },
  cbs: {
    key: 'cbs',
    displayName: 'הלשכה המרכזית לסטטיסטיקה (למ"ס)',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://api.cbs.gov.il',
    refreshCadence: 'מדד דירות דו-חודשי',
    notes: 'מדד מחירי דירות, תשומות בנייה, מחשבון הצמדה. API JSON/XML מלא.',
  },
  shuma: {
    key: 'shuma',
    displayName: 'אגף שומת מקרקעין (משפטים)',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://www.gov.il',
    refreshCadence: 'שוטף',
    notes: 'הכרעות שמאי מכריע (היטל השבחה/תוספות). PDF + CSV.',
  },
  datagov: {
    key: 'datagov',
    displayName: 'data.gov.il (CKAN)',
    publicName: 'מאגרי המידע הממשלתיים',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://data.gov.il',
    refreshCadence: 'עד יומי',
    notes: '1,194 מאגרים: נדל"ן, GIS, בתי"ס, תחבורה. CKAN Action API.',
  },
  mapi: {
    key: 'mapi',
    displayName: 'המרכז למיפוי ישראל (MAPI)',
    publicName: 'המרכז למיפוי ישראל',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם (מוצרים ייעודיים בתשלום)',
    apiAvailable: true,
    url: 'https://www.govmap.gov.il',
    refreshCadence: 'עדכוני קדסטר',
    notes: 'קדסטר, גושים/חלקות, תצלומי אוויר. SHP + WMS/WFS.',
  },
  hitchadshut: {
    key: 'hitchadshut',
    displayName: 'הרשות להתחדשות עירונית',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://www.gov.il',
    refreshCadence: 'עדכון חודשי',
    notes: '934 מתחמי פינוי-בינוי + תמ"א 38. Shapefile/CSV + GIS.',
  },
  yadata: {
    key: 'yadata',
    displayName: 'Yadata (יד2)',
    publicName: 'יד2',
    category: 'מסחרי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: false,
    url: 'https://yadata.yad2.co.il',
    refreshCadence: 'שוטף',
    notes: 'מחשבון שווי, מדדי שוק, אחוז התפשרות. מחירי ביקוש (לא סגירה).',
  },
  madlan: {
    key: 'madlan',
    displayName: 'מדלן (Madlan)',
    publicName: 'מדלן',
    category: 'מסחרי',
    isPaid: false,
    costIls: 'חינם + מנוי מקצוענים',
    apiAvailable: false,
    url: 'https://www.madlan.co.il',
    refreshCadence: 'שוטף',
    notes: 'לוח + נתוני עסקאות רשמיים + מערכת BI. אין ציון השקעה.',
  },
  homeless: {
    key: 'homeless',
    displayName: 'הומלס (Homeless)',
    publicName: 'הומלס',
    category: 'מסחרי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: false,
    url: 'https://www.homeless.co.il',
    refreshCadence: 'שוטף',
    notes: 'לוח מודעות רב-קטגוריות. אין נתונים/ניתוח.',
  },
  winwin: {
    key: 'winwin',
    displayName: 'WinWin',
    category: 'מסחרי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: false,
    url: 'https://www.winwin.co.il',
    refreshCadence: 'שוטף',
    notes: 'לוח + מחירון מבוסס עסקאות רשמיות מ-1998.',
  },
  google_maps: {
    key: 'google_maps',
    displayName: 'Google Maps',
    publicName: 'מפות גוגל',
    category: 'מסחרי',
    isPaid: true,
    costIls: 'לפי שימוש (~0.02–0.10 ₪ לקריאה)',
    apiAvailable: true,
    url: 'https://developers.google.com/maps',
    refreshCadence: 'בזמן אמת',
    notes:
      'מוסדות בשם ובמרחק מדויק (Places), זמן הליכה/נסיעה (Distance Matrix), ' +
      'צילום הבניין (Street View) ומפה. נבדק חי 28/07/2026 — מחזיר עברית מלאה.',
  },
  apify_yad2: {
    key: 'apify_yad2',
    displayName: 'יד2 — דירות המוצעות כרגע (דרך Apify)',
    publicName: 'לוח יד2',
    category: 'מסחרי',
    isPaid: true,
    costIls: '$0.005 לכל מודעה',
    apiAvailable: true,
    url: 'https://apify.com/swerve/yad2-scraper',
    refreshCadence: 'בזמן אמת (בכל הפקת דוח)',
    notes:
      'מחירי ביקוש — לא מחירי סגירה. כולל firstSeen (מתי המודעה עלתה) ' +
      'ולכן מאפשר היסטוריית פרסום. ללא APIFY_TOKEN → "דורש מקור מורשה".',
  },
  apify_madlan: {
    key: 'apify_madlan',
    displayName: 'מדלן — דירות המוצעות כרגע (דרך Apify)',
    publicName: 'לוח מדלן',
    category: 'מסחרי',
    isPaid: true,
    costIls: '$0.002 לכל מודעה',
    apiAvailable: true,
    url: 'https://apify.com/swerve/madlan-scraper',
    refreshCadence: 'בזמן אמת (בכל הפקת דוח)',
    notes:
      'מחירי ביקוש — לא מחירי סגירה. מחזיר lat/lng, מחיר למ"ר, קומה, שנת בנייה ' +
      'ו-firstSeen. נבדק חי 28/07/2026.',
  },
  elections: {
    key: 'elections',
    displayName: 'ועדת הבחירות המרכזית — תוצאות לפי קלפי (data.gov.il)',
    // ⚠️ הפילוח המגזרי מוצג ללקוח כהערכה, בלי לחשוף ממה הוא נגזר. השם המלא
    // נשמר ב-displayName למרכז השליטה; העמוד הציבורי מציג את publicName.
    publicName: 'מאגרים ממשלתיים לאפיון אוכלוסייה (data.gov.il)',
    publicNotes:
      'משמש לאפיון מגזרי של הסביבה ברמת השכונה. תמיד מוצג כהערכה — הוא מתאר את אופי האזור ולא את דיירי הבניין.',
    category: 'ממשלתי',
    isPaid: false,
    costIls: 'חינם',
    apiAvailable: true,
    url: 'https://data.gov.il/dataset/votes-knesset',
    refreshCadence: 'לכל מערכת בחירות',
    notes:
      'תוצאות אמת לכנסת ה-25 לפי קלפיות (12,545 שורות) + מיקומי הקלפיות עם רחוב ומספר ' +
      '(10,148 שורות). משמש לאפיון אוכלוסייה ברמת השכונה — תמיד מסומן "מקורב", ' +
      'כי הקלפי הקרובה אינה בהכרח זו שמשרתת את הכתובת.',
  },
};

export const SOURCE_LIST: SourceRegistryItem[] = Object.values(SOURCES);

/**
 * שמות מקוצרים שהמנוע משתמש בהם בפועל, אל המפתח במרשם.
 *
 * ⚠️ נמצא בבדיקה של הדוח מול העין: `sourceKey: 'nadlan'` ו-`'apify'` אינם
 * מפתחות במרשם, ולכן שורת המקור נפלה לברירת המחדל והציגה ללקוח **את המפתח
 * הטכני באנגלית** — "מקור: nadlan", "מקור: gtfs". בדוח שכל הרעיון שלו הוא
 * מקור לכל נתון, זו בדיוק השורה שאסור שתישבר.
 */
const SOURCE_ALIASES: Record<string, string> = {
  nadlan: 'nadlan_gov',
  apify: 'apify_yad2',
  google: 'google_maps',
  gtfs: 'datagov',
  cadastre: 'govmap',
};

export function sourceOf(key: string): SourceRegistryItem | undefined {
  return SOURCES[key] ?? SOURCES[SOURCE_ALIASES[key] ?? ''];
}
