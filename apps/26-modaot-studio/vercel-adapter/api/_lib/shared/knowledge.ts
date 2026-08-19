// בסיס-ידע מובנה — מבוסס על מחקר research/kb_lifecycle.md, kb_yearcycle.md, kb_shiurim_events.md
// כל דוגמת קופי אותנטית ומצוטטת ממקור. אין המצאות.

export interface CopyExample {
  text: string;
  source: string; // URL
}

export interface KBField {
  name: string;
  label: string;
  placeholder: string;
  role: "title" | "subtitle" | "body" | "field";
  multiline?: boolean;
}

export interface KBCategory {
  key: string;
  label: string;
  group: "shiurim" | "lifecycle" | "yearcycle" | "events";
  icon: string; // lucide icon name
  defaultStyle: string;
  fields: KBField[];
  honorifics: string[];
  symbols: string[];
  copyExamples: CopyExample[];
  sensitivity: string[];
}

const GL = "https://grapholike.com/cat_ecard/%D7%A9%D7%99%D7%A2%D7%95%D7%A8%D7%99%D7%9D/";

export const KNOWLEDGE_BASE: KBCategory[] = [
  // ========================= שיעורי תורה (מיקוד POC) =========================
  {
    key: "shiur_daf_yomi",
    label: "דף יומי",
    group: "shiurim",
    icon: "BookOpen",
    defaultStyle: "modern_torani",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור דף היומי", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הרב משה כהן שליט\"א", role: "field" },
      { name: "topic", label: "מסכת ודף", placeholder: "מסכת מנחות דף סא", role: "field" },
      { name: "time", label: "זמן", placeholder: "מדי יום בשעה 20:00", role: "field" },
      { name: "place", label: "מקום", placeholder: "בית המדרש 'עטרת משה'", role: "field" },
    ],
    honorifics: ["שליט\"א", "הרב", "הגאון", "המג\"ש"],
    symbols: ["ארון קודש", "ספרי גמרא", "מנורה"],
    copyExamples: [
      { text: "השיעור בבית מדרשנו יתחיל ביום חמישי בשעה 8.00 ע\"י המג\"ש משה כהן שליט\"א בואו והצטרפו לתחילת המסכתא", source: GL },
      { text: "דף היומי — מנחות דף סא עמוד א, אחרי המשנה משנה ברורה בסוף השיעור", source: "https://www.youtube.com/watch?v=raeUngYN-nA" },
      { text: "עשרות אלפים בכל רחבי העולם היהודי מתחילים היום בלימוד, הצטרפו לשיעור הקבוע", source: "https://www.dirshu.co.il/446328-2/" },
    ],
    sensitivity: ["ללא תמונות נשים", "שמירה על נוסח מכובד"],
  },
  {
    key: "shiur_gemara",
    label: "שיעור גמרא / עיון",
    group: "shiurim",
    icon: "BookOpen",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור עיון בגמרא", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הגאון רבי יעקב לוי שליט\"א", role: "field" },
      { name: "topic", label: "נושא", placeholder: "מסכת בבא קמא — סוגיית 'שור שנגח'", role: "field" },
      { name: "time", label: "זמן", placeholder: "בין מנחה למעריב", role: "field" },
      { name: "place", label: "מקום", placeholder: "היכל הישיבה", role: "field" },
    ],
    honorifics: ["שליט\"א", "הגאון", "מורנו", "ראש הישיבה"],
    symbols: ["ארון קודש", "עמוד", "ספרים"],
    copyExamples: [
      { text: "ישבעו ויתענגו מטובך — שיעור עיון קבוע לזיכוי הרבים", source: GL },
      { text: "בעז\"ה יתקיים שיעור עיון עמוק ע\"י מורנו הגאון שליט\"א, בואו ונתעלה יחד", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "shiur_halacha",
    label: "שיעור הלכה",
    group: "shiurim",
    icon: "Scroll",
    defaultStyle: "modern_torani",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "ישמח לב מבקשי השם", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעורי הלכה למעשה", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הרב יואל שפיגליץ שליט\"א", role: "field" },
      { name: "topic", label: "נושא", placeholder: "הלכות הפסח", role: "field" },
      { name: "time", label: "זמן", placeholder: "מיום חמישי ר\"ח ניסן, בין מנחה למעריב", role: "field" },
      { name: "place", label: "מקום", placeholder: "ביהכ\"נ 'עטרת משה'", role: "field" },
    ],
    honorifics: ["שליט\"א", "מורנו", "הגאון", "מורה הוראה"],
    symbols: ["שולחן ערוך", "משנה ברורה", "ארון קודש"],
    copyExamples: [
      { text: "ישמח לב מבקשי השם, הננו להודיע שבעז\"ה יתקיימו שיעורים להלכה ולמעשה, בהלכות הפסח מיום חמישי ר\"ח ניסן ע\"י מורנו הגאון שליט\"א בין מנחה למעריב", source: GL },
      { text: "הדף היומי בהלכה — הצטרפו למחזור הלימוד, למידע על שיעור באזורך התקשרו 02-5609000", source: "https://www.dirshu.co.il/446328-2/" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "shiur_mussar",
    label: "שיעור מוסר",
    group: "shiurim",
    icon: "Heart",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור התעוררות ומוסר", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הגה\"צ רבי נחמן בריקמן שליט\"א", role: "field" },
      { name: "topic", label: "נושא", placeholder: "הכנה לימים הנוראים", role: "field" },
      { name: "time", label: "זמן", placeholder: "מוצאי שבת בשעה 21:00", role: "field" },
      { name: "place", label: "מקום", placeholder: "ביהמ\"ד לדופקי בתשובה", role: "field" },
    ],
    honorifics: ["שליט\"א", "הגה\"צ", "הרה\"צ", "המשגיח"],
    symbols: ["נר", "ספרי מוסר", "רקע כהה"],
    copyExamples: [
      { text: "שיעור הכנה לימים הנוראים בביהמ\"ד לדופקי בתשובה, לאחר השיעור יערך סליחות עם שופרות ומעמד 'התרת קללות'", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים", "טון רציני ומכובד"],
  },
  {
    key: "shiur_chasidut",
    label: "שיעור חסידות",
    group: "shiurim",
    icon: "Flame",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור בפנימיות התורה", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הרב עופר מיודובניק שליט\"א", role: "field" },
      { name: "topic", label: "נושא", placeholder: "מאמרי חסידות — 'חסידות בוקר'", role: "field" },
      { name: "time", label: "זמן", placeholder: "כל בוקר לפני התפילה", role: "field" },
      { name: "place", label: "מקום", placeholder: "בית המדרש", role: "field" },
    ],
    honorifics: ["שליט\"א", "הרב", "האדמו\"ר", "הרה\"ח"],
    symbols: ["אש/להבה", "ספרי חסידות", "רקע מלכותי"],
    copyExamples: [
      { text: "שיעור קבוע בפנימיות התורה — התעלות רוחנית מדי בוקר, בואו וטעמו מתיקות התורה", source: "https://www.youtube.com/watch?v=mbrdGiJWtjs" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "shiur_parsha",
    label: "שיעור פרשת שבוע",
    group: "shiurim",
    icon: "Scroll",
    defaultStyle: "modern_torani",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור פרשת השבוע", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הרב דוד אזולאי שליט\"א", role: "field" },
      { name: "topic", label: "פרשה", placeholder: "פרשת וירא", role: "field" },
      { name: "time", label: "זמן", placeholder: "כל יום שישי בשעה 10:00", role: "field" },
      { name: "place", label: "מקום", placeholder: "בית הכנסת הגדול", role: "field" },
    ],
    honorifics: ["שליט\"א", "הרב", "הגאון"],
    symbols: ["ספר תורה", "ארון קודש"],
    copyExamples: [
      { text: "שיעור שבועי בפרשת השבוע — רעיונות ומוסר השכל לחיים, פתוח לקהל הרחב", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "shiur_women",
    label: "שיעור לנשים",
    group: "shiurim",
    icon: "Users",
    defaultStyle: "modern_torani",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור לנשים", role: "title" },
      { name: "maggid", label: "שם המרצה", placeholder: "הרבנית פייגא שטרן תחי'", role: "field" },
      { name: "topic", label: "נושא", placeholder: "הלכות טהרת המשפחה / אמונה ובטחון", role: "field" },
      { name: "time", label: "זמן", placeholder: "יום שלישי בשעה 20:30", role: "field" },
      { name: "place", label: "מקום", placeholder: "אולם הסמינר", role: "field" },
    ],
    honorifics: ["תחי'", "הרבנית", "מרת"],
    symbols: ["פרחים עדינים", "עיטור נשי צנוע"],
    copyExamples: [
      { text: "שיעור מיוחד לנשים — התחזקות באמונה ובטחון, בואי והתעלי, כיבוד קל יוגש", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים — עיטורים בלבד", "ניסוח מכובד לקהל נשי"],
  },
  {
    key: "shiur_youth",
    label: "שיעור לנוער / בחורים",
    group: "shiurim",
    icon: "Users",
    defaultStyle: "modern_torani",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שיעור לבחורי הישיבה", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הרב אליהו כהן שליט\"א", role: "field" },
      { name: "topic", label: "נושא", placeholder: "סוגיות בעיון", role: "field" },
      { name: "time", label: "זמן", placeholder: "מוצ\"ש 21:30", role: "field" },
      { name: "place", label: "מקום", placeholder: "היכל הישיבה", role: "field" },
    ],
    honorifics: ["שליט\"א", "הרב", "ר\"מ"],
    symbols: ["ספרים", "אנרגיה צעירה"],
    copyExamples: [
      { text: "שיעור מיוחד לבחורים — בעיון ובעמקות, הצטרפו וגדלו בתורה", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "shiur_series",
    label: "סדרת שיעורים / מחזור",
    group: "shiurim",
    icon: "Layers",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "פתיחת מחזור לימוד חדש", role: "title" },
      { name: "maggid", label: "שם המגיד", placeholder: "הגאון רבי משה שטרן שליט\"א", role: "field" },
      { name: "topic", label: "נושא הסדרה", placeholder: "מחזור חדש בלימוד הדף היומי", role: "field" },
      { name: "time", label: "זמני המפגשים", placeholder: "מדי ערב, החל מיום ראשון", role: "field" },
      { name: "place", label: "מקום", placeholder: "בית המדרש המרכזי", role: "field" },
    ],
    honorifics: ["שליט\"א", "הגאון", "מורנו"],
    symbols: ["לוח לימוד", "גריד ימים"],
    copyExamples: [
      { text: "בשעה טובה ומוצלחת — פתיחת מחזור לימוד חדש, זה הזמן להצטרף ולהתחיל מבראשית", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "siyum_masechet",
    label: "סיום מסכת / הדרן",
    group: "shiurim",
    icon: "PartyPopper",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "הדרן עלך", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "מעמד סיום מסכת", role: "title" },
      { name: "topic", label: "המסכת", placeholder: "מסכת ברכות", role: "field" },
      { name: "maggid", label: "בהשתתפות", placeholder: "מרנן ורבנן גדולי ישראל שליט\"א", role: "field" },
      { name: "time", label: "זמן", placeholder: "אי\"ה במוצאי שבת", role: "field" },
      { name: "place", label: "מקום", placeholder: "באולמי 'ארמונות חן'", role: "field" },
    ],
    honorifics: ["שליט\"א", "מרנן ורבנן", "הגאון"],
    symbols: ["זר דפנה", "כתר תורה", "עיטור חגיגי"],
    copyExamples: [
      { text: "הדרן עלך והדרך עלן — בשמחה ובהודיה נחוג את סיום המסכת, בואו ונשמח בשמחת התורה", source: GL },
      { text: "מעמד סיום מסכת מפואר בהשתתפות מרנן ורבנן גדולי ישראל שליט\"א", source: GL },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },

  // ========================= מעגל החיים (מפתח) =========================
  {
    key: "wedding_chasidic",
    label: "חתונה חסידית",
    group: "lifecycle",
    icon: "Heart",
    defaultStyle: "malchut",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "הכותרת", placeholder: "בשמחה נודיע על נישואי ילדינו", role: "title" },
      { name: "chatan", label: "החתן", placeholder: "החתן היקר כמר יוסף נ\"י", role: "field" },
      { name: "kala", label: "הכלה", placeholder: "עב\"ג הכלה המהוללה תחי'", role: "field" },
      { name: "parents", label: "ההורים", placeholder: "משפחת כהן ומשפחת לוי", role: "field" },
      { name: "when", label: "מתי", placeholder: "אי\"ה ביום שלישי כ\"ה אדר", role: "field" },
      { name: "where", label: "היכן", placeholder: "באולמי 'היכל הפאר'", role: "field" },
    ],
    honorifics: ["נ\"י", "שיחי'", "תחי'", "שתחי'", "עב\"ג"],
    symbols: ["רימון", "מגן דוד", "עץ חיים", "עיטור זהב מלכותי"],
    copyExamples: [
      { text: "בס\"ד. אך שמחה וששון — הננו מתכבדים להזמין את כבודכם להשתתף בשמחת נישואי ילדינו", source: "https://grapholike.com" },
      { text: "ברוב שמחה והודיה להשי\"ת נודיע על החתונה בשעה טובה ומוצלחת של החתן היקר נ\"י עב\"ג הכלה המהוללה תחי'", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונת הכלה", "לשון 'הזמנה' מכובדת", "כינויי כבוד מדויקים"],
  },
  {
    key: "petira",
    label: "מודעת אבל / פטירה",
    group: "lifecycle",
    icon: "Frame",
    defaultStyle: "evel",
    fields: [
      { name: "opener", label: "פתיח קבוע", placeholder: "ברוך דיין האמת", role: "subtitle" },
      { name: "name", label: "שם הנפטר + שם האב", placeholder: "ר' אברהם בן ר' יצחק ז\"ל", role: "title" },
      { name: "titles", label: "תארים", placeholder: "איש תם וישר, ירא שמים", role: "field", multiline: true },
      { name: "dates", label: "תאריך פטירה", placeholder: "נלב\"ע ביום שני י\"ד סיון תשפ\"ו", role: "field" },
      { name: "levaya", label: "פרטי הלוויה", placeholder: "הלוויה תצא היום בשעה 14:00 מבית ההספד 'שמגר'", role: "field", multiline: true },
      { name: "mourners", label: "האבלים", placeholder: "המשפחה האבלה", role: "field", multiline: true },
      { name: "closer", label: "סיום קבוע", placeholder: "ת.נ.צ.ב.ה", role: "field" },
    ],
    honorifics: ["ז\"ל", "זצ\"ל", "ע\"ה", "זצוק\"ל"],
    symbols: ["מסגרת שחורה עבה — ללא קישוטים"],
    copyExamples: [
      { text: "ברוך דיין האמת — בלב כואב אנו מודיעים על פטירת יקירנו", source: "https://grapholike.com" },
    ],
    sensitivity: ["שחור-לבן בלבד", "ללא תמונת נפטר", "מבנה קבוע: בדה\"א→שם+אב→ז\"ל→תאריכים→לוויה→אבלים→ת.נ.צ.ב.ה", "מסגרת שחורה עבה ללא עיטורים"],
  },
  {
    key: "bar_mitzvah",
    label: "בר מצווה",
    group: "lifecycle",
    icon: "PartyPopper",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "שמחת בר המצווה", role: "title" },
      { name: "boy", label: "שם הבחור", placeholder: "הבחור החשוב יעקב נ\"י", role: "field" },
      { name: "parents", label: "ההורים", placeholder: "לבן משפחת כהן", role: "field" },
      { name: "when", label: "מתי", placeholder: "אי\"ה ביום ראשון", role: "field" },
      { name: "where", label: "היכן", placeholder: "באולם 'שערי שמחה'", role: "field" },
    ],
    honorifics: ["נ\"י", "שיחי'"],
    symbols: ["תפילין", "טלית", "ספר תורה"],
    copyExamples: [
      { text: "בס\"ד. בשמחה רבה נזמינכם לשמחת עלייתו לתורה ומצוות של בננו היקר נ\"י", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "pidyon_nefesh",
    label: "פדיון נפש",
    group: "lifecycle",
    icon: "Scroll",
    defaultStyle: "classic",
    fields: [
      { name: "opener", label: "פתיחה", placeholder: "אנא לעורר רחמים רבים", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "פדיון נפש", role: "title" },
      { name: "name", label: "שם + שם האם", placeholder: "עבור פלוני בן פלונית", role: "field" },
      { name: "request", label: "הבקשה", placeholder: "לרפואה שלמה / להצלחה / לישועה", role: "field", multiline: true },
    ],
    honorifics: [],
    symbols: ["פורמט מכתב", "כתב יד מסורתי"],
    copyExamples: [
      { text: "אנא לעורר רחמים רבים וחסדים גמורים על הנפש רוח ונשמה של פלוני בן פלונית", source: "https://grapholike.com" },
    ],
    sensitivity: ["פורמט מכתב פשוט ומכובד", "שם ושם האם"],
  },

  // ========================= מעגל השנה (מפתח) =========================
  {
    key: "rosh_hashana",
    label: "ברכת ראש השנה",
    group: "yearcycle",
    icon: "Sparkles",
    defaultStyle: "malchut",
    fields: [
      { name: "greeting", label: "הברכה", placeholder: "שנה טובה ומתוקה תכתבו ותחתמו", role: "title" },
      { name: "from", label: "מאת", placeholder: "משפחת / מוסדות ...", role: "field" },
      { name: "wish", label: "איחול נוסף", placeholder: "כתיבה וחתימה טובה", role: "subtitle" },
    ],
    honorifics: [],
    symbols: ["שופר", "רימון", "תפוח ודבש", "כתר"],
    copyExamples: [
      { text: "שנה טובה ומתוקה תכתבו ותחתמו", source: "https://grapholike.com" },
      { text: "לשנה טובה תכתבו ותחתמו, לאלתר לחיים טובים ולשלום", source: "https://he.chabad.org/library/article_cdo/aid/4280000" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "chanukah",
    label: "ברכת חנוכה",
    group: "yearcycle",
    icon: "Flame",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "greeting", label: "הברכה", placeholder: "חנוכה שמח ומאיר", role: "title" },
      { name: "from", label: "מאת", placeholder: "משפחת / מוסדות ...", role: "field" },
      { name: "verse", label: "פסוק", placeholder: "כי נר מצוה ותורה אור", role: "subtitle" },
    ],
    honorifics: [],
    symbols: ["חנוכייה", "שמן זית", "להבות"],
    copyExamples: [
      { text: "להודות ולהלל לשמך הגדול על ניסיך ועל נפלאותיך", source: "https://grapholike.com" },
      { text: "כי נר מצוה ותורה אור — חנוכה שמח ומאיר", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "purim",
    label: "ברכת פורים",
    group: "yearcycle",
    icon: "PartyPopper",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "greeting", label: "הברכה", placeholder: "פורים שמח", role: "title" },
      { name: "from", label: "מאת", placeholder: "משפחת / מוסדות ...", role: "field" },
      { name: "verse", label: "פסוק", placeholder: "ליהודים היתה אורה ושמחה וששון ויקר", role: "subtitle" },
    ],
    honorifics: [],
    symbols: ["מגילה", "משלוח מנות", "מסכה"],
    copyExamples: [
      { text: "ליהודים היתה אורה ושמחה וששון ויקר", source: "https://grapholike.com" },
      { text: "והימים האלה נזכרים ונעשים בכל דור ודור", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "pesach",
    label: "ברכת פסח",
    group: "yearcycle",
    icon: "Sparkles",
    defaultStyle: "malchut",
    fields: [
      { name: "greeting", label: "הברכה", placeholder: "חג פסח כשר ושמח", role: "title" },
      { name: "from", label: "מאת", placeholder: "משפחת / מוסדות ...", role: "field" },
      { name: "verse", label: "איחול", placeholder: "לשנה הבאה בירושלים הבנויה", role: "subtitle" },
    ],
    honorifics: [],
    symbols: ["מצה", "קערת ליל הסדר", "ארבע כוסות"],
    copyExamples: [
      { text: "חג פסח כשר ושמח — לשנה הבאה בירושלים", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },

  // ========================= אירועים / ארגונים (מפתח) =========================
  {
    key: "hachnasat_sefer_torah",
    label: "הכנסת ספר תורה",
    group: "events",
    icon: "Scroll",
    defaultStyle: "malchut",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "מעמד הכנסת ספר תורה", role: "title" },
      { name: "dedication", label: "לזכר / לרגל", placeholder: "לעילוי נשמת / לרגל שמחת המשפחה", role: "field" },
      { name: "when", label: "מתי", placeholder: "אי\"ה ביום ראשון בשעה 16:00", role: "field" },
      { name: "where", label: "היכן", placeholder: "מבית משפחת כהן אל בית הכנסת", role: "field" },
    ],
    honorifics: ["שליט\"א", "מרנן ורבנן"],
    symbols: ["ספר תורה", "כתר", "רימונים", "חופה"],
    copyExamples: [
      { text: "בשמחה ובהודיה — מעמד הכנסת ספר תורה, בואו והשתתפו בשמחת התורה", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים"],
  },
  {
    key: "dinner",
    label: "דינר / עצרת התרמה",
    group: "events",
    icon: "Users",
    defaultStyle: "chasidic_royal",
    fields: [
      { name: "opener", label: "פתיח", placeholder: "בס\"ד", role: "subtitle" },
      { name: "title", label: "כותרת", placeholder: "דינר מפואר לטובת המוסדות", role: "title" },
      { name: "org", label: "שם הארגון", placeholder: "מוסדות 'תורה ודעת'", role: "field" },
      { name: "guests", label: "בהשתתפות", placeholder: "גדולי ישראל שליט\"א", role: "field" },
      { name: "when", label: "מתי", placeholder: "אי\"ה במוצ\"ש", role: "field" },
      { name: "where", label: "היכן", placeholder: "באולמי 'המלכות'", role: "field" },
    ],
    honorifics: ["שליט\"א", "מרנן ורבנן"],
    symbols: ["עיטור זהב", "כתר", "רקע מלכותי"],
    copyExamples: [
      { text: "דינר מפואר לטובת המוסדות הקדושים, בואו והיו שותפים בהחזקת התורה", source: "https://grapholike.com" },
    ],
    sensitivity: ["ללא תמונות נשים", "CTA ברור לתרומה"],
  },
];

export const getCategory = (key: string) => KNOWLEDGE_BASE.find((c) => c.key === key);

export const GROUPS = [
  { key: "shiurim", label: "שיעורי תורה", icon: "BookOpen" },
  { key: "lifecycle", label: "מעגל החיים", icon: "Heart" },
  { key: "yearcycle", label: "מעגל השנה", icon: "Calendar" },
  { key: "events", label: "אירועים וארגונים", icon: "Users" },
] as const;
