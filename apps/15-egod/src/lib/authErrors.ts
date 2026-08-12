import type { AuthError } from "@supabase/supabase-js";

// המינימום שהאימות עצמו אוכף: signup עם 4 תווים חוזר
// weak_password / "Password should be at least 6 characters".
// מוצג ליד השדה, נאכף ב-minLength ונבדק לפני השליחה — כולם קוראים את הקבוע הזה.
export const PASSWORD_MIN_LENGTH = 6;

/**
 * מתרגם את שגיאת האימות להודעה בעברית לפי הקוד שהשרת החזיר.
 *
 * העיקר: **מייל שלא אומת אינו סיסמה שגויה.** קודם כל שגיאה הוצגה כטקסט
 * האנגלי הגולמי של Supabase, כך שמי שנרשם ולא אימת קיבל
 * "Invalid login credentials"/"Email not confirmed" ולא ידע מה לעשות.
 * קוד שלא מוכר כאן מוצג עם ההודעה המקורית — עדיף טקסט זר מאשר לבלוע
 * שגיאה אמיתית מאחורי נוסח כללי.
 */
export const authErrorMessage = (
  error: Pick<AuthError, "message"> & { code?: string; status?: number },
  context: "login" | "signup",
): string => {
  switch (error.code) {
    case "email_not_confirmed":
      return "המייל עדיין לא אומת. פתחו את קישור האימות שנשלח אליכם ואז התחברו — הסיסמה עצמה תקינה.";
    case "invalid_credentials":
      return "האימייל או הסיסמה שגויים.";
    case "user_already_exists":
    case "email_exists":
      return "כתובת המייל הזו כבר רשומה. עברו להתחברות במקום להרשמה.";
    case "weak_password":
      return `הסיסמה חייבת להיות באורך ${PASSWORD_MIN_LENGTH} תווים לפחות.`;
    case "signup_disabled":
      return "ההרשמה סגורה כרגע.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "יותר מדי ניסיונות. המתינו דקה ונסו שוב.";
  }

  if (error.status === 429) {
    return "יותר מדי ניסיונות. המתינו דקה ונסו שוב.";
  }

  const prefix = context === "signup" ? "שגיאה בהרשמה" : "שגיאה בהתחברות";
  return `${prefix}: ${error.message}`;
};
