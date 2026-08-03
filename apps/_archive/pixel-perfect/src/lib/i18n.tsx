import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "he" | "en";

type Dict = Record<string, string>;

const translations: Record<Lang, Dict> = {
  he: {
    "app.name": "השוואת מחירים",
    "app.tagline": "מצאו את המחיר הזול ביותר בסופרמרקטים",
    "nav.search": "חיפוש",
    "nav.status": "סטטוס",
    "lang.toggle": "English",

    "search.title": "השוואת מחירים בסופר",
    "search.subtitle": "הקלידו ברקוד או שם מוצר וגלו היכן הכי זול",
    "search.placeholder": "לדוגמה: קוטג' תנובה או 7290000000000",
    "search.button": "חיפוש",
    "search.searching": "מחפש…",
    "search.empty.title": "התחילו בחיפוש",
    "search.empty.body": "הקלידו שם מוצר או ברקוד כדי לראות את המחירים הזולים ביותר.",
    "search.notfound.title": "לא נמצאו תוצאות",
    "search.notfound.body": "נסו ברקוד אחר או שם מוצר אחר.",
    "search.error.title": "שגיאה בחיבור לשרת",
    "search.error.body": "לא הצלחנו להביא תוצאות כרגע. נסו שוב בעוד רגע.",
    "search.notconfigured.title": "השרת לא מחובר",
    "search.notconfigured.body": "כתובת השרת לא הוגדרה. הגדירו את הסוד PRICE_BOT_API_URL.",

    "results.cheapest": "המחירים הזולים ביותר",
    "results.branch": "סניף",
    "results.savings": "חיסכון פוטנציאלי",
    "results.savings.between": "בין {min} ל-{max}",
    "results.rank.1": "הכי זול",

    "status.title": "סטטוס המערכת",
    "status.subtitle": "בריאות השרת והפעלה ידנית של עדכון מחירים",
    "status.health": "מצב השרת",
    "status.online": "מחובר ופעיל",
    "status.offline": "לא זמין",
    "status.checking": "בודק…",
    "status.rows": "שורות מחירים במאגר",
    "status.error": "השרת אינו מגיב",
    "status.notconfigured": "השרת לא הוגדר",
    "status.trigger.title": "עדכון מחירים",
    "status.trigger.body": "הפעילו ידנית את משיכת המחירים היומית.",
    "status.trigger.button": "הפעל עדכון עכשיו",
    "status.trigger.running": "מפעיל…",
    "status.trigger.success": "עדכון המחירים הופעל בהצלחה",
    "status.trigger.unauthorized": "הרשאה נדחתה — בדקו את הטוקן",
    "status.trigger.error": "ההפעלה נכשלה. נסו שוב.",
    "status.refresh": "רענון",
  },
  en: {
    "app.name": "Price Compare",
    "app.tagline": "Find the cheapest supermarket prices",
    "nav.search": "Search",
    "nav.status": "Status",
    "lang.toggle": "עברית",

    "search.title": "Compare Supermarket Prices",
    "search.subtitle": "Enter a barcode or product name to find the lowest price",
    "search.placeholder": "e.g. Cottage cheese or 7290000000000",
    "search.button": "Search",
    "search.searching": "Searching…",
    "search.empty.title": "Start searching",
    "search.empty.body": "Type a product name or barcode to see the cheapest prices.",
    "search.notfound.title": "No results found",
    "search.notfound.body": "Try a different barcode or product name.",
    "search.error.title": "Connection error",
    "search.error.body": "We couldn't fetch results right now. Please try again shortly.",
    "search.notconfigured.title": "Backend not connected",
    "search.notconfigured.body": "The backend URL is not set. Configure the PRICE_BOT_API_URL secret.",

    "results.cheapest": "Cheapest prices",
    "results.branch": "Branch",
    "results.savings": "Potential savings",
    "results.savings.between": "between {min} and {max}",
    "results.rank.1": "Cheapest",

    "status.title": "System Status",
    "status.subtitle": "Backend health and manual price refresh",
    "status.health": "Backend health",
    "status.online": "Online",
    "status.offline": "Unavailable",
    "status.checking": "Checking…",
    "status.rows": "Price rows in database",
    "status.error": "Backend is not responding",
    "status.notconfigured": "Backend not configured",
    "status.trigger.title": "Price refresh",
    "status.trigger.body": "Manually trigger the daily price fetch.",
    "status.trigger.button": "Run fetch now",
    "status.trigger.running": "Starting…",
    "status.trigger.success": "Price fetch started successfully",
    "status.trigger.unauthorized": "Authorization denied — check the token",
    "status.trigger.error": "Failed to start. Please try again.",
    "status.refresh": "Refresh",
  },
};

interface I18nValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatPrice: (value: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "price-bot-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (stored === "he" || stored === "en") {
      setLangState(stored);
    }
  }, []);

  const dir: "rtl" | "ltr" = lang === "he" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "he" ? "en" : "he");
  }, [lang, setLang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = translations[lang][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const formatPrice = useCallback(
    (value: number) => {
      return new Intl.NumberFormat(lang === "he" ? "he-IL" : "en-IL", {
        style: "currency",
        currency: "ILS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    },
    [lang],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, dir, setLang, toggleLang, t, formatPrice }),
    [lang, dir, setLang, toggleLang, t, formatPrice],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
