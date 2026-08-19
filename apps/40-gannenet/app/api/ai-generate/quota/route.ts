import { NextRequest, NextResponse } from "next/server";
import { callerFromRequest, GENERATE_AUTH_REQUIRED_MSG } from "@/lib/require-user";
import { peekQuota, QUOTA_UNAVAILABLE_MSG } from "@/lib/rate-limit";

export const runtime = "nodejs";
// ספירה אחת מול Storage. אין כאן שום דבר לשמור במטמון: מכסה שנקראת מהמטמון היא
// מכסה שמראה מספר ישן בדיוק ברגע שבו הוא משתנה.
export const dynamic = "force-dynamic";

/**
 * "כמה נשאר לי היום" — מה שהמסך שואל לפני שהגננת לוחצת.
 *
 * התקרה של #186 נאכפה ולא הוצגה: הדרך היחידה לפגוש אותה הייתה להיחסם באמצע
 * הכנת שבוע עבודה. הנתיב הזה קורא בלבד — הוא לא מזמין, לא כותב סימון, ולא
 * מוציא שקל — ולכן אין סיבה לגדר אותו יותר מהמחולל עצמו: אותה בדיקת חשבון,
 * ורק על המכסה של מי ששואלת.
 */
export async function GET(req: NextRequest) {
  const caller = await callerFromRequest(req);
  if (!caller) {
    return NextResponse.json({ error: GENERATE_AUTH_REQUIRED_MSG, authRequired: true }, { status: 401 });
  }
  const quota = await peekQuota(caller.id);
  if (!quota) {
    return NextResponse.json({ error: QUOTA_UNAVAILABLE_MSG }, { status: 503 });
  }
  return NextResponse.json({ quota });
}
