import type { AuthError } from "@supabase/supabase-js";

/**
 * מתרגם את שגיאת האימות של מסך "כניסת ניהול" להודעה בעברית לפי הקוד שהשרת החזיר.
 *
 * מה שהיה כאן קודם: `AdminLogin` הדפיס `"שגיאה בכניסה: " + error.message`.
 * הקידומת בעברית, ההודעה עצמה באנגלית — "Email not confirmed", "Request rate
 * limit reached", "Failed to fetch". שלוש תשובות שדורשות שלוש פעולות שונות
 * מהאדם שיושב מול המסך, ואף אחת מהן אינה "נסו סיסמה אחרת".
 *
 * שני הבדלים מהמערכות האחרות בסבב הזה, שנמדדו על המסך הזה ולא הועתקו:
 * 1. השדה הראשון מסומן "שם משתמש", לא אימייל — `handleLogin` משלים
 *    `@admin.local` לכל ערך בלי `@`. לכן invalid_credentials כאן הוא
 *    "שם המשתמש או הסיסמה שגויים", ולומר "האימייל" היה שולח את המנהל לחפש
 *    טעות בשדה שהוא לא מילא.
 * 2. שם משתמש כזה לעולם לא עבר אימות מייל (הכתובת אינה קיימת), ולכן
 *    email_not_confirmed מגיע רק למי שהתחבר עם כתובת אמיתית — הניסוח מכוון
 *    לקישור שנשלח למייל.
 *
 * קוד שלא מוכר כאן מוצג עם ההודעה המקורית — עדיף טקסט אנגלי מאשר לבלוע
 * שגיאה אמיתית מאחורי נוסח כללי.
 */
export const authErrorMessage = (
  error: Pick<AuthError, "message"> & { code?: string; status?: number },
): string => {
  switch (error.code) {
    case "email_not_confirmed":
      return "המייל עדיין לא אומת. פתחו את קישור האימות שנשלח אליכם ואז התחברו — הסיסמה עצמה תקינה.";
    case "invalid_credentials":
      return "שם המשתמש או הסיסמה שגויים.";
    case "user_banned":
      return "החשבון הזה חסום. פנו למנהל המערכת.";
    case "over_request_rate_limit":
      return "יותר מדי ניסיונות. המתינו דקה ונסו שוב.";
  }

  if (error.status === 429) {
    return "יותר מדי ניסיונות. המתינו דקה ונסו שוב.";
  }

  // AuthRetryableFetchError — הבקשה לא הגיעה לשרת בכלל (רשת/נטפרי).
  // אין לה code, ו-status הוא 0, ולכן היא נופלת לכאן ולא לאף ענף למעלה.
  if (error.status === 0) {
    return "לא הצלחנו להגיע לשרת. בדקו את החיבור לאינטרנט ונסו שוב.";
  }

  return `שגיאה בהתחברות: ${error.message}`;
};
