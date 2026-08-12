import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";

describe("authErrorMessage", () => {
  it("מפריד בין מייל שלא אומת לבין סיסמה שגויה", () => {
    // שתי התשובות האלה הגיעו קודם כ-"שגיאה בכניסה: Email not confirmed" ו-
    // "שגיאה בכניסה: Invalid login credentials" — אותה צורה, פעולה אחרת.
    const notConfirmed = authErrorMessage({
      code: "email_not_confirmed",
      status: 400,
      message: "Email not confirmed",
    });
    const wrongPassword = authErrorMessage({
      code: "invalid_credentials",
      status: 400,
      message: "Invalid login credentials",
    });

    expect(notConfirmed).toContain("קישור האימות");
    expect(wrongPassword).toBe("שם המשתמש או הסיסמה שגויים.");
    expect(notConfirmed).not.toBe(wrongPassword);
  });

  it("אומר 'שם המשתמש', כי השדה במסך הזה אינו אימייל", () => {
    expect(
      authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" }),
    ).not.toContain("האימייל");
  });

  it("מזהה חסימת קצב גם כשהיא מגיעה בלי code", () => {
    expect(authErrorMessage({ status: 429, message: "Request rate limit reached" })).toBe(
      "יותר מדי ניסיונות. המתינו דקה ונסו שוב.",
    );
  });

  it("מזהה נפילת רשת — status 0 ובלי code", () => {
    // AuthRetryableFetchError כפי ש-supabase-js מייצר אותה כשה-fetch נכשל.
    expect(authErrorMessage({ status: 0, message: "Failed to fetch" })).toContain(
      "לא הצלחנו להגיע לשרת",
    );
  });

  it("לא בולע קוד לא מוכר — משאיר את הטקסט המקורי", () => {
    expect(authErrorMessage({ code: "mfa_challenge_expired", message: "MFA challenge expired" })).toBe(
      "שגיאה בהתחברות: MFA challenge expired",
    );
  });
});
