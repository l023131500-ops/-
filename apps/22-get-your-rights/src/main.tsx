import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root")!;

/**
 * ‎createRoot‎ ולא ‎hydrateRoot‎ — נמדד, לא הונח.
 *
 * הרעיון הקודם היה להידרט את ה-HTML שנאפה ב-‎scripts/prerender-spa.mjs‎, כדי
 * שהדפדפן יאמץ את הכותרת שכבר צוירה במקום לבנות אותה מחדש. בתיאוריה זה
 * מזיז את ה-LCP קדימה; בפועל ‎node scripts/qa/console-probe.mjs‎ מול
 * הפרודקשן מדד **שמונה שגיאות ‎#418‎ ואחריהן ‎#423‎** — כלומר React מצא
 * אי-התאמה בין העצים, זרק את השורש כולו וצייר מחדש בצד הלקוח בכל מקרה.
 *
 * זה בדיוק מה ש-‎prerender-spa.mjs‎ מתעד: ‎--block-data‎ אינו משאיר את
 * react-query במצב *pending* אלא מעביר אותו ל-*error*, ולכן הלכידה מציגה
 * את הענף הריק בעוד הלקוח מציג את ענף הטעינה. שני עצים שונים.
 *
 * התוצאה: ההידרציה לא נתנה כלום ועלתה תשע שגיאות בקונסולה, שנספרות גם
 * ב-Lighthouse. עם ‎createRoot‎ ה-HTML האפוי עדיין קונה את הציור הראשון
 * המהיר (‎FCP‎), רק בלי לשלם על הידרציה שנכשלת. הידרציה אמיתית כאן דורשת
 * SSR עם סריאליזציה של כל השאילתות — לא ‎--block-data‎.
 */
createRoot(container).render(<App />);