import type { AuthError } from "@supabase/supabase-js";

/**
 * מתרגם את שגיאת האימות של מסך הכניסה להודעה בעברית לפי הקוד שהשרת החזיר.
 *
 * מה שהיה כאן קודם: `signIn` החזיר את `error.message` כפי שהוא, ומסך המנהל
 * הדפיס אותו. כלומר מייל שלא אומת הופיע כ-"Email not confirmed", חסימת קצב
 * כ-"Request rate limit reached" ונפילת רשת כ-"Failed to fetch" — באנגלית,
 * בתוך ממשק עברי, בלי לומר מה לעשות. שלוש התשובות האלה דורשות שלוש פעולות
 * שונות, ורק אחת מהן היא "נסו סיסמה אחרת".
 *
 * המסך הזה הוא כניסה בלבד (אין בו הרשמה), ולכן אין כאן קודים של signup.
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
      return "האימייל או הסיסמה שגויים.";
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
