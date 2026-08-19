-- מחקר חכם לנדל"ן: שאלון המלצה לאחר מחקר, לבדיקת כדאיות רכישת דירה
-- מיועד למשתמשים רשומים בלבד. נשמר ב-nadlan.questionnaire_templates.
INSERT INTO nadlan.questionnaire_templates (version, title, questions, active)
VALUES (
  'v1',
  'שאלון כדאיות רכישת דירה — לאחר מחקר',
  '[
    {"section":"מטרת הרכישה","items":[
      {"key":"purpose","label":"מהי מטרת הרכישה?","type":"single","options":["מגורים","השקעה להשכרה","השקעה להשבחה/מכירה","דירה לילדים"]},
      {"key":"horizon","label":"אופק ההחזקה המתוכנן","type":"single","options":["עד 3 שנים","3-7 שנים","7+ שנים"]}
    ]},
    {"section":"תקציב ומימון","items":[
      {"key":"budget","label":"תקציב כולל (₪)","type":"number"},
      {"key":"equity","label":"הון עצמי זמין (₪)","type":"number"},
      {"key":"mortgage_approved","label":"האם יש אישור עקרוני למשכנתא?","type":"single","options":["כן","לא","בתהליך"]},
      {"key":"monthly_capacity","label":"החזר חודשי אפשרי (₪)","type":"number"}
    ]},
    {"section":"מאפייני הנכס הרצוי","items":[
      {"key":"rooms","label":"מספר חדרים רצוי","type":"single","options":["2","3","4","5+"]},
      {"key":"size_sqm","label":"שטח רצוי (מ\"ר)","type":"number"},
      {"key":"floor_pref","label":"העדפת קומה","type":"single","options":["קרקע/גן","אמצע","גבוהה","פנטהאוז"]},
      {"key":"parking","label":"חניה הכרחית?","type":"single","options":["כן","רצוי","לא"]},
      {"key":"elevator","label":"מעלית הכרחית?","type":"single","options":["כן","לא"]},
      {"key":"condition","label":"מצב הנכס","type":"single","options":["חדש מקבלן","משופץ","דורש שיפוץ","לא משנה"]}
    ]},
    {"section":"שיקולי סביבה (מבוסס על תוצאות המחקר)","items":[
      {"key":"prox_transit","label":"חשיבות קרבה לתחבורה ציבורית","type":"scale","min":1,"max":5},
      {"key":"prox_school","label":"חשיבות קרבה למוסדות חינוך","type":"scale","min":1,"max":5},
      {"key":"prox_synagogue","label":"חשיבות קרבה לבית כנסת/מוסדות דת","type":"scale","min":1,"max":5},
      {"key":"prox_center","label":"חשיבות קרבה למרכזי מסחר","type":"scale","min":1,"max":5},
      {"key":"quiet_roads","label":"רגישות לרעש מכבישים ראשיים","type":"scale","min":1,"max":5},
      {"key":"community","label":"התאמת אופי הקהילה (חילוני/דתי/חרדי/מעורב)","type":"single","options":["חילוני","דתי-לאומי","חרדי","מעורב","לא משנה"]}
    ]},
    {"section":"שיקולי השבחה וסיכון","items":[
      {"key":"urban_renewal_interest","label":"עניין בפוטנציאל פינוי-בינוי/תמ\"א 38","type":"single","options":["מחפש במיוחד","יתרון","לא רלוונטי","חשש"]},
      {"key":"risk_tolerance","label":"רמת סיכון מקובלת","type":"single","options":["נמוכה","בינונית","גבוהה"]},
      {"key":"yield_target","label":"תשואת שכירות מטרה (%)","type":"number"}
    ]},
    {"section":"פרטי התקשרות","items":[
      {"key":"contact_time","label":"זמן מועדף ליצירת קשר","type":"single","options":["בוקר","צהריים","ערב"]},
      {"key":"notes","label":"הערות נוספות","type":"text"}
    ]}
  ]'::jsonb,
  true
);

-- ניקוי ריצת בדיקה כפולה (באר שבע נשמרה פעמיים)
DELETE FROM nadlan.location_profiles WHERE profile_id = 2;
