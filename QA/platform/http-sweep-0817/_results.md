# HTTP sweep — כל 24 המערכות החיות, 17/08/2026 (לילה, ג)

זווית שלא נבדקה בשלושת סבבי הלילה הקודמים היום (הפרש ענף, Lovable MCP,
untracked files): `Invoke-WebRequest -Method Head` על שורש כל מונט חי לפי
טבלת `SYSTEMS_STATUS.md` (24 שורות, לא כולל 33/אתר-התדמית ו-08/09 המוגנות).

## פקודה
```powershell
foreach ($p in $paths) {
  Invoke-WebRequest -Uri "https://more30.com/$p/" -Method Head -MaximumRedirection 0 -TimeoutSec 15
}
```

## תוצאה — 24/24 בריאים, 0 חדשים

| מונט | סטטוס | הערה |
|---|---|---|
| torah, imud, briut, bkalot, smel, smachot, egod, chatzor, chizukim, zchuyot, studio, kupot, kiosk, mthbram, galil, mechiron | 200 | תקין |
| tamlul, modaot, orech, nadlan, kesef, tivuch | 308 → `/<מונט>` (בלי `/`) | נורמליזציית trailing-slash של Next.js — צפוי, לא באג |
| crm | 307 → `/crm/auth` | תואם ל-`SYSTEMS_STATUS.md`: "מפנה ל-/crm/auth" |
| gesher | 307 → `/gesher/auth` | תואם ל-`SYSTEMS_STATUS.md`: "מפנה ל-/gesher/auth" |

כל הפניה נבדקה ידנית (Location header) מול התיעוד הקיים — אין סטייה. **אין
מערכת שבורה, אין שינוי קוד/פריסה נדרש מהסבב הזה.** מדידה בלבד, ראיה טרייה
לכך שהמצב שתועד בסבבי הלילה הקודמים (0/24 שבורות) עדיין נכון עכשיו, מזווית
חדשה (HTTP ולא בדיקת Playwright/תוכן).
