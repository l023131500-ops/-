import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/*
  עמוד ה-404 היה כולו באנגלית ("Oops! Page not found · Return to Home")
  באתר עברי — DESIGN_STANDARD §10. בנוסף הוא כתב ל-console.error בכל טעינה,
  ולכן כל מדידה אוטומטית של המערכת ספרה כאן "שגיאת קונסולה" שאינה שגיאה.
  הרישום נשאר, כאזהרה. הקישור חוזר לבסיס האמיתי (‎/zchuyot‎) ולא לשורש
  ‎more30.com‎, כי מכאן המשתמש רוצה לחזור למערכת שבה הוא נמצא.
*/
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: נתיב שאינו קיים —", location.pathname);
  }, [location.pathname]);

  const home = import.meta.env.BASE_URL || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-6">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-black text-foreground">404</h1>
        <p className="mb-2 text-xl text-foreground">הדף הזה לא קיים</p>
        <p className="mb-6 text-base text-muted-foreground">
          ייתכן שהכתובת השתנתה, או שהוקלדה עם שגיאה.
        </p>
        <a
          href={home}
          className="inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90"
        >
          חזרה לעמוד הראשי
        </a>
      </div>
    </div>
  );
};

export default NotFound;
