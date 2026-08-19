import { describe, it, expect } from "vitest";
import { authErrorMessage, PASSWORD_MIN_LENGTH } from "@/lib/authErrors";

// הקודים והנוסחים כאן הם מה ש-GoTrue מחזיר בפועל (@supabase/supabase-js 2.105):
// error.code הוא המזהה היציב, error.message הוא הטקסט האנגלי.
describe("authErrorMessage", () => {
  it("מפריד בין מייל שלא אומת לבין סיסמה שגויה", () => {
    const notConfirmed = authErrorMessage(
      { code: "email_not_confirmed", message: "Email not confirmed", status: 400 },
      "login",
    );
    const badPassword = authErrorMessage(
      { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
      "login",
    );

    expect(notConfirmed).toContain("אומת");
    expect(notConfirmed).not.toContain("שגויים");
    expect(badPassword).toBe("האימייל או הסיסמה שגויים.");
  });

  it("מפנה נרשם קיים להתחברות", () => {
    for (const code of ["user_already_exists", "email_exists"]) {
      expect(authErrorMessage({ code, message: "User already registered", status: 422 }, "signup"))
        .toContain("כבר רשומה");
    }
  });

  it("מצטט את אורך הסיסמה מאותו קבוע שהטופס אוכף", () => {
    expect(
      authErrorMessage(
        { code: "weak_password", message: "Password should be at least 6 characters", status: 422 },
        "signup",
      ),
    ).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it("מזהה חסימת קצב גם לפי הקוד וגם לפי סטטוס 429", () => {
    expect(authErrorMessage({ code: "over_request_rate_limit", message: "rate limit", status: 429 }, "login"))
      .toContain("יותר מדי ניסיונות");
    expect(authErrorMessage({ message: "Request rate limit reached", status: 429 }, "login"))
      .toContain("יותר מדי ניסיונות");
  });

  it("לא בולע שגיאה לא מוכרת — מציג את המקור עם הקידומת הנכונה", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "Database error", status: 500 }, "login"))
      .toBe("שגיאה בהתחברות: Database error");
    expect(authErrorMessage({ code: "unexpected_failure", message: "Database error", status: 500 }, "signup"))
      .toBe("שגיאה בהרשמה: Database error");
  });
});
