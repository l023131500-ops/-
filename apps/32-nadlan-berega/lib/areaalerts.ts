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

import { parcelAtPoint, parcelByGushHelka } from './cadastre';
import { emailConfigured, sendEmail } from './email';
import { geocodeAddress } from './geocode';
import { itmToWgs84 } from './itm';
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
}

export interface AreaAlertCheckResult {
  id: number;
  ok: boolean;
  emailed: boolean;
  newDealsCount: number;
  error: string | null;
}

/** מונע מ-`notified_deal_keys` לגדול בלי גבול על התראה ותיקה מאוד. */
const MAX_KEPT_KEYS = 500;

export async function listAreaAlerts(): Promise<AreaAlertRow[]> {
  const db = getStore();
  if (!db) throw new Error('Supabase לא מוגדר (SUPABASE_URL / SUPABASE_SERVICE_KEY).');
  const { data, error } = await db
    .from('area_alerts')
    .select(
      'id,email,address,gush,helka,city,active,created_at,last_checked_at,last_error,notified_deal_keys',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    ...r,
    notified_deal_keys: Array.isArray(r.notified_deal_keys) ? r.notified_deal_keys : [],
  }));
}

async function resolvePoint(
  alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>,
): Promise<{
  lat: number;
  lng: number;
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
      return { lat, lng, gush: alert.gush, helka: alert.helka, street: null, houseNum: null };
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

function money(n: number | null): string {
  return n != null ? `${n.toLocaleString('he-IL')} ₪` : 'לא זמין';
}

function reportUrl(baseUrl: string, alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>): string {
  const q =
    alert.address ? [alert.address, alert.city].filter(Boolean).join(' ') : `גוש ${alert.gush} חלקה ${alert.helka}`;
  return `${baseUrl}/report?q=${encodeURIComponent(q)}`;
}

function alertEmailHtml(
  alert: Pick<AreaAlertRow, 'address' | 'city' | 'gush' | 'helka'>,
  deals: Transaction[],
  baseUrl: string,
): string {
  const label = alert.address || [alert.city, alert.gush && `גוש ${alert.gush} חלקה ${alert.helka}`].filter(Boolean).join(' · ') || 'האזור שנרשמת אליו';
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

  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0f2f4f">עסקה חדשה נרשמה ב${label}</h2>
    <p style="color:#6b7280;font-size:14px;line-height:1.6">
      נמצאו ${deals.length} עסקאות חדשות שנרשמו במרשם מאז שנרשמת להתראות. הנתונים מגיעים ישירות
      ממרשם העסקאות הממשלתי (govmap.gov.il), לפי אותו גוש/חלקה שנרשמת אליו.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <thead>
        <tr>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">תאריך</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">מחיר</th>
          <th style="text-align:right;padding:8px 10px;border-bottom:2px solid #0e7c7b;font-size:12px;color:#6b7280">פרטים</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:18px">
      <a href="${reportUrl(baseUrl, alert)}" style="background:#0e7c7b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">לדוח המלא</a>
    </p>
    <p style="color:#9ca3af;font-size:11px;margin-top:20px">
      קיבלת מייל זה כי נרשמת להתראות עבור ${label} ב"נדל״ן ברגע". אם זו טעות — אפשר להתעלם מהמייל.
    </p>
  </div>`;
}

/**
 * בדיקת התראה בודדת: מאתר את הנקודה, שולף עסקאות מועמדות, מסנן ל**אותו**
 * גוש/חלקה (או כתובת מדויקת), ושולח מייל רק על מה שחדש מאז ההרשמה ומאז
 * המייל הקודם. מעדכן `last_checked_at`/`notified_deal_keys` רק כשהבדיקה
 * הושלמה בלי חריגה — כשל אמיתי משאיר את ההתראה כמו שהייתה, לניסיון הבא.
 */
export async function checkAreaAlert(alert: AreaAlertRow, baseUrl: string): Promise<AreaAlertCheckResult> {
  const db = getStore();
  if (!db) return { id: alert.id, ok: false, emailed: false, newDealsCount: 0, error: 'Supabase לא מוגדר' };

  try {
    const point = await resolvePoint(alert);
    if (!point) {
      await db
        .from('area_alerts')
        .update({ last_checked_at: new Date().toISOString(), last_error: 'לא אותרה נקודת מיקום לכתובת/לגוש-חלקה' })
        .eq('id', alert.id);
      return { id: alert.id, ok: false, emailed: false, newDealsCount: 0, error: 'לא אותרה נקודת מיקום' };
    }

    const lookup = await fetchDealsAtPoint(point.lat, point.lng, {
      street: point.street,
      houseNum: point.houseNum,
    });

    const candidates =
      point.gush && point.helka
        ? filterToParcel(lookup.transactions, point.gush, point.helka)
        : filterToAddress(lookup.transactions, [point.street], point.houseNum);

    const fresh = newDealsOnly(candidates, alert.created_at, alert.notified_deal_keys);

    if (!fresh.length) {
      await db
        .from('area_alerts')
        .update({ last_checked_at: new Date().toISOString(), last_error: null })
        .eq('id', alert.id);
      return { id: alert.id, ok: true, emailed: false, newDealsCount: 0, error: null };
    }

    if (!emailConfigured()) {
      return {
        id: alert.id,
        ok: false,
        emailed: false,
        newDealsCount: fresh.length,
        error: 'RESEND_API_KEY/RESEND_FROM אינם מוגדרים — לא ניתן לשלוח',
      };
    }

    const sent = await sendEmail({
      to: alert.email,
      subject: `עסקה חדשה נרשמה ${alert.address ?? alert.city ?? ''}`.trim(),
      html: alertEmailHtml(alert, fresh, baseUrl),
    });
    if (!sent.ok) {
      await db.from('area_alerts').update({ last_error: sent.error }).eq('id', alert.id);
      return { id: alert.id, ok: false, emailed: false, newDealsCount: fresh.length, error: sent.error };
    }

    const keys = [...alert.notified_deal_keys, ...fresh.map(dealKey)].slice(-MAX_KEPT_KEYS);
    await db
      .from('area_alerts')
      .update({ last_checked_at: new Date().toISOString(), last_error: null, notified_deal_keys: keys })
      .eq('id', alert.id);
    return { id: alert.id, ok: true, emailed: true, newDealsCount: fresh.length, error: null };
  } catch (e: any) {
    const message = String(e?.message ?? e);
    try {
      await db.from('area_alerts').update({ last_error: message }).eq('id', alert.id);
    } catch {
      /* עדיף שגיאה חוזרת בניהול מאשר לשבור את הבדיקה בגלל כשל בכתיבת הלוג */
    }
    return { id: alert.id, ok: false, emailed: false, newDealsCount: 0, error: message };
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

