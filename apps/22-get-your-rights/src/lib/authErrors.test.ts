import { describe, it, expect } from "vitest";
import { authErrorMessage } from "@/lib/authErrors";

// הקודים והנוסחים כאן הם מה ש-GoTrue מחזיר בפועל (@supabase/supabase-js 2.98):
// error.code הוא המזהה היציב, error.message הוא הטקסט האנגלי.
describe("authErrorMessage", () => {
  it("מפריד בין מייל שלא אומת לבין סיסמה שגויה", () => {
    const notConfirmed = authErrorMessage({
      code: "email_not_confirmed",
      message: "Email not confirmed",
      status: 400,
    });
    const badPassword = authErrorMessage({
      code: "invalid_credentials",
      message: "Invalid login credentials",
      status: 400,
    });

    expect(notConfirmed).toContain("אומת");
    expect(notConfirmed).not.toContain("שגויים");
    expect(badPassword).toBe("האימייל או הסיסמה שגויים.");
  });

  it("מזהה חסימת קצב גם לפי הקוד וגם לפי סטטוס 429", () => {
    expect(
      authErrorMessage({ code: "over_request_rate_limit", message: "rate limit", status: 429 }),
    ).toContain("יותר מדי ניסיונות");
    expect(authErrorMessage({ message: "Request rate limit reached", status: 429 })).toContain(
      "יותר מדי ניסיונות",
    );
  });

  it("אומר שהבקשה לא הגיעה לשרת במקום להאשים את הסיסמה", () => {
    // AuthRetryableFetchError אמיתי: אין code, status הוא 0.
    const offline = authErrorMessage({ message: "Failed to fetch", status: 0 });
    expect(offline).toContain("לא הצלחנו להגיע לשרת");
    expect(offline).not.toContain("שגויים");
  });

  it("לא בולע שגיאה לא מוכרת — מציג את המקור עם הקידומת הנכונה", () => {
    expect(
      authErrorMessage({ code: "unexpected_failure", message: "Database error", status: 500 }),
    ).toBe("שגיאה בהתחברות: Database error");
  });
});
