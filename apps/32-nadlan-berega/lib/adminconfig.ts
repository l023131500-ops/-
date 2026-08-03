// ==== מרכז השליטה — מה מוגדר, למה, וכמה זה עולה ====
//
// ⚠️ כלל ברזל: הקובץ הזה לעולם לא מחזיר ערך מפתח. רק ארבע הספרות האחרונות,
// כדי שאפשר יהיה לזהות *איזה* מפתח הוזן בלי לחשוף אותו.

export interface EnvEntry {
  name: string;
  /** למה המפתח משמש, בעברית מדוברת. */
  purpose: string;
  /** מה נשבר בלעדיו. */
  impact: string;
  required: boolean;
  /** ארבע ספרות אחרונות בלבד. */
  tail: string | null;
  configured: boolean;
  /** איפה משיגים אותו. */
  getUrl?: string;
  secret: boolean;
}

function entry(
  name: string,
  purpose: string,
  impact: string,
  required: boolean,
  opts: { getUrl?: string; secret?: boolean } = {},
): EnvEntry {
  const raw = process.env[name]?.trim() ?? '';
  const configured = raw.length > 0;
  return {
    name,
    purpose,
    impact,
    required,
    configured,
    tail: configured ? raw.slice(-4) : null,
    getUrl: opts.getUrl,
    secret: opts.secret ?? true,
  };
}

export function envStatus(): EnvEntry[] {
  return [
    entry(
      'GOOGLE_MAPS_API_KEY',
      'מוסדות בשם ובמרחק מדויק, זמני הליכה, צילום הבניין ומפה.',
      'בלעדיו אין רשימת מוסדות, אין זמני הליכה ואין תמונות.',
      true,
      { getUrl: 'https://console.cloud.google.com/google/maps-apis/credentials' },
    ),
    entry(
      'APIFY_TOKEN',
      'משיכת דירות שמוצעות למכירה כרגע מיד2 וממדלן.',
      'בלעדיו הקטגוריה "דירות מוצעות כרגע" מציגה "דורש מקור מורשה".',
      false,
      { getUrl: 'https://console.apify.com/settings/integrations' },
    ),
    entry(
      'SUPABASE_URL',
      'כתובת מסד הנתונים — שמירת דוחות ובקשות מסמכים.',
      'בלעדיו אין שמירה של בקשות לקוחות.',
      true,
      { secret: false },
    ),
    entry(
      'SUPABASE_ANON_KEY',
      'גישה ציבורית מוגבלת למסד — שליחת טופס בקשת מסמך.',
      'בלעדיו טופס הבקשה לא נשמר.',
      true,
    ),
    entry(
      'SUPABASE_SERVICE_KEY',
      'גישת שרת מלאה — שמירת דוחות במטמון והאצת הפקות חוזרות.',
      'בלעדיו המערכת עובדת "חי בלבד": כל דוח נבנה מאפס וזה איטי ויקר יותר.',
      false,
      { getUrl: 'https://supabase.com/dashboard/project/uhnrgujbdxhhmoxcjria/settings/api' },
    ),
    entry(
      'AI_API_KEY',
      'ניסוח דוח מילולי מקיף על ידי מנוע AI.',
      'בלעדיו אין סיכום מילולי אוטומטי. שאר הדוח עובד רגיל.',
      false,
      { getUrl: 'https://console.anthropic.com/settings/keys' },
    ),
    entry(
      'CBS_HOUSING_INDEX_ID',
      'מזהה סדרת מדד מחירי הדירות בלשכה המרכזית לסטטיסטיקה.',
      'בלעדיו אין גרף מגמת מחירים. הערך הנכון הוא 40010.',
      true,
      { secret: false },
    ),
    entry(
      'XPLAN_BASE',
      'כתובת שירות המפות התכנוני — ייעוד קרקע ותוכניות.',
      'בלעדיו אין ייעוד קרקע ואין מספרי תוכניות.',
      true,
      { secret: false },
    ),
    entry(
      'DATAGOV_ELECTIONS_BALLOTS',
      'תוצאות הבחירות לפי קלפי — הבסיס לאפיון האוכלוסייה.',
      'בלעדיו אין אפיון אוכלוסייה ברמת שכונה.',
      false,
      { secret: false },
    ),
    entry(
      'DATAGOV_POLLING_STATIONS',
      'מיקומי הקלפיות — מה שמקשר בין הנכס לתוצאות ההצבעה.',
      'בלעדיו האפיון יורד לרמת יישוב שלם במקום שכונה.',
      false,
      { secret: false },
    ),
    entry(
      'DATAGOV_TRANSPORT_RESOURCE',
      'מאגר תחנות התחבורה הציבורית הארצי.',
      'בלעדיו הספירה הארצית של תחנות אינה זמינה.',
      false,
      { secret: false },
    ),
  ];
}

export interface AiProvider {
  name: string;
  does: string;
  envVar: string;
  configured: boolean;
  tail: string | null;
  creditsUrl: string;
  addUrl: string;
}

export function aiProviders(): AiProvider[] {
  const mk = (
    name: string,
    does: string,
    envVar: string,
    creditsUrl: string,
    addUrl: string,
  ): AiProvider => {
    const raw = process.env[envVar]?.trim() ?? '';
    return {
      name,
      does,
      envVar,
      configured: raw.length > 0,
      tail: raw ? raw.slice(-4) : null,
      creditsUrl,
      addUrl,
    };
  };

  return [
    mk(
      'Anthropic (Claude)',
      'כתיבת הסיכום המילולי של הדוח וניסוח המלצות בעברית.',
      'ANTHROPIC_API_KEY',
      'https://console.anthropic.com/settings/billing',
      'https://console.anthropic.com/settings/keys',
    ),
    mk(
      'OpenAI',
      'חלופה לניסוח טקסט ולסיווג נתונים.',
      'OPENAI_API_KEY',
      'https://platform.openai.com/settings/organization/billing/overview',
      'https://platform.openai.com/api-keys',
    ),
    mk(
      'Google Gemini',
      'חלופה לניסוח, וניתוח תמונות של נכסים.',
      'GEMINI_API_KEY',
      'https://aistudio.google.com/app/billing',
      'https://aistudio.google.com/app/apikey',
    ),
    mk(
      'Perplexity',
      'חיפוש מידע עדכני ברשת על אזור או על תוכנית בנייה.',
      'PERPLEXITY_API_KEY',
      'https://www.perplexity.ai/settings/api',
      'https://www.perplexity.ai/settings/api',
    ),
    mk(
      'Recraft',
      'יצירת תמונות ואיורים לחומרי שיווק.',
      'RECRAFT_API_KEY',
      'https://www.recraft.ai/profile/api',
      'https://www.recraft.ai/profile/api',
    ),
  ];
}

export interface SystemLink {
  label: string;
  url: string;
  note: string;
}

export function systemLinks(): SystemLink[] {
  return [
    { label: 'האתר החי', url: 'https://nadlan-berega.vercel.app', note: 'הגרסה שהלקוחות רואים' },
    {
      label: 'קוד המקור',
      url: 'https://github.com/l023131500-ops/nadlan-berega',
      note: 'ריפו פרטי',
    },
    {
      label: 'מסד הנתונים',
      url: 'https://supabase.com/dashboard/project/uhnrgujbdxhhmoxcjria',
      note: 'טבלאות, מרשם מקורות ובקשות לקוחות',
    },
    {
      label: 'ניהול הפריסה',
      url: 'https://vercel.com/dashboard',
      note: 'משתני סביבה ולוגים של הפרודקשן',
    },
    {
      label: 'צריכת Google Maps',
      url: 'https://console.cloud.google.com/google/maps-apis/metrics',
      note: 'כמה קריאות בוצעו וכמה זה עלה',
    },
    {
      label: 'צריכת Apify',
      url: 'https://console.apify.com/billing',
      note: 'יתרת הקרדיטים למשיכת מודעות',
    },
    {
      label: 'מקורות הנתונים הממשלתיים',
      url: 'https://data.gov.il',
      note: 'עסקאות, בחירות, רחובות, תחבורה — הכל חינם',
    },
  ];
}

export interface SourceHealth {
  name: string;
  what: string;
  status: 'live' | 'needs_key' | 'manual';
  note: string;
}

/** סטטוס אמת/נדרש לכל מקור. */
export function sourceHealth(): SourceHealth[] {
  const has = (k: string) => (process.env[k]?.trim() ?? '').length > 0;

  return [
    {
      name: 'עסקאות שנמכרו',
      what: 'מחירים שנסגרו בפועל, מרשות המסים',
      status: 'live',
      note: 'עובד. חינם, בלי מפתח.',
    },
    {
      name: 'גוש וחלקה',
      what: 'מרשם החלקות הרשמי',
      status: 'live',
      note: 'עובד. חינם, בלי מפתח.',
    },
    {
      name: 'שמות רחובות וכינויים',
      what: 'מרשם הרחובות עם השמות המוכרים',
      status: 'live',
      note: 'עובד. 152,130 שורות, חינם.',
    },
    {
      name: 'אפיון אוכלוסייה',
      what: 'תוצאות ההצבעה בקלפי הקרובה',
      status: has('GOOGLE_MAPS_API_KEY') ? 'live' : 'needs_key',
      note: has('GOOGLE_MAPS_API_KEY')
        ? 'עובד ברמת שכונה.'
        : 'בלי מפתח מפות אי אפשר לאתר את הקלפי הקרובה — יורד לרמת יישוב.',
    },
    {
      name: 'מוסדות ותחבורה',
      what: 'שם המוסד והמרחק המדויק',
      status: has('GOOGLE_MAPS_API_KEY') ? 'live' : 'needs_key',
      note: has('GOOGLE_MAPS_API_KEY') ? 'עובד.' : 'נדרש GOOGLE_MAPS_API_KEY.',
    },
    {
      name: 'צילום הבניין (צילומי רחוב)',
      what: 'תמונת הבניין בדוח VIP ובמצגת',
      status: 'needs_key',
      note:
        'המפתח תקין ושאר שירותי המפות עובדים, אבל שירות "Street View Static API" ' +
        'אינו מופעל בפרויקט הענן — ולכן מוחזרת תמונה אפורה במקום צילום. ' +
        'להפעלה: Google Cloud Console → APIs & Services → הפעלת Street View Static API. ' +
        'עד אז הדוח מציג "לא זמין" ואינו מציג תמונה חלופית.',
    },
    {
      name: 'דירות מוצעות כרגע',
      what: 'מודעות פעילות ביד2 ובמדלן',
      status: has('APIFY_TOKEN') ? 'live' : 'needs_key',
      note: has('APIFY_TOKEN')
        ? 'מדלן עובד. יד2 חוסם מדי פעם את כתובות ה-IP של הספק, ואז מוצגות מודעות ' +
          'ממדלן בלבד והלקוח מקבל הסבר בעברית פשוטה. שים לב לתקרת המסלול החינמי — 5 דולר לחודש.'
        : 'נדרש APIFY_TOKEN. עד אז המסך אומר "דורש מקור מורשה".',
    },
    {
      name: 'ייעוד קרקע ותוכניות',
      what: 'מה מותר לבנות במגרש',
      status: 'live',
      note: 'עובד. חינם.',
    },
    {
      name: 'התחדשות עירונית',
      what: 'שיוך למתחם פינוי-בינוי מוכרז',
      status: 'live',
      note: 'עובד. חינם.',
    },
    {
      name: 'מדד מחירי דירות',
      what: 'מגמת השוק הארצית',
      status: 'live',
      note: 'עובד. חינם.',
    },
    {
      name: 'נסח טאבו',
      what: 'בעלות, משכנתאות ועיקולים',
      status: 'manual',
      note: 'אין ממשק ממוחשב. הזמנה ידנית מול רשות רישום המקרקעין, בתשלום.',
    },
    {
      name: 'זכויות בנייה מדויקות',
      what: 'אחוזי בנייה, קומות, יחידות דיור',
      status: 'manual',
      note: 'מופיע רק בהוראות התוכנית במערכת התכנון. דורש קריאה ידנית.',
    },
    {
      name: 'היתרי בנייה וחריגות',
      what: 'תיק הבניין בוועדה המקומית',
      status: 'manual',
      note: 'מערכת רישוי זמין סגורה לציבור. בדיקה ידנית בוועדה.',
    },
  ];
}
