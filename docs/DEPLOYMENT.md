# DEPLOYMENT.md — מפת פריסה מקבילה תחת more30.com

> **עיקרון:** כל מערכת מקבלת תת-דומיין תחת `more30.com`, שמצביע לשירות פריסה נפרד
> (Vercel/Railway), **בלי לגעת בפורטל החי של more30.com ובלי להחליף פריסות חיות**.
> חיבור ה-DNS עצמו (Cloudflare) הוא **פעולת משתמש** — ראה "צעדי חיבור" למטה.

עודכן 24/07/2026.

## תשתית קיימת (מאומת ב-Vercel, team `l023131500-ops-projects`)
| פרויקט Vercel | URL נוכחי | מחובר more30.com? |
|---|---|---|
| more30-portal | https://more30-portal.vercel.app | ❌ (live:false) |
| more30-admin | https://more30-admin.vercel.app | ❌ (live:false) |
| nadlan-berega | https://nadlan-berega.vercel.app | ❌ |
| torah-platform | (deployed) | ❌ |
| igud-ads | https://igud-ads.vercel.app | ❌ |
| chizukim-transcribe | (deployed) | ❌ |
| kupot-health-funds | (deployed) | ❌ |

> `more30.com` עצמו הוא פורטל MOR1 חי על Cloudflare DNS — **לא לגעת**. הפריסות
> החדשות מקבילות: הן חיות על `*.vercel.app` עד שהמשתמש יחבר CNAME.

## מפת תת-דומיינים מוצעת
| # | מערכת | תת-דומיין מוצע | יעד | סטטוס פריסה |
|---|---|---|---|---|
| — | portal | `more30.com` (root) / `www` | Vercel more30-portal | ✅ פרוס (רענון עיצוב ממתין ל-push) |
| — | admin | `admin.more30.com` | Vercel more30-admin | ✅ פרוס |
| 32 | נדל"ן ברגע | `nadlan.more30.com` | Vercel nadlan-berega | ✅ פרוס |
| 01 | torah-platform (HUB) | `torah.more30.com` | Vercel torah-platform | ✅ פרוס |
| 03 | igud-ads | `ads.more30.com` | Vercel igud-ads | ✅ פרוס |
| 02 | igud-transcribe | `transcribe.more30.com` | Vercel | ✅ פרוס (חסר OPENAI_API_KEY) |
| 17 | chizukim-transcribe | `chizukim.more30.com` | Vercel | ✅ פרוס |
| 28 | kupot-health-funds | `kupot.more30.com` | Vercel | ✅ פרוס |
| 16 | chatzor-connect | `chatzor.more30.com` | Vercel | ✅ פרוס |
| 15 | egod | `egod.more30.com` | Lovable | חי ב-Lovable (Supabase hkkky) |
| 04 | imud-torani | `imud.more30.com` | Railway | ⏳ build-fix |
| 06 | kupot-holim | `kupot-holim.more30.com` | Vercel | ⏳ build-fix |
| 10 | bkalot-rights | `zchuyot-bkalot.more30.com` | Vercel | ⏳ build-fix |
| 12 | smel-ndln | (לשקול מיזוג עם 32) | — | ⏳ build-fix |
| 13 | property-identity | (לשקול מיזוג עם 32) | — | ⏳ build-fix |
| 14 | bsmachot-plus | `smachot.more30.com` | Vercel | ⏳ build-fix |
| 18 | torah-editor-mvp | `editor.more30.com` | Vercel | ⏳ build-fix |
| 21 | mthbram | `mthbram.more30.com` | Vercel | ⏳ build-fix |
| 22 | get-your-rights | `rights.more30.com` | Vercel | ⏳ build-fix |
| 24 | galilee-connect-hub | `galilee.more30.com` | Vercel | ⏳ build-fix |
| 26 | modaot-studio | `modaot.more30.com` | Vercel | ⏳ build-fix |
| 27 | bkalut-price | `price.more30.com` | Vercel | ⏳ build-fix |
| 30 | zchuyotpro-crm | `crm-zchuyot.more30.com` | Vercel | ⏳ build-fix |
| 31 | hebrew-bridge-crm | `bridge.more30.com` | Vercel | ✅ build עובר (TanStack Start) |
| 08/09 | 🔒 bkalut | — | — | מוגן — לא נוגעים |

> stubs (05,07,11,19,20,23,25,29) — אין מספיק קוד לפריסה; לא מוקצה תת-דומיין עדיין.

## צעדי חיבור תת-דומיין (פעולת משתמש — לא אוטומטי, לא הרסני)
לכל מערכת פרוסה ב-Vercel:
1. Vercel → הפרויקט → Settings → Domains → הוסף `<sub>.more30.com`.
2. Vercel ייתן CNAME יעד (בד"כ `cname.vercel-dns.com`).
3. Cloudflare (DNS של more30.com) → הוסף רשומת **CNAME**: `<sub>` → היעד, Proxy = DNS only
   (אפור) בהתחלה, כדי לאמת TLS, ואז אפשר להפעיל Proxy.
4. אמת HTTPS. **אין לגעת ברשומת ה-root/`@` של more30.com** — היא מצביעה לפורטל MOR1 החי.

> למה ידני: חיבור DNS ל-more30.com נוגע בזון חי; שגיאה עלולה להפיל את הפורטל הקיים.
> לכן המערכת מכינה הכל (build + פרויקט Vercel), והחיבור עצמו נעשה בפיקוח.

## משתני סביבה חסרים לפני הפעלה מלאה
ראה `docs/MISSING_TOKENS.md` — כל מערכת + הטוקן שחסר לה + היכן מזינים (Vercel/Railway
Variables בלבד, לעולם לא בגיט).
