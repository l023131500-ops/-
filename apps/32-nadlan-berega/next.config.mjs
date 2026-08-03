// קידומת הנתיב שבה האפליקציה מוגשת.
//
// ⚠️ מלכודת שנפלתי בה: `lib/basepath.ts` קרא `NEXT_PUBLIC_BASE_PATH` כדי
// לתקן קריאות `fetch`, אבל **next.config מעולם לא הגדיר `basePath`** — כך
// שהבנייה שיושבת מתחת ל-more30.com/nadlan נבנתה פעם אחת ידנית עם basePath,
// ופריסה רגילה מהמקור החזירה אתר ששורשו "/" ו-404 על כל /nadlan.
// מעכשיו זה נגזר מאותו משתנה, ולשתי הפריסות יש אותו מקור: הפרויקט שמוגש
// בשורש משאיר את המשתנה ריק, וזה שמוגש תחת נתיב מגדיר `/nadlan`.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),

  experimental: {
    // ⚠️ בלי שני אלה הורדת ה-PDF נכשלת בפרודקשן עם
    // `The input directory "/var/task/.next/server/bin" does not exist`.
    // הסיבה: `@sparticuz/chromium` מחזיק את הבינארי הדחוס ב-`bin/` שלו
    // (chromium.br ~60MB), ו-`executablePath()` מחפש אותו ביחס למקום המודול.
    // כשה-bundler אורז את המודול פנימה, המקום הזה הופך ל-`.next/server`,
    // ותיקיית ה-bin לא מגיעה לשם בכלל. `serverComponentsExternalPackages`
    // משאיר את המודול ב-node_modules כמו שהוא, ו-`outputFileTracingIncludes`
    // מכריח את ה-trace לצרף את הבינארי ל-lambda של המסלול.
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    outputFileTracingIncludes: {
      '/api/pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
      '/api/deck': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.govmap.gov.il' },
      { protocol: 'https', hostname: '**.gov.il' },
    ],
  },
};

export default nextConfig;
