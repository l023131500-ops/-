import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, verifyCity } from '@/lib/geocode';
import { parcelAtPoint } from '@/lib/cadastre';
import { fetchDealsAtPoint, parseStreetAndNumber, filterToParcel } from '@/lib/nadlan';
import { fetchHousingIndex } from '@/lib/cbs';
import { queryPlanningAtPoint } from '@/lib/xplan';
import { checkRenewal } from '@/lib/hitchadshut';
import { tabuOrderInfo } from '@/lib/tabu';
import { environmentMetrics } from '@/lib/environment';
import { crimeProfile } from '@/lib/crime';
import { findCityCode } from '@/lib/placenames';
import { cacheProfile } from '@/lib/store';
import { opportunityScore, dealQuality } from '@/lib/score';
import { pricePerSqm } from '@/lib/format';
import type {
  Confidence, LayerData, PropertyProfile, SourcedValue, SourceType, Tier, Transaction,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// שבע שכבות מקור בקריאה אחת — ברירת המחדל של 60 שניות נחתכה באמצע.
export const maxDuration = 300;

// מיפוי מקור → סוג מקור (ארכיטקטורת דיוק מקסימלי: לכל שדה source_type).
const SOURCE_TYPE: Record<string, SourceType> = {
  govmap: 'official', carmen: 'official', cbs: 'official', xplan: 'official',
  datagov: 'official', hitchadshut: 'official', nadlan_gov: 'official',
  nominatim: 'community',
  mavat: 'pending', yadata: 'pending', rishui: 'pending',
  tabu: 'paid', rami: 'paid',
};
// שדות שדורשים מסלול בתשלום (לתיוג — ללא חיוב בשלב זה).
const REQUIRES_TIER: Record<string, Tier> = { tabu: 'vip', rami: 'vip', rishui: 'premium' };

function pending(label: string, sourceKey: string, isPaid = false, costIls?: number): SourcedValue {
  return {
    label, value: null,
    status: isPaid ? 'paid_locked' : 'pending',
    sourceKey,
    sourceType: SOURCE_TYPE[sourceKey] ?? 'pending',
    confidence: 'low',
    isPaid, costIls,
    requiresTier: isPaid ? (REQUIRES_TIER[sourceKey] ?? 'vip') : 'free',
  };
}
function ok(
  label: string, value: any, sourceKey: string,
  lastUpdated?: string, note?: string, confidence: Confidence = 'high',
): SourcedValue {
  const has = value !== null && value !== undefined && value !== '';
  return {
    label, value: has ? value : null,
    status: has ? 'ok' : 'unavailable',
    sourceKey,
    sourceType: SOURCE_TYPE[sourceKey] ?? 'official',
    confidence: has ? confidence : 'low',
    lastUpdated, note,
    requiresTier: 'free',
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const askPrice = Number(req.nextUrl.searchParams.get('ask') ?? NaN);
  if (!q) return NextResponse.json({ error: 'חסר פרמטר חיפוש (q)' }, { status: 400 });

  const warnings: string[] = [];
  const now = new Date().toISOString();
  const key: PropertyProfile['key'] = { address: q };
  let identification: PropertyProfile['identification'] = null;

  // --- שלב 1: גיאוקוד ---
  // GovMap מתאים באופן מטושטש ועלול להחזיר עיר אחרת בשקט. לכן בוחרים רק
  // מועמד שהיישוב שלו אומת מול השאילתה; אם אין כזה, לוקחים את הראשון אבל
  // מסמנים אזהרה מפורשת ולא מציגים אותו כזיהוי ודאי.
  // geo=free כופה את המסלול החינמי ללא GovMap (Nominatim → ITM → קדסטר WFS),
  // לאימות עמידות. ברירת המחדל: GovMap (מדויק) עם Nominatim כגיבוי.
  const skipGovmap = req.nextUrl.searchParams.get('geo') === 'free';
  let chosen: Awaited<ReturnType<typeof geocodeAddress>>[number] | null = null;
  try {
    const candidates = await geocodeAddress(q, { skipGovmap });
    chosen = candidates.find((c) => c.cityVerified) ?? candidates[0] ?? null;
    if (!chosen) warnings.push('לא נמצאו תוצאות גיאוקודינג לכתובת.');
    else if (!chosen.cityVerified) {
      warnings.push(
        `זיהוי הכתובת אינו ודאי: המקור החזיר "${chosen.label}" שאינו תואם את היישוב שהוזן. ` +
          'ייתכן שמדובר בכתובת אחרת — נדרש אימות.',
      );
    }
  } catch (e: any) {
    warnings.push(`גיאוקודינג לא זמין: ${e?.message ?? e}`);
  }

  if (chosen) {
    key.itmX = chosen.itmX;
    key.itmY = chosen.itmY;
    key.lat = chosen.lat;
    key.lng = chosen.lng;
    key.address = chosen.label || q;
  }

  // --- שלב 2: גוש/חלקה מהקדסטר ---
  let parcel: Awaited<ReturnType<typeof parcelAtPoint>> = null;
  if (key.itmX != null && key.itmY != null) {
    try {
      parcel = await parcelAtPoint(key.itmX, key.itmY);
      if (parcel) {
        key.gush = parcel.gush;
        key.helka = parcel.helka;
        key.city = parcel.localityName ?? undefined;
      } else {
        warnings.push(
          'לא נמצאה חלקה רשומה בנקודה זו. הדבר שכיח בכבישים, בשטחים ציבוריים ' +
            'ובאזורים לא-מוסדרים שאינם כלולים בקדסטר.',
        );
      }
    } catch (e: any) {
      warnings.push(`קדסטר לא זמין: ${e?.message ?? e}`);
    }
  }

  // אימות צולב מול הקדסטר. זהו האות החזק ביותר לזיהוי שגוי, משום שהיישוב
  // בשכבת החלקות מגיע ממקור בלתי תלוי לחלוטין בגיאוקודר. נבדק בפועל:
  // "הנביאים 5 צפת" הוחזר כ"הנשיאים 5 פת" והקדסטר חשף שהנקודה בפתח תקווה.
  let localityMismatch = false;
  if (chosen && parcel?.localityName) {
    localityMismatch = !verifyCity(q, parcel.localityName);
    if (localityMismatch) {
      warnings.push(
        `אי-התאמת יישוב: הנקודה שזוהתה נמצאת ב"${parcel.localityName}" לפי מרשם החלקות, ` +
          `בעוד שבשאילתה צוין יישוב אחר. סביר שזוהתה כתובת שגויה — אין להסתמך על נתונים אלה.`,
      );
    }
  }

  if (chosen) {
    identification = {
      matchedLabel: chosen.label,
      source: chosen.source,
      sourceType: chosen.source === 'govmap' ? 'official' : 'community',
      // זיהוי נחשב ודאי רק אם גם הגיאוקודר וגם הקדסטר מסכימים.
      cityVerified: chosen.cityVerified && !localityMismatch,
      cadastreLocality: parcel?.localityName ?? null,
    };
  }

  // --- שלב 3: עסקאות ---
  // ⚠️ המקור מחזיר עסקאות בהיקף גוש-עיר/רחוב, לא ברמת הבניין. לכן מפרידים
  // במפורש בין עסקאות בחלקה עצמה (נתון ברמת הנכס) לבין עסקאות השוואה באזור.
  let transactions: Transaction[] = [];
  let parcelTransactions: Transaction[] = [];
  let dealsPolygonLabel: string | null = null;
  let transactionsScope: string | null = null;
  if (key.lat != null && key.lng != null) {
    try {
      const { street, houseNum } = parseStreetAndNumber(q);
      const lookup = await fetchDealsAtPoint(key.lat, key.lng, { street, houseNum });
      transactions = lookup.transactions;
      parcelTransactions = filterToParcel(transactions, key.gush, key.helka);

      if (lookup.polygon) {
        dealsPolygonLabel = [lookup.polygon.street, lookup.polygon.houseNum]
          .filter((v) => v != null && v !== '')
          .join(' ') || null;
      }
      const streets = new Set(
        transactions.map((t) => (t.address ?? '').replace(/\s+\d+\s*$/, '').trim()).filter(Boolean),
      );
      transactionsScope =
        streets.size > 1
          ? `עסקאות ב-${streets.size} רחובות בסביבת הנכס`
          : streets.size === 1
            ? `עסקאות ברחוב ${[...streets][0]} ובסביבתו`
            : null;

      if (lookup.droppedFutureDated > 0) {
        warnings.push(
          `${lookup.droppedFutureDated} עסקאות נפסלו בשל תאריך עתידי — שגיאת נתונים במקור.`,
        );
      }
      if (!transactions.length) warnings.push('לא נמצאו עסקאות מכר סגורות בסביבת הנכס.');
      else if (!parcelTransactions.length) {
        warnings.push(
          `לא נמצאו עסקאות בחלקה עצמה (גוש ${key.gush ?? '—'} חלקה ${key.helka ?? '—'}). ` +
            'הנתונים המוצגים הם עסקאות השוואה מהסביבה בלבד.',
        );
      }
    } catch (e: any) {
      warnings.push(`עסקאות לא זמינות: ${e?.message ?? e}`);
    }
  }

  // --- שלב 4: מדד למ"ס ---
  let cbs: Awaited<ReturnType<typeof fetchHousingIndex>> | null = null;
  try { cbs = await fetchHousingIndex(24); }
  catch (e: any) { warnings.push(`מדד למ"ס לא זמין: ${e?.message ?? e}`); }

  // --- שלב 5: תכנוני ---
  let planning: Awaited<ReturnType<typeof queryPlanningAtPoint>> | null = null;
  if (key.itmX != null && key.itmY != null) {
    try { planning = await queryPlanningAtPoint(key.itmX, key.itmY); }
    catch (e: any) { warnings.push(`תכנון (XPLAN) לא זמין: ${e?.message ?? e}`); }
  }

  // --- שלב 6: התחדשות עירונית (point-in-polygon מול מתחמי פינוי-בינוי) ---
  let renewal = null as Awaited<ReturnType<typeof checkRenewal>> | null;
  if (key.itmX != null && key.itmY != null) {
    try { renewal = await checkRenewal(key.itmX, key.itmY); }
    catch (e: any) { warnings.push(`התחדשות עירונית לא זמינה: ${e?.message ?? e}`); }
  }

  // --- חישובי שווי ---
  const ppsqmOf = (list: Transaction[]) =>
    list
      .filter((t) => t.price && t.areaSqm)
      .map((t) => pricePerSqm(t.price, t.areaSqm))
      .filter((v): v is number => v !== null);
  // ⚠️ במספר זוגי של פריטים יש לממוצע את שני האיברים באמצע, לא לקחת את
  // העליון מביניהם — אותה תקלה שכבר נמצאה ותוקנה ב-lib/buildreport.ts
  // (median()): "19,000 ו-21,538 ₪ למ"ר" הציגה 21,538 במקום החציון 20,269.
  const medianOf = (nums: number[]) => {
    if (!nums.length) return null;
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };

  const ppsqmValues = ppsqmOf(transactions);          // אזור — בסיס ההשוואה
  const parcelPpsqm = ppsqmOf(parcelTransactions);    // החלקה עצמה
  const medianPpsqm = medianOf(ppsqmValues);
  const medianParcelPpsqm = medianOf(parcelPpsqm);

  // "עסקה אחרונה" חייבת להתייחס לנכס עצמו כשקיים נתון כזה.
  const lastParcelDeal = parcelTransactions[0] ?? null;
  const lastAreaDeal = transactions[0] ?? null;
  const lastDeal = lastParcelDeal ?? lastAreaDeal;

  // המידע אינו תלוי בחלקה — הוא מתאר מה אפשר להזמין ובאיזו עלות.
  const legal = tabuOrderInfo();

  // --- שלב 7: סביבה (ספירת רדיוס אמיתית מהמטמון) ---
  let envMetrics: Awaited<ReturnType<typeof environmentMetrics>> = [];
  try { envMetrics = await environmentMetrics(key.itmX, key.itmY); }
  catch (e: any) { warnings.push(`סביבה לא זמינה: ${e?.message ?? e}`); }
  const envSchools = envMetrics.find((m) => m.label.includes('בתי ספר'));
  const envTransport = envMetrics.find((m) => m.label.includes('תחבורה'));

  // פשיעה — ברמת יישוב בלבד (ראה lib/crime.ts). מזהה היישוב מגיע מ-key.city
  // (שם הקדסטר, המקור החזק ביותר לזיהוי יישוב בקובץ הזה), לא מהגיאוקוד הגולמי.
  let crime: Awaited<ReturnType<typeof crimeProfile>> = null;
  if (key.city) {
    try {
      const cityCode = await findCityCode(key.city);
      crime = await crimeProfile(cityCode);
    } catch (e: any) { warnings.push(`נתוני פשיעה לא זמינים: ${e?.message ?? e}`); }
  }

  const cbsLast = cbs?.points.at(-1) ?? null;

  const layers: LayerData[] = [
    {
      key: 'legal', title: 'שכבה משפטית — טאבו / רמ"י',
      confidence: parcel ? 'medium' : 'low',
      fields: [
        ok('גוש', parcel?.gush ?? null, 'govmap', now, parcel?.status ? `מצב הסדר: ${parcel.status}` : undefined),
        ok('חלקה', parcel?.helka ?? null, 'govmap', now),
        ok('שטח חלקה רשום (מ"ר)', parcel?.legalAreaSqm ?? null, 'govmap', now,
          'שטח החלקה כולה, לא שטח הדירה. אינו אסמכתה חוקית — לאימות יש לפנות ללשכת רישום המקרקעין.'),
        {
          ...pending('תת-חלקה (דירה בבית משותף)', 'tabu', true, 18),
          note: 'תת-חלקה אינה זמינה במקורות הפתוחים ומאומתת רק בנסח טאבו.',
        },
        pending('בעלות וחלק יחסי', 'tabu', true, 18),
        pending('שעבודים ומשכנתאות', 'tabu', true, 18),
        pending('עיקולים והערות אזהרה', 'tabu', true, 18),
        pending('זכויות וחכירה (רמ"י)', 'rami', true, 81),
      ],
    },
    {
      key: 'planning', title: 'שכבה תכנונית — מנהל התכנון (XPLAN)',
      confidence: planning?.landUse ? 'medium' : 'low',
      fields: [
        ok('ייעוד קרקע', planning?.landUse ?? null, 'xplan', planning?.lastUpdated ?? now),
        ok('מספר תב"ע', planning?.planNumber ?? null, 'xplan', planning?.lastUpdated ?? now),
        ok('שם תוכנית', planning?.planName ?? null, 'xplan', planning?.lastUpdated ?? now),
        ok('סטטוס תוכנית', planning?.status ?? null, 'xplan', planning?.lastUpdated ?? now),
        ok('שכבות-על', planning?.overlays?.length ? planning.overlays.join(' · ') : null, 'xplan', now,
          'הגבלות/ייעודים נוספים החלים על הנקודה, למשל שימור או אתר עתיקות.'),
        {
          ...pending('זכויות בנייה (אחוזים, קומות, יח"ד)', 'mavat'),
          note: 'זכויות כמותיות אינן בשירות המפות; הן מופיעות רק בהוראות התכנית ב-MAVAT.',
        },
        pending('היתרי בנייה / חריגות', 'rishui', true),
      ],
    },
    {
      key: 'value', title: 'שכבת שווי — עסקאות סגורות + למ"ס',
      confidence: ppsqmValues.length >= 8 ? 'high' : ppsqmValues.length >= 3 ? 'medium' : 'low',
      fields: [
        ok('עסקאות בחלקה זו', parcelTransactions.length || null, 'carmen', now,
          `גוש ${key.gush ?? '—'} חלקה ${key.helka ?? '—'} — הנתון ברמת הנכס.`),
        ok('חציון מחיר למ"ר בחלקה', medianParcelPpsqm, 'carmen', now,
          parcelPpsqm.length && parcelPpsqm.length < 3
            ? `מבוסס על ${parcelPpsqm.length} עסקאות בלבד — אינדיקציה, לא חציון מייצג.`
            : undefined),
        ok('עסקה אחרונה בחלקה', lastParcelDeal?.price ?? null, 'carmen',
          lastParcelDeal?.dealDate || now),
        ok('עסקאות השוואה בסביבה', transactions.length || null, 'carmen', now,
          [
            transactionsScope,
            dealsPolygonLabel ? `מרכז החיפוש: ${dealsPolygonLabel}` : null,
            'המקור מחזיר עסקאות בהיקף רחוב/גוש-עיר ולא ברמת הבניין.',
          ].filter(Boolean).join(' · ')),
        ok('חציון מחיר למ"ר בסביבה', medianPpsqm, 'carmen', now,
          ppsqmValues.length < 3
            ? 'מבוסס על מדגם קטן — אינדיקציה בלבד.'
            : 'חציון אזורי — עשוי לכלול רחובות ושכונות שונים.'),
        ok(
          cbs?.seriesName ? `מדד ${cbs.seriesName} (למ"ס)` : 'מדד מחירי דירות (למ"ס)',
          cbsLast?.value ?? null, 'cbs', cbsLast?.period || now,
          cbs?.baseDesc ? `בסיס המדד: ${cbs.baseDesc}` : undefined,
        ),
        ok('שינוי שנתי במדד (%)', cbs?.yearChangePct ?? null, 'cbs', cbsLast?.period || now),
        pending('שכ"ד מוערך באזור', 'yadata'),
      ],
    },
    {
      key: 'physical', title: 'שכבה פיזית',
      // ביטחון בינוני רק כשהעסקה היא מהחלקה עצמה; עסקה מהסביבה אינה מעידה על הנכס.
      confidence: lastParcelDeal ? 'medium' : 'low',
      fields: [
        { ...ok('שטח (מ"ר, מעסקה אחרונה)', lastDeal?.areaSqm ?? null, 'carmen', now),
          note: lastParcelDeal
            ? 'מבוסס דיווח בעסקה בחלקה זו — לאימות מול נסח.'
            : 'אין עסקה בחלקה עצמה; הנתון מגיע מעסקה בסביבה ואינו מתאר את הנכס.' },
        ok('חדרים (מעסקה אחרונה)', lastDeal?.rooms ?? null, 'carmen', now),
        ok('קומה (מעסקה אחרונה)', lastDeal?.floor ?? null, 'carmen', now),
        ok('סוג נכס', lastDeal?.dealType ?? null, 'carmen', now),
        {
          ...pending('שנת בנייה', 'carmen'),
          note: 'אינה מוחזרת בשירות העסקאות הנוכחי.',
        },
      ],
    },
    {
      key: 'environment', title: 'סביבה וסיכונים — data.gov.il',
      confidence: envTransport?.count != null ? 'medium' : 'low',
      fields: [
        envSchools?.configured
          ? ok(`בתי ספר ומוסדות חינוך (רדיוס ${(envSchools.radiusM / 1000).toFixed(0)} ק"מ)`, envSchools.count, 'datagov', now, 'ספירה מדויקת ברדיוס מנקודת הנכס — מקור: משרד החינוך.')
          : pending('בתי ספר ומוסדות חינוך', 'datagov'),
        envTransport?.configured
          ? ok(`תחנות תחבורה ציבורית (רדיוס ${(envTransport.radiusM / 1000).toFixed(0)} ק"מ)`, envTransport.count, 'datagov', now, 'ספירה מדויקת ברדיוס מנקודת הנכס — מקור: משרד התחבורה.')
          : pending('תחבורה ציבורית', 'datagov'),
        crime
          ? ok(
              `תיקי פשיעה שנפתחו ביישוב (${crime.year})`, crime.total, 'datagov', now,
              [
                crime.topCategories.length
                  ? `בעיקר: ${crime.topCategories.map((c) => `${c.label} (${c.count.toLocaleString('he-IL')})`).join(', ')}.`
                  : null,
                'ברמת היישוב כולו — משטרת ישראל אינה מפרסמת לציבור את גבולות "האזור הסטטיסטי" ' +
                  'שלה, ולכן זו אינה ספירה שכונתית/רדיוס כמו בתי-הספר והתחבורה למעלה. הנתון הוא ' +
                  'תיקי חקירה שנפתחו (לא הרשעות) — מקור: משטרת ישראל.',
              ].filter(Boolean).join(' '),
            )
          : pending('פשיעה (רמת יישוב)', 'datagov'),
      ],
    },
    {
      key: 'renewal', title: 'פוטנציאל השבחה — התחדשות עירונית',
      confidence: renewal?.inCompound ? 'high' : renewal?.matched ? 'medium' : 'low',
      fields: [
        ok('שיוך למתחם פינוי-בינוי',
          renewal?.inCompound ? (renewal.compoundName || 'כן — במתחם מוכרז')
            : (renewal?.matched ? 'לא נמצא שיוך למתחם מוכרז' : null),
          'hitchadshut', now,
          renewal?.matched && !renewal.inCompound
            ? 'הנכס אינו בתוך מתחם פינוי-בינוי מוכרז (בדיקת point-in-polygon מול משרד הבינוי).'
            : undefined),
        ok('מסלול', renewal?.track ?? null, 'hitchadshut', now),
        ok('סטטוס תוכנית', renewal?.status ?? null, 'hitchadshut', now),
        ok('מכסת יח"ד (מוצע)', renewal?.units ?? null, 'hitchadshut', now),
        ok('מספר תוכנית', renewal?.planNumber ?? null, 'hitchadshut', now),
        ok('שנת הכרזה', renewal?.declaredYear ?? null, 'hitchadshut', now),
      ],
    },
    {
      key: 'documents', title: 'מסמכים ותחזוקה',
      confidence: 'low',
      fields: [pending('תיק נכס מתמשך', 'nadlan_gov')],
    },
  ];

  const cbsPoints = cbs?.points ?? [];
  const base: PropertyProfile = {
    key, layers, transactions, parcelTransactions, transactionsScope,
    cbsIndex: cbsPoints,
    generatedAt: now, warnings,
  };

  const renewalBonus = renewal?.inCompound ? 15 : 0;
  const opp = opportunityScore(base, renewalBonus);
  const deal = dealQuality(
    base,
    Number.isFinite(askPrice) ? askPrice : null,
    lastDeal?.areaSqm ?? null,
  );

  const profile: PropertyProfile & { legal: typeof legal; dealQuality: typeof deal } = {
    ...base,
    cbsIndexMeta: cbs
      ? { seriesName: cbs.seriesName, baseDesc: cbs.baseDesc, yearChangePct: cbs.yearChangePct }
      : null,
    identification,
    opportunityScore: opp,
    legal,
    dealQuality: deal,
  };

  // אחסון best-effort — לעולם לא שובר את התגובה.
  try { await cacheProfile(profile); } catch { /* אופציונלי */ }

  return NextResponse.json(profile);
}
