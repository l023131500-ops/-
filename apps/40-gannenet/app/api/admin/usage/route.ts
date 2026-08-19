import { NextRequest, NextResponse } from "next/server";
import { peekSystemUsage, QUOTA_UNAVAILABLE_MSG } from "@/lib/rate-limit";

export const runtime = "nodejs";
// אותה סיבה כמו ב-/api/ai-generate/quota: מכסה שנקראת ממטמון מראה מספר ישן
// בדיוק ברגע שהוא משתנה, וכאן זה המספר שאמור להתריע לפני שהוא נגמר.
export const dynamic = "force-dynamic";

// זהה ל-/api/admin/list ו-/api/admin/delete: אותה סיסמת ניהול, אותה כותרת.
function authorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key") || "";
  const pass = process.env.ADMIN_PASSWORD || "";
  return Boolean(pass) && key === pass;
}

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
  if (!authorized(req)) return new NextResponse("unauthorized", { status: 401 });
  const usage = await peekSystemUsage();
  if (!usage) return NextResponse.json({ error: QUOTA_UNAVAILABLE_MSG }, { status: 503 });
  return NextResponse.json({ usage });
}
