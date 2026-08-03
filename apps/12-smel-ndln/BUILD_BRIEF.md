# SMEL NDLN — Build Brief (internal, for the build agent)

## Product
עברית / RTL בלבד. אתר "SMEL NDLN" — מערכת מחקר נדל"ן חכם. גולש מזין עיר+רחוב+מספר → מקבל דוח.
- **חינם (כל גולש):** דוח בסיסי מלא — הערכת שווי/מחיר, הסבר על המחיר, רקע על המקום, והדגשים לקביעה. בלי להציג את הנתונים הגולמיים (למשל בחירות) — רק מסקנות ידידותיות למשתמש.
- **פרימיום (מנוי):** דוח כדאיות עסקה מעמיק, רקע נפרד על השכונה, סוג אוכלוסייה, רקע על הבניין, מחקר מעמיק לשווי, + התאמה אישית ע"י שאלון.

## Live data source (Supabase Edge Function — כבר פרוס ועובד)
POST https://csjekrvukbdznetsrodj.supabase.co/functions/v1/nadlan-smart-research
Headers: `Authorization: Bearer <ANON>`, `apikey: <ANON>`, `Content-Type: application/json`
ANON (publishable) key: `sb_publishable_Bv6ysG9LfUZ2lUPgZVZO6g_l1wEZIlX`
Body: `{"address":"דיזנגוף 100 תל אביב"}`
Response (מאומת): `{ ok, profile_id, matched_address, locality_code, opportunity_score, score_breakdown{}, parameters:[{key,label,value,unit,source,source_url}], ... }`

The backend (Express) must proxy this call server-side so the key isn't exposed and to add caching. Frontend calls `/api/research` with `{address}`.

## Free vs Premium field mapping
בסיסי (חינם) — הצג כמסקנות:
- הערכת שווי/מחיר ממוצע בשכונה (avg_price), מגמת מחירים, מדד תשואה (index_yield)
- ציון כדאיות (opportunity_score) + הסבר קצר מהפירוט (score_breakdown) בשפה ידידותית
- רקע על המקום: שם ישוב, אופי כללי
- 3-5 הדגשים (bullets) — נגזרים מהפרמטרים אבל מנוסחים כתובנות ("קרוב לתחבורה ציבורית", "אזור עם ביקוש גבוה")

פרימיום (נעול מאחורי מנוי):
- רקע שכונה מפורט, סוג אוכלוסייה (דתיות/גיל/השכלה/שכר), רקע בניין, פשיעה, כל מרחקי הנגישות המפורטים, ניתוח שווי מעמיק, המלצת כדאיות.
- שאלון התאמה אישית → מייצר דוח מותאם.

## Persistence (Supabase, schema `nadlan`)
- Leads: insert to `nadlan.research_leads` (via backend proxy POST /api/lead) — full_name, phone, email, address, profile_id, questionnaire_answers(jsonb).
- Questionnaire template: read from `nadlan.questionnaire_templates` where active=true (6 sections, jsonb `questions`). Backend GET /api/questionnaire.

## Pages (hash routing, wouter useHashLocation)
- `/` בית: hero + חיפוש כתובת + הסבר על השירות + תמחור (חינם מול פרימיום).
- `/report/:profileId` (או state) — תצוגת דוח בסיסי + כרטיס פרימיום נעול עם כפתור "מעוניין לקבל את המידע המפורט על כדאיות העסקה".
- `/premium` — טופס הרשמה/ליד + שאלון התאמה אישית → מסך תודה.
- `/about` (אופציונלי) הסבר על SMEL NDLN.

## Design
- RTL, `dir="rtl"` on html, `lang="he"`. Heebo / Assistant / Rubik Hebrew font via Google Fonts.
- Premium real-estate feel: deep navy + warm gold accent, generous whitespace, trust signals.
- Custom SVG logo "SMEL NDLN" (מבנה/גג + נקודת מיקום).
- Dark mode support.
- `data-testid` on interactive elements.

## Constraints
- NEVER localStorage/sessionStorage — React state only.
- All API via `apiRequest` from `@/lib/queryClient`.
- Free tier data is REAL from the live function. Premium content is gated (blur + CTA) — do not fabricate premium numbers on the client; premium detail comes from the same profile but shown only after lead capture (for phase 1, gating = show CTA + capture lead; the "detailed report" is the same profile's full params rendered after submit).
