// ==== התראות אזוריות — שלב ב: התאמה ומשלוח ====
//
// שלב א (`app/api/area-alert/route.ts`) בנה רק את הקליטה: הרשמה אמיתית ל-
// `nadlan.area_alerts`, בלי שום בדיקה תקופתית או מייל (ראה NEEDS_USER.md,
// 19/08). שלב ג (20/08) הוסיף תזמון אוטומטי: `app/api/cron/area-alerts/route.ts`
// מופעל יומית ע"י Vercel Cron (`vercel.json`), וקורא לאותו מנוע בדיוק שמופעל
// **גם** ידנית ממרכז השליטה (`/admin`) — באותו דפוס שכבר קיים לתור הבקשות,
// הפקה+שליחה כפעולה אחת.
//
// ⚠️ דיוק ההתאמה הוא הכלל: עסקה "חדשה" מוגדרת רק כעסקה על **אותו גוש/חלקה**
// (או אותו רחוב+מספר בית, כשאין גוש/חלקה) — לא כל עסקה באזור הרחב שמחזיר
// GovMap. אותה סכנת "רדיוס רחב מדי" שתועדה ב-CLAUDE.md/lib/nadlan.ts
// (הרצל 42 -> עסקאות מ-15 גושים) חלה כאן שבעתיים: מייל שגוי גרוע ממייל שלא
// נשלח.
//
// [25/08/2026] המנוע גם עוקב אחר תוכניות בנייה/תב"ע קרובות (`nearbyConstructionPlans`,
// XPLAN — אותו מקור שכבר משמש את פאנל "מה נבנה באזור?" בדוח עצמו), לא רק
// עסקאות שנרשמו — ראה `PRODUCT_TIERS`/NADLAN_PRO מודול 3 ("היתר/תב"ע חדשה").

import { parcelAtPoint, parcelByGushHelka } from './cadastre';
import { emailConfigured, sendEmail } from './email';
import { geocodeAddress } from './geocode';
import { itmToWgs84 } from './itm';
import { nearbyConstructionPlans, type NearbyPlan } from './nearbyplans';
import {
  dealKey,
  fetchDealsAtPoint,
  filterToAddress,
  filterToParcel,
  parseStreetAndNumber,
} from './nadlan';
import { getStore } from './store';
import type { Transaction } from './types';

export interface AreaAlertRow {
  id: number;
  email: string;
  address: string | null;
  gush: string | null;
  helka: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
  last_checked_at: string | null;
  last_error: string | null;
  notified_deal_keys: string[];
  notified_plan_keys: string[];
}

export interface AreaAlertCheckResult {
  id: number;
  ok: boolean;
  emailed: boolean;
  newDealsCount: number;
  newPlansCount: number;
  error: string | null;
}

/**
 * מפתח תכנית לצורך "נשלח כבר?" — כולל את הסטטוס בכוונה: כשתכנית מתקדמת
 * שלב (למשל "בבדיקה תכנונית" -> "אישור") זה בפועל חדשות חדשות ללקוח, לא
 * אותה התראה שכבר קיבל. תכנית בלי מספר רשמי (נדיר) נופלת חזרה למיקום שלה.
 */
function planKey(p: NearbyPlan): string {
  const id = p.planNumber ?? `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  return `${id}|${p.status ?? ''}`;
}

/** מונע מ-`notified_deal_keys` לגדול בלי גבול על התראה ותיקה מאוד. */
const MAX_KEPT_KEYS = 500;

export async function listAreaAlerts(): Promise<AreaAlertRow[]> {
  const db = getStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  const { data, error } = await db
    .from('area_alerts')
    .select(
      'id,email,address,gush,helka,city,active,created_at,last_checked_at,last_error,notified_deal_keys,notified_plan_keys',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    notified_deal_keys: Array.isArray(r.notified_deal_keys) ? r.notified_deal_keys : [],
    notified_plan_keys: Array.isArray(r.notified_plan_keys) ? r.notified_plan_keys : [],
  }));
}

async function resolvePoint(
  alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>,
): Promise<{
  lat: number;
  lng: number;
  itmX: number;
  itmY: number;
  gush: string | null;
  helka: string | null;
  street: string | null;
  houseNum: number | null;
} | null> {
  // מסלול 1: גוש/חלקה נמסרו ישירות — הכי מדויק, אין צורך בגיאוקוד.
  if (alert.gush && alert.helka) {
    const parcel = await parcelByGushHelka(alert.gush, alert.helka);
    if (parcel?.centroidItm) {
      const { lat, lng } = itmToWgs84(parcel.centroidItm.x, parcel.centroidItm.y);
      return {
        lat,
        lng,
        itmX: parcel.centroidItm.x,
        itmY: parcel.centroidItm.y,
        gush: alert.gush,
        helka: alert.helka,
        street: null,
        houseNum: null,
      };
    }
    // גוש/חלקה שאינם מזוהים עוד (חלוקה מחדש וכד') — נופלים לכתובת אם יש.
  }

  if (!alert.address) return null;
  const query = [alert.address, alert.city].filter(Boolean).join(' ');
  const results = await geocodeAddress(query).catch(() => []);
  const best = results.find((r) => r.cityVerified) ?? results[0] ?? null;
  if (!best) return null;

  const { street, houseNum } = parseStreetAndNumber(alert.address);
  const parcel = await parcelAtPoint(best.itmX, best.itmY).catch(() => null);
  return {
    lat: best.lat,
    lng: best.lng,
    itmX: best.itmX,
    itmY: best.itmY,
    gush: parcel?.gush ?? null,
    helka: parcel?.helka ?? null,
    street,
    houseNum,
  };
}

/** עסקאות חדשות בלבד: אחרי ההרשמה, ושעדיין לא נשלחו על אודותיהן. */
function newDealsOnly(
  candidates: Transaction[],
  createdAt: string,
  alreadyNotified: string[],
): Transaction[] {
  const seen = new Set(alreadyNotified);
  return candidates.filter((t) => {
    if (!t.dealDate || t.dealDate <= createdAt) return false;
    return !seen.has(dealKey(t));
  });
}

/**
 * תכניות חדשות (או שהתקדמו שלב) בלבד. בניגוד לעסקאות, אין כאן סינון לפי
 * `createdAt` — תכנית שהייתה קיימת כבר ביום ההרשמה עדיין שווה התראה בפעם
 * הראשונה שהמנוע רואה אותה (המנוע עצמו חדש, ל-`alert` ותיקה אין עדיין
 * `notified_plan_keys`), אבל לא תישלח שוב בכל ריצה — `planKey` נכנס ל-ledger
 * מיד אחרי השליחה הראשונה, כמו `notified_deal_keys`.
 */
function newPlansOnly(candidates: NearbyPlan[], alreadyNotified: string[]): NearbyPlan[] {
  const seen = new Set(alreadyNotified);
  return candidates.filter((p) => !seen.has(planKey(p)));
}

function money(n: number | null): string {
  return n != null ? `${n.toLocaleString('he-IL')} ₪` : 'לא זמין';
}

function reportUrl(baseUrl: string, alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>): string {
  const q =
    alert.address ? [alert.address, alert.city].filter(Boolean).join(' ') : `גוש ${alert.gush} חלקה ${alert.helka}`;
  return `${baseUrl}/report?q=${encodeURIComponent(q)}`;
}

function dealsSectionHtml(deals: Transaction[]): string {
  if (!deals.length) return '';
  const rows = deals
    .slice(0, 20)
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${t.dealDate ? new Date(t.dealDate).toLocaleDateString('he-IL') : '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700">${money(t.price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${t.areaSqm ?? '—'} מ"ר · ${t.rooms ?? '—'} חדרים${t.floor ? ` · קומה ${t.floor}` : ''}</td>
      </tr>`,
    )
    .join('');

  return `<h3 style="color:#0f2f4f;margin:22px 0 6px">${deals.length} עסקאות חדשות נרשמו במרשם</h3>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:0">
      הנתונים מגיעים ישירות ממרשם העסקאות הממשלתי (govmap.gov.il), לפי אותו גוש/חלקה שנרשמת אליו.
    </p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">תאריך</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">מחיר</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">פרטים</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function plansSectionHtml(plans: NearbyPlan[]): string {
  if (!plans.length) return '';
  const rows = plans
    .slice(0, 20)
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${p.planNumber ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${p.planName ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700">${p.status ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px">${p.distanceM} מ'</td>
      </tr>`,
    )
    .join('');

  return `<h3 style="color:#0f2f4f;margin:22px 0 6px">${plans.length} תוכניות בנייה/תב"ע חדשות או שהתקדמו שלב</h3>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:0">
      הנתונים מגיעים ממרשם התכנון הארצי (XPLAN, משרד הפנים), ברדיוס עד 400 מ' מהנקודה שנרשמת אליה.
    </p>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">מס' תוכנית</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">שם</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">סטטוס</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">מרחק</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function alertEmailHtml(
  alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>,
  deals: Transaction[],
  plans: NearbyPlan[],
  baseUrl: string,
): string {
  const label = alert.address || [alert.city, alert.gush && `גוש ${alert.gush} חלקה ${alert.helka}`].filter(Boolean).join(' · ') || 'האזור שנרשמת אליו';

  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0f2f4f">עדכון חדש ב${label}</h2>
    ${dealsSectionHtml(deals)}
    ${plansSectionHtml(plans)}
    <p style="margin-top:18px">
      <a href="${reportUrl(baseUrl, alert)}" style="background:#0e7c7b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">לדוח המלא</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;margin-top:20px">
      קיבלת מייל זה כי נרשמת להתראות עבור ${label} ב"נדל״ן ברגע". אם זו טעות — אפשר להתעלם מהמייל.
    </p>
  </div>`;
}

/**
 * בדיקת התראה בודדת: מאתר את הנקודה, שולף עסקאות מועמדות ותוכניות-בנייה
 * קרובות, ושולח מייל רק על מה שחדש. מעדכן `last_checked_at`/
 * `notified_deal_keys`/`notified_plan_keys` רק כשהבדיקה הושלמה בלי חריגה —
 * כשל אמיתי משאיר את ההתראה כמו שהייתה, לניסיון הבא.
 *
 * תוכניות אין להן שדה תאריך-פרסום שאפשר להשוות מול `created_at` (בשונה
 * מעסקאות, שיש להן `dealDate`) — ולכן בבדיקה **הראשונה** של התראה
 * (`last_checked_at===null`) כל התוכניות שכבר קיימות באזור נרשמות כ"ידועות"
 * (baseline) בלי לשלוח עליהן מייל, כדי לא להציף מנוי חדש בהיסטוריית תכנון
 * שלמה שהייתה קיימת עוד לפני שנרשם. רק תוכנית חדשה/שהתקדמה שלב **אחרי**
 * הבדיקה הראשונה נשלחת בפועל.
 */
export async function checkAreaAlert(alert: AreaAlertRow, baseUrl: string): Promise<AreaAlertCheckResult> {
  const db = getStore();
  if (!db)
    return { id: alert.id, ok: false, emailed: false, newDealsCount: 0, newPlansCount: 0, error: 'Supabase לא מוגדר' };

  try {
    const point = await resolvePoint(alert);
    if (!point) {
      await db
        .from('area_alerts')
        .update({ last_checked_at: new Date().toISOString(), last_error: 'לא אותרה נקודת מיקום לכתובת/לגוש-חלקה' })
        .eq('id', alert.id);
      return {
        id: alert.id,
        ok: false,
        emailed: false,
        newDealsCount: 0,
        newPlansCount: 0,
        error: 'לא אותרה נקודת מיקום',
      };
    }

    const lookup = await fetchDealsAtPoint(point.lat, point.lng, {
      street: point.street,
      houseNum: point.houseNum,
    });

    const candidates =
      point.gush && point.helka
        ? filterToParcel(lookup.transactions, point.gush, point.helka)
        : filterToAddress(lookup.transactions, [point.street], point.houseNum);

    const freshDeals = newDealsOnly(candidates, alert.created_at, alert.notified_deal_keys);

    // תוכניות: כשל שליפה (רשת/שרת) לא אמור להפיל את בדיקת העסקאות, שכבר
    // עבדה לבדה חודשים — נופל לרשימה ריקה, לא זורק.
    const nearbyPlans = await nearbyConstructionPlans(point.itmX, point.itmY).catch(() => [] as NearbyPlan[]);
    const isFirstCheck = alert.last_checked_at === null;
    const freshPlans = isFirstCheck ? [] : newPlansOnly(nearbyPlans, alert.notified_plan_keys);
    const planKeys = [...new Set([...alert.notified_plan_keys, ...nearbyPlans.map(planKey)])].slice(-MAX_KEPT_KEYS);

    if (!freshDeals.length && !freshPlans.length) {
      await db
        .from('area_alerts')
        .update({ last_checked_at: new Date().toISOString(), last_error: null, notified_plan_keys: planKeys })
        .eq('id', alert.id);
      return { id: alert.id, ok: true, emailed: false, newDealsCount: 0, newPlansCount: 0, error: null };
    }

    if (!emailConfigured()) {
      return {
        id: alert.id,
        ok: false,
        emailed: false,
        newDealsCount: freshDeals.length,
        newPlansCount: freshPlans.length,
        error: 'RESEND_API_KEY/RESEND_FROM אינם מוגדרים — לא ניתן לשלוח',
      };
    }

    const subject = freshDeals.length && freshPlans.length
      ? `עדכון: עסקה חדשה + תוכנית בנייה ${alert.address ?? alert.city ?? ''}`.trim()
      : freshDeals.length
        ? `עסקה חדשה נרשמה ${alert.address ?? alert.city ?? ''}`.trim()
        : `תוכנית בנייה חדשה ${alert.address ?? alert.city ?? ''}`.trim();

    const sent = await sendEmail({
      to: alert.email,
      subject,
      html: alertEmailHtml(alert, freshDeals, freshPlans, baseUrl),
    });
    if (!sent.ok) {
      await db.from('area_alerts').update({ last_error: sent.error }).eq('id', alert.id);
      return {
        id: alert.id,
        ok: false,
        emailed: false,
        newDealsCount: freshDeals.length,
        newPlansCount: freshPlans.length,
        error: sent.error,
      };
    }

    const dealKeys = [...alert.notified_deal_keys, ...freshDeals.map(dealKey)].slice(-MAX_KEPT_KEYS);
    await db
      .from('area_alerts')
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: null,
        notified_deal_keys: dealKeys,
        notified_plan_keys: planKeys,
      })
      .eq('id', alert.id);
    return {
      id: alert.id,
      ok: true,
      emailed: true,
      newDealsCount: freshDeals.length,
      newPlansCount: freshPlans.length,
      error: null,
    };
  } catch (e: any) {
    const message = String(e?.message ?? e);
    try {
      await db.from('area_alerts').update({ last_error: message }).eq('id', alert.id);
    } catch {
      /* עדיף שגיאה חוזרת בניהול מאשר לשבור את הבדיקה בגלל כשל בכתיבת הלוג */
    }
    return { id: alert.id, ok: false, emailed: false, newDealsCount: 0, newPlansCount: 0, error: message };
  }
}

export async function checkAllActiveAlerts(baseUrl: string): Promise<AreaAlertCheckResult[]> {
  const all = await listAreaAlerts();
  const active = all.filter((a) => a.active);
  const out: AreaAlertCheckResult[] = [];
  // ברצף, לא במקביל: כל בדיקה קוראת ל-GovMap פעמים אחדות, וריצה מקבילה
  // על עשרות התראות עלולה להיראות כמו הצפה של אותו שרת ציבורי חופשי.
  for (const alert of active) {
    out.push(await checkAreaAlert(alert, baseUrl));
  }
  return out;
}

