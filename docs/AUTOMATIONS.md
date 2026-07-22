# שכבת אוטומציות — רישום Phase E (בנייה ב-Phase 2)

בשלב זה **רק רישום** ב-`core.automations` ובדוח הטוקנים. **לא נבנה כלום, לא נגענו בקיים.**

| מפתח | שם | סוג | סטטוס | טוקנים נדרשים | הערה |
|---|---|---|---|---|---|
| `yemot` | ימות המשיח (IVR/טלפוניה) | telephony | planned | YEMOT_TOKEN, YEMOT_USERNAME, YEMOT_PASSWORD | מענה קולי/שלוחות. טוקן מפאנל ימות המשיח → API. |
| `resend` | שליחת מיילים | email | planned | RESEND_API_KEY | כבר מחובר אצל המשתמש. https://resend.com/api-keys |
| `n8n` | N8N אורקסטרציה | orchestration | **connected** | N8N_WEBHOOK_URL | קיים. **webhook `NEDARIM3873` מוגן 🔒 — לא לגעת.** רק לרשום webhooks נדרשים. |

## היכן מדביקים כשנבנה (Phase 2)
- **ימות המשיח:** פאנל → הגדרות API → טוקן → יעד הדבקה: שירות האוטומציות (יוגדר ב-Phase 2).
- **Resend:** https://resend.com/api-keys → `RESEND_API_KEY` → Variables של שירות המיילים.
- **N8N:** webhooks חדשים בלבד; אין לגעת ב-`NEDARIM3873` (סליקת נדרים המוגנת).

**עיקרון:** האוטומציות ייבנו כשירות/שכבה נפרדים ב-Phase 2, אחרי אימות ואישור Phase 1.
