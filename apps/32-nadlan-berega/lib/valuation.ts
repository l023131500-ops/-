// ==== §2 · הערכת שווי — עדכנית, קרובה, ומוצהרת ====
//
// שלושה כללים שהמפרט מציב, וכל אחד מהם נאכף כאן במפורש:
//
// 1. **מחירים עדכניים בלבד.** החלון נפתח על 24 חודשים, ומתרחב ל-36 ואז ל-60
//    רק אם אין די עסקאות — והחלון שנבחר בפועל **נאמר ללקוח**. חציון על כל
//    ההיסטוריה הוא מספר חסר משמעות: נמדד בהבעש"ט 9 שהוא מערבב 6,431 ₪ למ"ר
//    מ-2001 עם 21,538 ₪ למ"ר מ-2026.
// 2. **השוואה רק לנכסים קרובים ודומים.** לא "מאות דירות מרוחקות": העסקאות
//    מסוננות לסוג הנכס, לטווח גודל סביר סביב הנכס, ולרדיוס שנאמר במפורש.
// 3. **היררכיה מוצהרת.** עסקה על הנכס עצמו → הבניין → הרחוב → הרדיוס הקרוב.
//    כל רמה שאינה הנכס עצמו מסומנת **"הערכה"**, ונאמר על מה היא מבוססת
//    ומאיזה תאריך.
//
// 🔴 וכלל רביעי, שהוא החשוב מכולם: כשאין די נתונים אמיתיים — המודול מחזיר
// `notEnoughData` עם משפט כן, ולא מספר. הערכה שנשענת על שתי עסקאות משנת 2014
// גרועה מ"אין לנו די נתונים".

export type ValuationLevel = 'property' | 'building' | 'street' | 'area';

/** עסקה, במבנה המינימלי שההערכה צריכה. תואם מבנית ל-`SoldDeal`. */
export interface ComparableDeal {
  date: string;
  price: number | null;
  areaSqm: number | null;
  pricePerSqm: number | null;
  rooms: number | null;
  address: string | null;
  isHomeSale: boolean;
  proximityRank: number;
  proximityLabel: string;
  suspect?: boolean;
  /**
   * קומה וגוש/חלקה — לא נצרכים בשום חישוב כאן, רק מועברים דרך כדי שטבלת
   * ההשוואה תוכל להציג "התאמות" ברמת שמאי (P2 ACCURACY SPEC §E): קומה
   * וזיהוי חלקה לכל עסקת השוואה, לצד הקרבה שכבר קיימת ב-`proximityLabel`.
   * אופציונליים כי `ComparableDeal` הוא הטיפוס המינימלי שההערכה דורשת —
   * קריאה קיימת כלשהי ל-`valuate()` בלי השדות האלה ממשיכה לעבוד ללא שינוי.
   */
  floor?: string | null;
  parcelLabel?: string | null;
}

export interface ValuationBasis {
  level: ValuationLevel;
  /** "עסקאות בבניין עצמו" · "עסקאות באותו רחוב" ... */
  label: string;
  count: number;
  medianPerSqm: number;
  /** "בשנתיים האחרונות" */
  windowLabel: string;
  /** תאריך העסקה העדכנית ביותר שנכללה. */
  latestDate: string | null;
}

export interface Valuation {
  /** טווח השווי — מהאחוזון ה-25 ל-75 של המחיר למ"ר, כפול השטח. */
  low: number;
  high: number;
  mid: number;
  medianPerSqm: number;
  /** השטח שעליו חושב השווי, ומאיפה הוא. */
  areaSqm: number;
  areaSource: string;
  basis: ValuationBasis;
  /** `verified` רק כשיש עסקה על הנכס עצמו. אחרת תמיד `estimate`. */
  certainty: 'verified' | 'estimate';
  /** משפט מלא בעברית: על מה ההערכה מבוססת, כמה עסקאות, ומאיזה חלון. */
  explanation: string;
  /** העסקאות שנכללו — כדי שהלקוח יוכל לאמת את המספר. */
  comparables: ComparableDeal[];
  /** הרדיוס שממנו נאספו ההשוואות, כשהרמה היא "אזור". */
  radiusM: number | null;
  /**
   * הפיזור בין הנכסים הדומים היה רחב מדי מכדי שהטווח ייחשב הדוק.
   * כשזה קורה אומרים זאת — טווח צר על נתונים מפוזרים הוא ביטחון מזויף.
   */
  wideSpread: string | null;
}

export interface NoValuation {
  notEnoughData: string;
  /**
   * גם כשאי אפשר לתמחר את הנכס — §2 מבקש **מחיר למ"ר אזורי עדכני**.
   * הוא נמדד מאותן עסקאות קרובות ועדכניות, ומוצג עם החלון והתאריך שלו.
   * זה נתון אמיתי על האזור, ולא הערכה על הנכס.
   */
  regional?: {
    medianPerSqm: number;
    count: number;
    windowLabel: string;
    latestDate: string | null;
  } | null;
}

export type ValuationResult = Valuation | NoValuation;

export function hasValuation(v: ValuationResult | null): v is Valuation {
  return !!v && !('notEnoughData' in v);
}

const MONTH = 30.44 * 24 * 3600 * 1000;
const WINDOWS: { months: number; label: string }[] = [
  { months: 24, label: 'בשנתיים האחרונות' },
  { months: 36, label: 'בשלוש השנים האחרונות' },
  { months: 60, label: 'בחמש השנים האחרונות' },
];

/** מינימום עסקאות שאנחנו מוכנים לבנות עליו הערכה. */
const MIN_DEALS = 3;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function med(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return percentile(s, 0.5);
}

/** עסקה שמותר להשוות אליה: מכירת דירה, לא חשודה, עם מחיר ושטח. */
function usable(d: ComparableDeal): boolean {
  return d.isHomeSale && !d.suspect && d.pricePerSqm != null && d.areaSqm != null && d.areaSqm > 0;
}

/**
 * דומה בגודל. ±35% הוא טווח רחב מספיק כדי שיישארו עסקאות בבניין קטן, וצר
 * מספיק כדי שדירת 40 מ"ר לא תתומחר לפי פנטהאוז של 200.
 */
function similarSize(d: ComparableDeal, area: number | null): boolean {
  if (area == null || d.areaSqm == null) return true;
  const r = d.areaSqm / area;
  return r >= 0.65 && r <= 1.35;
}

/** דומה במספר חדרים — ±1 חדר, כשידוע לשני הצדדים. */
function similarRooms(d: ComparableDeal, rooms: number | null): boolean {
  if (rooms == null || d.rooms == null) return true;
  return Math.abs(d.rooms - rooms) <= 1;
}

/**
 * מחיר למ"ר אזורי עדכני — מכל העסקאות הקרובות, בלי סינון גודל.
 * זהו נתון על **האזור**, ולכן הוא תקף גם כשאין מה לומר על הנכס עצמו.
 */
function regionalPerSqm(
  pool: ComparableDeal[],
  now: number,
): NoValuation['regional'] {
  for (const { months, label } of WINDOWS) {
    const cutoff = now - months * MONTH;
    const recent = pool.filter((d) => {
      const ts = new Date(d.date).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    });
    if (recent.length >= MIN_DEALS) {
      return {
        medianPerSqm: Math.round(med(recent.map((d) => d.pricePerSqm!))),
        count: recent.length,
        windowLabel: label,
        latestDate: latestOf(recent),
      };
    }
  }
  return null;
}

function latestOf(deals: ComparableDeal[]): string | null {
  let best: string | null = null;
  for (const d of deals) if (!best || d.date > best) best = d.date;
  return best;
}

/**
 * ההערכה.
 *
 * @param deals       כל העסקאות שנאספו, כבר מדורגות לפי קרבה (rank 0 = הבניין).
 * @param subjectArea שטח הנכס, אם ידוע.
 * @param subjectRooms מספר החדרים שהמשתמש הזין, אם הזין.
 * @param radiusM     הרדיוס שממנו נאספו עסקאות האזור — נאמר ללקוח.
 */
export function valuate(
  deals: ComparableDeal[],
  opts: {
    subjectArea?: number | null;
    subjectRooms?: number | null;
    radiusM?: number | null;
    now?: Date;
  } = {},
): ValuationResult {
  const now = (opts.now ?? new Date()).getTime();
  const rooms = opts.subjectRooms ?? null;

  /**
   * 🔴 עסקה באותו רחוב אינה בהכרח עסקה קרובה.
   *
   * נמדד על שמואל הנביא 86: הרחוב משתרע ממספר 1 עד 112. מספרים 4–5 יושבים
   * בקצה אחר של העיר ונמכרו ב-61,000–73,000 ₪ למ״ר, בעוד השכנים הממש-סמוכים
   * (84, 88, 92) נעים סביב 34,000–58,000. ארבע העסקאות הרחוקות האלה משכו את
   * החציון ל-57,512 — כלומר כמעט 50% מעל חציון הרחוב כולו (38,725), על נכס
   * בקצה השני של השכונה.
   *
   * לכן עסקה שנמצאת על אותו רחוב אך רחוקה ממנו במספרי בית **נפסלת להשוואה
   * לגמרי**, בכל הרמות. עסקאות "בסביבה" (רחוב אחר) נשארות — הן נאספו מלכתחילה
   * ברדיוס גיאוגרפי סביב הנכס, ולכן הן באמת קרובות.
   *
   * `proximityRank`: 0 = הבניין · 10..999 = אותו רחוב, `rank − 10` הוא מרחק
   * מספרי הבית · 1000 = רחוב אחר בתוך הרדיוס.
   */
  const MAX_HOUSE_NUMBER_DISTANCE = 25;
  const farOnSameStreet = (d: ComparableDeal) =>
    d.proximityRank >= 10 && d.proximityRank < 1000 && d.proximityRank - 10 > MAX_HOUSE_NUMBER_DISTANCE;

  const pool = deals.filter((d) => usable(d) && !farOnSameStreet(d));

  if (!pool.length) {
    return {
      notEnoughData:
        'לא נמצאה אף עסקת מכירה עם מחיר ושטח שאפשר להשוות אליה, ולכן אין בסיס אמיתי להערכת שווי. ' +
        'העדפנו לומר זאת מאשר להציג מספר שאין מאחוריו נתונים.',
    };
  }

  // ---- השטח שעליו מעריכים ----
  // ⚠️ בלי שטח אין הערכה: מחיר למ"ר בלי מ"ר אינו שווי. אם הנכס עצמו לא זוהה,
  // משתמשים בגודל החציוני של הדירות **בבניין הזה** — וזה נאמר במפורש.
  const buildingDeals = pool.filter((d) => d.proximityRank === 0);
  let area = opts.subjectArea ?? null;
  let areaSource = 'השטח הרשום של הנכס';
  if (area == null && buildingDeals.length) {
    area = Math.round(med(buildingDeals.map((d) => d.areaSqm!)));
    areaSource = `הגודל החציוני של הדירות בבניין (${buildingDeals.length} עסקאות)`;
  }
  if (area == null) {
    return {
      notEnoughData:
        'לא ידוע שטח הנכס, ולא נרשמו עסקאות בבניין הזה שמהן אפשר לגזור גודל אופייני. ' +
        'מחיר למ"ר בלי שטח אינו שווי, ולכן לא הצגנו טווח מחיר — אבל מחיר המ"ר באזור מוצג למטה, ' +
        'ואפשר להכפיל אותו בשטח האמיתי של הנכס כשהוא ידוע.',
      regional: regionalPerSqm(pool, now),
    };
  }

  // ---- רמות ההשוואה, מהקרוב לרחוק ----
  //
  // 🔴 "אותו רחוב" אינו "קרוב". נמדד על שמואל הנביא 86: הרחוב משתרע ממספר 1
  // עד 112, ומספרים 4–5 יושבים בקצה אחר לגמרי של העיר ונמכרים ב-61,000–73,000
  // ₪ למ״ר, בעוד שהשכנים הממש-סמוכים (84, 88, 92) נעים סביב 34,000–58,000.
  // השוואה לפי שם רחוב בלבד גררה את ההערכה כלפי מעלה בעשרות אחוזים. לכן יש
  // רמת ביניים: **אותו רחוב, במרחק של עד 15 מספרי בית** — וזה מה שהמפרט
  // מתכוון אליו ב"רק נכסים קרובים".
  //
  // `proximityRank` ברמת הרחוב הוא `10 + |מספר הבית שלהם − שלנו|`, ולכן
  // `rank − 10` הוא בדיוק מרחק מספרי הבית.
  const streetDeals = pool.filter((d) => d.proximityRank > 0 && d.proximityRank < 1000);
  const NEAR_HOUSE_NUMBERS = 15;
  const levels: { level: ValuationLevel; label: string; deals: ComparableDeal[] }[] = [
    { level: 'building', label: 'עסקאות בבניין עצמו', deals: buildingDeals },
    {
      level: 'street',
      label: `עסקאות באותו רחוב, בטווח של עד ${NEAR_HOUSE_NUMBERS} מספרי בית`,
      deals: streetDeals.filter((d) => d.proximityRank - 10 <= NEAR_HOUSE_NUMBERS),
    },
    // ⚠️ אין רמת "כל הרחוב". אחרי סינון העסקאות הרחוקות, `streetDeals` הוא
    // ממילא רק הסביבה הקרובה של מספר הבית — וכל מה שרחוק ממנו כבר נפסל.
    { level: 'street', label: `עסקאות באותו רחוב, בקרבת מספר הבית`, deals: streetDeals },
    { level: 'area', label: 'עסקאות בסביבה הקרובה', deals: pool },
  ];

  for (const { months, label } of WINDOWS) {
    const cutoff = now - months * MONTH;
    for (const lvl of levels) {
      // עדכניות, ואז דמיון בגודל ובחדרים.
      const recent = lvl.deals.filter((d) => {
        const ts = new Date(d.date).getTime();
        return Number.isFinite(ts) && ts >= cutoff;
      });
      let similar = recent.filter((d) => similarSize(d, area) && similarRooms(d, rooms));
      // אם הסינון על החדרים חתך יותר מדי, מרפים ממנו לפני שמרחיבים את החלון:
      // גודל דומה הוא אינדיקטור חזק יותר, ומספר החדרים חסר בחלק מהרשומות.
      if (similar.length < MIN_DEALS) {
        similar = recent.filter((d) => similarSize(d, area));
      }
      if (similar.length < MIN_DEALS) continue;

      const perSqm = similar.map((d) => d.pricePerSqm!).sort((a, b) => a - b);
      const medianPerSqm = Math.round(percentile(perSqm, 0.5));
      const lowPerSqm = Math.round(percentile(perSqm, 0.25));
      const highPerSqm = Math.round(percentile(perSqm, 0.75));
      const latestDate = latestOf(similar);

      /**
       * הפיזור האמיתי בקבוצה. כשהקצוות רחוקים זה מזה פי 1.8 ומעלה, טווח
       * של רבעון-עד-רבעון מציג ביטחון שאין לו כיסוי — ולכן נאמר ללקוח שהשוק
       * המקומי מפוזר, ומה הקצוות בפועל.
       */
      const p10 = percentile(perSqm, 0.1);
      const p90 = percentile(perSqm, 0.9);
      const wideSpread =
        p10 > 0 && p90 / p10 >= 1.8
          ? `נכסים דומים בקרבת מקום נמכרו בפער גדול זה מזה — מ-${Math.round(p10).toLocaleString('he-IL')} ` +
            `ועד ${Math.round(p90).toLocaleString('he-IL')} ₪ למ״ר. כשהשוק המקומי מפוזר כל כך, ` +
            'הטווח שמוצג הוא אמצע התמונה בלבד, ולא צריך להתייחס אליו כאילו הוא מדויק. ' +
            'הפער נובע בדרך כלל מהבדלי מצב, קומה, חזית ושיפוץ שאינם נרשמים במרשם העסקאות.'
          : null;

      // המוצגות ללקוח: העדכניות ביותר, עד 12. "מאות עסקאות" אינן ראיה —
      // הן ערימה שאיש לא בודק.
      const comparables = [...similar].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 12);

      const whenText = latestDate
        ? `העסקה העדכנית ביותר שנכללה היא מ-${new Date(latestDate).toLocaleDateString('he-IL')}`
        : '';
      const where =
        lvl.level === 'building'
          ? 'מתוך הבניין הזה עצמו'
          : lvl.level === 'street'
            ? `מתוך ${lvl.label.replace(/^עסקאות /, '')}`
            : `מתוך הסביבה הקרובה${opts.radiusM ? ` (רדיוס ${opts.radiusM} מ׳)` : ''}`;

      return {
        low: Math.round((lowPerSqm * area) / 1000) * 1000,
        high: Math.round((highPerSqm * area) / 1000) * 1000,
        mid: Math.round((medianPerSqm * area) / 1000) * 1000,
        medianPerSqm,
        areaSqm: area,
        areaSource,
        basis: {
          level: lvl.level,
          label: lvl.label,
          count: similar.length,
          medianPerSqm,
          windowLabel: label,
          latestDate,
        },
        // ⚠️ תמיד "הערכה". גם השוואה מהבניין עצמו אינה מחיר של הנכס הזה —
        // היא מחיר של דירה אחרת בבניין. רק עסקה על הנכס עצמו הייתה "אמת",
        // ואת זו הדוח מציג בנפרד כעסקה, לא כהערכה.
        certainty: 'estimate',
        explanation:
          `הערכה מבוססת השוואה: ${similar.length} עסקאות ${where}, ${label}, ` +
          `בגודל דומה לנכס (${area} מ״ר${
            areaSource.startsWith('הגודל') ? ', לפי ' + areaSource : ''
          }). ` +
          `החציון שיצא הוא ${medianPerSqm.toLocaleString('he-IL')} ₪ למ״ר. ${whenText}. ` +
          'זו אינה שמאות ואינה מחיר של הנכס הזה — זהו הטווח שבו נסגרו נכסים דומים בקרבת מקום.',
        comparables,
        radiusM: lvl.level === 'area' ? opts.radiusM ?? null : null,
        wideSpread,
      };
    }
  }

  // הגענו לכאן: גם בחלון של חמש שנים, וגם ברמת האזור, אין די עסקאות דומות.
  const newest = latestOf(pool);
  return {
    notEnoughData:
      'אין די עסקאות עדכניות של נכסים דומים בקרבת מקום כדי לבנות הערכת שווי אמינה' +
      (newest
        ? `. העסקה העדכנית ביותר שנמצאה בסביבה היא מ-${new Date(newest).toLocaleDateString('he-IL')}, ` +
          'והצגת מחיר על בסיסה הייתה מציגה מחיר ישן כאילו הוא עדכני.'
        : '.') +
      ' לא הצגנו טווח שווי במקום להציג מספר שאינו נשען על נתונים.',
    regional: regionalPerSqm(pool, now),
  };
}
