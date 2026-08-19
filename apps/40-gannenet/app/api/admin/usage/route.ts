import { NextRequest, NextResponse } from "next/server";
import { peekSystemUsage, QUOTA_UNAVAILABLE_MSG } from "@/lib/rate-limit";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
// אותה סיבה כמו ב-/api/ai-generate/quota: מכסה שנקראת ממטמון מראה מספר ישן
// בדיוק ברגע שהוא משתנה, וכאן זה המספר שאמור להתריע לפני שהוא נגמר.
export const dynamic = "force-dynamic";

/**
 * "כמה מהתקרה של כלל המערכת נוצל היום" — הצד שחסר.
 *
 * #186 קבע תקרה כללית (200 דפים ליום), ו-#188 הראה לגננת את התקרה שלה. מה
 * שנשאר פתוח הוא שהתקרה הכללית היא היחידה שחוסמת מישהי בגלל שימוש של אחרות,
 * ואין שום מסך שבו רואים אותה מתמלאת. הנתיב הזה קורא בלבד — LIST אחד, בלי
 * סימון, בלי הזמנה ובלי קריאה ל-Anthropic.
 *
 * POST ולא GET כי הסיסמה נשלחת בכותרת ושאר נתיבי הניהול כאן כבר עשויים כך.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return new NextResponse("unauthorized", { status: 401 });
  const usage = await peekSystemUsage();
  if (!usage) return NextResponse.json({ error: QUOTA_UNAVAILABLE_MSG }, { status: 503 });
  return NextResponse.json({ usage });
}
