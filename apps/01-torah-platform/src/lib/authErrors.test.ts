import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";

// הקודים כאן הם מה שהשרת של הפרויקט (bieebmnmkffwbqlsfozh) באמת מחזיר —
// invalid_credentials נמדד מול /auth/v1/token, ו-mailer_autoconfirm=false
// נקרא מ-/auth/v1/settings, כלומר email_not_confirmed הוא מסלול אמיתי כאן.
describe("authErrorMessage", () => {
  it("מפריד מייל שלא אומת מסיסמה שגויה", () => {
    const notConfirmed = authErrorMessage({ code: "email_not_confirmed", message: "Email not confirmed", status: 400 });
    const wrongPassword = authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials", status: 400 });

    expect(notConfirmed).not.toBe(wrongPassword);
    expect(notConfirmed).toContain("אומת");
    expect(wrongPassword).toContain("שגויים");
  });

  it("אומר למי שכבר רשום לעבור להתחברות, ולא מציג 'User already registered'", () => {
    const msg = authErrorMessage({ code: "user_already_exists", message: "User already registered", status: 422 });
    expect(msg).toContain("כבר רשומה");
    expect(msg).not.toContain("already");
  });

  it("מזהה חסימת קצב גם לפי הקוד וגם לפי status 429", () => {
    expect(authErrorMessage({ code: "over_request_rate_limit", message: "x", status: 429 })).toContain("יותר מדי ניסיונות");
    expect(authErrorMessage({ message: "Request rate limit reached", status: 429 })).toContain("יותר מדי ניסיונות");
  });

  it("נפילת רשת (status 0, בלי code) לא מואשמת בסיסמה", () => {
    const msg = authErrorMessage({ message: "Failed to fetch", status: 0 });
    expect(msg).toContain("לא הצלחנו להגיע לשרת");
    expect(msg).not.toContain("סיסמה");
  });

  it("קוד לא מוכר עדיין מציג את ההודעה המקורית ולא בולע אותה", () => {
    expect(authErrorMessage({ code: "some_future_code", message: "Something new broke", status: 400 })).toContain(
      "Something new broke",
    );
  });
});
