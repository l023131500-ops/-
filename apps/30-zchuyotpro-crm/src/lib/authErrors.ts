import type { AuthError } from "@supabase/supabase-js";

type AnyAuthError = Pick<AuthError, "message"> & { code?: string; status?: number };

/**
 * מתרגם שגיאת אימות של Supabase להודעה בעברית לפי הקוד שהשרת החזיר.
 *
 * מה שהיה כאן קודם: ארבעת מסלולי האימות של המערכת הזו העבירו את
 * `error.message` כפי שהוא ל-`toast.error(..., { description })` — כלומר
 * האנגלית הגולמית של GoTrue מתחת לכותרת עברית. "Email not confirmed" ו-
 * "Invalid login credentials" נראו לקורא עברית כאותה תקלה בדיוק, והראשונה
 * שולחת דווקא את מי שהקליד את הסיסמה הנכונה לנסות סיסמאות אחרות.
 *
 * המסך הזה רחב יותר מאלה שבמערכות 21/22: הוא כולל התחברות, הרשמה, שליחת
 * מייל איפוס ועדכון סיסמה בפועל — ולכן יש כאן גם קודים של signup, של
 * קצב שליחת מיילים ושל `updateUser`.
 *
 * שדה ההתחברות כאן מסומן "אימייל" ומוגדר `type="email"`, ולכן
 * invalid_credentials אומר "האימייל או הסיסמה" (במערכת 21 אותו קוד אומר
 * "שם המשתמש", כי שם השדה הוא שם משתמש).
 *
 * קוד שלא מוכר מוצג עם ההודעה המקורית: עדיף טקסט אנגלי מאשר לבלוע שגיאה
 * אמיתית מאחורי נוסח כללי.
 */
export const authErrorMessage = (error: AnyAuthError): string => {
  switch (error.code) {
    // — התחברות —
    case "email_not_confirmed":
      return "המייל עדיין לא אומת. פתחו את קישור האימות שנשלח אליכם ואז התחברו — הסיסמה עצמה תקינה.";
    case "invalid_credentials":
      return "האימייל או הסיסמה שגויים.";
    case "user_banned":
      return "החשבון הזה חסום. פנו למנהל המערכת.";

    // — הרשמה —
    case "user_already_exists":
    case "email_exists":
      return "כתובת המייל הזו כבר רשומה. עברו להתחברות, ואם שכחתם את הסיסמה — אפסו אותה.";
    case "weak_password":
      return "הסיסמה חלשה מדי. בחרו סיסמה ארוכה יותר.";
    case "signup_disabled":
      return "ההרשמה סגורה כרגע. פנו למנהל המערכת.";
    case "email_address_invalid":
    case "validation_failed":
      return "כתובת המייל אינה תקינה.";

    // — עדכון סיסמה (`updateUser` במסך /reset-password) —
    case "same_password":
      return "הסיסמה החדשה זהה לסיסמה הקיימת. בחרו סיסמה אחרת.";
    case "session_not_found":
    case "refresh_token_not_found":
      return "קישור האיפוס פג. בקשו קישור חדש ממסך ההתחברות.";
    case "reauthentication_needed":
      return "לצורך שינוי הסיסמה יש להתחבר מחדש.";

    // — קצב —
    case "over_email_send_rate_limit":
      return "נשלחו יותר מדי מיילים לכתובת הזו. המתינו כמה דקות ונסו שוב.";
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

  return `שגיאה: ${error.message}`;
};
