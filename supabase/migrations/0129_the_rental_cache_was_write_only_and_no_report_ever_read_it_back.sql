-- nadlan.rental_data (32 נדל"ן ברגע) נכתבה מאז ומעולם בלי מפתח טבעי: כל
-- הפקת דוח שכירות באותו אזור ובאותו חודש הייתה מוסיפה שורה חדשה במקום
-- לרענן את הקיימת, ואף מסלול לא קרא מהטבלה בחזרה. האינדקס הייחודי מאפשר
-- ל-upsert (onConflict: 'area_code,month' ב-lib/store.ts cacheRentalData)
-- לשמור שורה אחת לכל אזור+חודש — התנאי לצד-הקורא החדש latestCachedRental,
-- שמחזיר את שכ"ד-למ"ר האחרון שנמדד בפועל כשמכסת מושך המודעות נוצלה.
-- הטבלה ריקה (0 שורות, אומת 20/08/2026) — אין סיכון כפילויות קיימות.
create unique index if not exists rental_data_area_month_key
  on nadlan.rental_data (area_code, month);
