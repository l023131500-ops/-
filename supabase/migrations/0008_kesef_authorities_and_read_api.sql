-- more30 · kesef (34) — authority registry + the guarded read API
-- ============================================================================
-- Two things, both needed before a signed-in user can reach the system itself:
--
-- 1. kesef.authority was empty, so "choose your area" had nothing to choose
--    from. Loaded from the official municipal register on data.gov.il
--    (resource c4916937-f5d3-4295-a22e-88a1af5cde6a, 259 rows, fetched
--    02/08/2026). Symbol, name, type and district are the publisher's own
--    values — nothing here is derived or guessed.
--
-- 2. The `kesef` schema is NOT in the project's exposed schemas, so PostgREST
--    answers 406/PGRST106 for every table in it, and re-exposing it needs a
--    project restart the owner declined. These SECURITY DEFINER functions live
--    in `public` (which IS exposed) and read `kesef` on the caller's behalf —
--    the same pattern more30_secrets_fetch and more30_join_app already use.
--
--    EXECUTE is granted to `authenticated` and deliberately NOT to `anon`.
--    That grant IS the access guard: until subscriptions exist every signed-in
--    account may read everything, and a signed-out visitor cannot read any of
--    it even by calling the endpoint directly. A front-end redirect alone
--    would only hide the data, not withhold it.
-- ============================================================================

-- 1 · Authorities ------------------------------------------------------------
insert into kesef.authority (symbol, name_he, name_variants, status, district)
values
  (2710, 'אום אל-פחם', array['עריית אום אל-פחם'], 'municipality'::kesef.authority_status, 'חיפה'),
  (31, 'אופקים', array['עריית אופקים'], 'municipality'::kesef.authority_status, 'הדרום'),
  (2400, 'אור יהודה', array['עריית אור יהודה'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (1020, 'אור עקיבא', array['עריית אור עקיבא'], 'municipality'::kesef.authority_status, 'חיפה'),
  (2600, 'אילת', array['עריית אילת'], 'municipality'::kesef.authority_status, 'הדרום'),
  (2720, 'טירה', array['עריית טירה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (1309, 'אלעד', array['עריית אלעד'], 'municipality'::kesef.authority_status, 'המרכז'),
  (3570, 'אריאל', array['עריית אריאל'], 'municipality'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (70, 'אשדוד', array['עריית אשדוד'], 'municipality'::kesef.authority_status, 'הדרום'),
  (7100, 'אשקלון', array['עריית אשקלון'], 'municipality'::kesef.authority_status, 'הדרום'),
  (6000, 'באקה אל-גרביה', array['עריית באקה אל-גרביה'], 'municipality'::kesef.authority_status, 'חיפה'),
  (9000, 'באר שבע', array['עריית באר שבע'], 'municipality'::kesef.authority_status, 'הדרום'),
  (2610, 'בית שמש', array['עריית בית שמש'], 'municipality'::kesef.authority_status, 'ירושלים'),
  (9200, 'בית שאן', array['עריית בית שאן'], 'municipality'::kesef.authority_status, 'הצפון'),
  (3780, 'ביתר עילית', array['עריית ביתר עילית'], 'municipality'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (6100, 'בני ברק', array['עריית בני ברק'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (6200, 'בת ים', array['עריית בת ים'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (681, 'גבעת שמואל', array['עריית גבעת שמואל'], 'municipality'::kesef.authority_status, 'המרכז'),
  (6300, 'גבעתיים', array['עריית גבעתיים'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (2200, 'דימונה', array['עריית דימונה'], 'municipality'::kesef.authority_status, 'הדרום'),
  (9700, 'הוד השרון', array['עריית הוד השרון'], 'municipality'::kesef.authority_status, 'המרכז'),
  (6400, 'הרצלייה', array['עריית הרצלייה'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (6500, 'חדרה', array['עריית חדרה'], 'municipality'::kesef.authority_status, 'חיפה'),
  (6600, 'חולון', array['עריית חולון'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (4000, 'חיפה', array['עריית חיפה'], 'municipality'::kesef.authority_status, 'חיפה'),
  (6700, 'טבריה', array['עריית טבריה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (2730, 'טייבה', array['עריית טייבה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (2100, 'טירת כרמל', array['עריית טירת כרמל'], 'municipality'::kesef.authority_status, 'חיפה'),
  (8900, 'טמרה', array['עריית טמרה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (2660, 'יבנה', array['עריית יבנה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (9400, 'יהוד-מונוסון', array['עריית יהוד-מונוסון'], 'municipality'::kesef.authority_status, 'המרכז'),
  (240, 'יקנעם עילית', array['עריית יקנעם עילית'], 'municipality'::kesef.authority_status, 'הצפון'),
  (3000, 'ירושלים', array['עריית ירושלים'], 'municipality'::kesef.authority_status, 'ירושלים'),
  (168, 'כפר יונה', array['עריית כפר יונה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (6900, 'כפר סבא', array['עריית כפר סבא'], 'municipality'::kesef.authority_status, 'המרכז'),
  (634, 'כפר קאסם', array['עריית כפר קאסם'], 'municipality'::kesef.authority_status, 'המרכז'),
  (1139, 'כרמיאל', array['עריית כרמיאל'], 'municipality'::kesef.authority_status, 'הצפון'),
  (7000, 'לוד', array['עריית לוד'], 'municipality'::kesef.authority_status, 'המרכז'),
  (874, 'מגדל העמק', array['עריית מגדל העמק'], 'municipality'::kesef.authority_status, 'הצפון'),
  (1200, 'מודיעין-מכבים-רעות', array['עריית מודיעין-מכבים-רעות'], 'municipality'::kesef.authority_status, 'המרכז'),
  (3797, 'מודיעין עילית', array['עריית מודיעין עילית'], 'municipality'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (3616, 'מעלה אדומים', array['עריית מעלה אדומים'], 'municipality'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (1063, 'מעלות-תרשיחא', array['עריית מעלות-תרשיחא'], 'municipality'::kesef.authority_status, 'הצפון'),
  (9100, 'נהרייה', array['עריית נהרייה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (7200, 'נס ציונה', array['עריית נס ציונה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (7300, 'נצרת', array['עריית נצרת'], 'municipality'::kesef.authority_status, 'הצפון'),
  (1061, 'נוף הגליל', array['עריית נוף הגליל'], 'municipality'::kesef.authority_status, 'הצפון'),
  (2500, 'נשר', array['עריית נשר'], 'municipality'::kesef.authority_status, 'חיפה'),
  (246, 'נתיבות', array['עריית נתיבות'], 'municipality'::kesef.authority_status, 'הדרום'),
  (7400, 'נתניה', array['עריית נתניה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (7500, 'סח''נין', array['עריית סח''נין'], 'municipality'::kesef.authority_status, 'הצפון'),
  (7700, 'עפולה', array['עריית עפולה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (531, 'עראבה', array['עריית עראבה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (2560, 'ערד', array['עריית ערד'], 'municipality'::kesef.authority_status, 'הדרום'),
  (7900, 'פתח תקווה', array['עריית פתח תקווה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (8000, 'צפת', array['עריית צפת'], 'municipality'::kesef.authority_status, 'הצפון'),
  (638, 'קלנסווה', array['עריית קלנסווה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (2620, 'קריית אונו', array['עריית קריית אונו'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (6800, 'קריית אתא', array['עריית קריית אתא'], 'municipality'::kesef.authority_status, 'חיפה'),
  (9500, 'קריית ביאליק', array['עריית קריית ביאליק'], 'municipality'::kesef.authority_status, 'חיפה'),
  (2630, 'קריית גת', array['עריית קריית גת'], 'municipality'::kesef.authority_status, 'הדרום'),
  (9600, 'קריית ים', array['עריית קריית ים'], 'municipality'::kesef.authority_status, 'חיפה'),
  (8200, 'קריית מוצקין', array['עריית קריית מוצקין'], 'municipality'::kesef.authority_status, 'חיפה'),
  (1034, 'קריית מלאכי', array['עריית קריית מלאכי'], 'municipality'::kesef.authority_status, 'הדרום'),
  (2800, 'קריית שמונה', array['עריית קריית שמונה'], 'municipality'::kesef.authority_status, 'הצפון'),
  (2640, 'ראש העין', array['עריית ראש העין'], 'municipality'::kesef.authority_status, 'המרכז'),
  (8300, 'ראשון לציון', array['עריית ראשון לציון'], 'municipality'::kesef.authority_status, 'המרכז'),
  (1161, 'רהט', array['עריית רהט'], 'municipality'::kesef.authority_status, 'הדרום'),
  (8400, 'רחובות', array['עריית רחובות'], 'municipality'::kesef.authority_status, 'המרכז'),
  (8500, 'רמלה', array['עריית רמלה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (8600, 'רמת גן', array['עריית רמת גן'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (2650, 'רמת השרון', array['עריית רמת השרון'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (8700, 'רעננה', array['עריית רעננה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (1031, 'שדרות', array['עריית שדרות'], 'municipality'::kesef.authority_status, 'הדרום'),
  (8800, 'שפרעם', array['עריית שפרעם'], 'municipality'::kesef.authority_status, 'הצפון'),
  (5000, 'תל אביב -יפו', array['עריית תל אביב -יפו'], 'municipality'::kesef.authority_status, 'תל אביב'),
  (2530, 'באר יעקב', array['עריית באר יעקב'], 'municipality'::kesef.authority_status, 'המרכז'),
  (229, 'גני תקווה', array['עריית גני תקווה'], 'municipality'::kesef.authority_status, 'המרכז'),
  (1247, 'חריש', array['עריית חריש'], 'municipality'::kesef.authority_status, 'חיפה'),
  (654, 'כפר קרע', array['עריית כפר קרע'], 'municipality'::kesef.authority_status, 'חיפה'),
  (481, 'מגאר', array['עריית מגאר'], 'municipality'::kesef.authority_status, 'הצפון'),
  (7600, 'עכו', array['עריית עכו'], 'municipality'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (4502, 'עין קנייא', array['עריית עין קנייא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (472, 'אבו גוש', array['מועצה מקומית  אבו גוש'], 'local_council'::kesef.authority_status, 'ירושלים'),
  (473, 'אבו סנאן', array['מועצה מקומית  אבו סנאן'], 'local_council'::kesef.authority_status, 'הצפון'),
  (182, 'אבן יהודה', array['מועצה מקומית  אבן יהודה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (3760, 'אורנית', array['מועצה מקומית  אורנית'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (565, 'אזור', array['מועצה מקומית  אזור'], 'local_council'::kesef.authority_status, 'תל אביב'),
  (478, 'אכסאל', array['מועצה מקומית  אכסאל'], 'local_council'::kesef.authority_status, 'הצפון'),
  (529, 'אעבלין', array['מועצה מקומית  אעבלין'], 'local_council'::kesef.authority_status, 'הצפון'),
  (4501, 'ע''ג''ר', array['מועצה מקומית  ע''ג''ר'], 'local_council'::kesef.authority_status, 'הצפון'),
  (41, 'אליכין', array['מועצה מקומית  אליכין'], 'local_council'::kesef.authority_status, 'המרכז'),
  (3750, 'אלפי מנשה', array['מועצה מקומית  אלפי מנשה'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (3560, 'אלקנה', array['מועצה מקומית  אלקנה'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (3650, 'אפרת', array['מועצה מקומית  אפרת'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (482, 'בועיינה-נוג''ידאת', array['מועצה מקומית  בועיינה-נוג''ידאת'], 'local_council'::kesef.authority_status, 'הצפון'),
  (4001, 'בוקעאתא', array['מועצה מקומית  בוקעאתא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (483, 'בענה', array['מועצה מקומית  בענה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (998, 'ביר אל-מכסור', array['מועצה מקומית  ביר אל-מכסור'], 'local_council'::kesef.authority_status, 'הצפון'),
  (480, 'בית ג''ן', array['מועצה מקומית  בית ג''ן'], 'local_council'::kesef.authority_status, 'הצפון'),
  (3574, 'בית אל', array['מועצה מקומית  בית אל'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (3652, 'בית אריה-עופרים', array['מועצה מקומית  בית אריה-עופרים'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (466, 'בית דגן', array['מועצה מקומית  בית דגן'], 'local_council'::kesef.authority_status, 'המרכז'),
  (1066, 'בני עי"ש', array['מועצה מקומית  בני עי"ש'], 'local_council'::kesef.authority_status, 'המרכז'),
  (9800, 'בנימינה-גבעת עדה', array['מועצה מקומית  בנימינה-גבעת עדה'], 'local_council'::kesef.authority_status, 'חיפה'),
  (1326, 'בסמ"ה', array['מועצה מקומית  בסמ"ה'], 'local_council'::kesef.authority_status, 'חיפה'),
  (944, 'בסמת טבעון', array['מועצה מקומית  בסמת טבעון'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1292, 'ג''דיידה-מכר', array['מועצה מקומית  ג''דיידה-מכר'], 'local_council'::kesef.authority_status, 'הצפון'),
  (485, 'ג''ולס', array['מועצה מקומית  ג''ולס'], 'local_council'::kesef.authority_status, 'הצפון'),
  (541, 'ג''סר א-זרקא', array['מועצה מקומית  ג''סר א-זרקא'], 'local_council'::kesef.authority_status, 'חיפה'),
  (627, 'ג''לג''וליה', array['מועצה מקומית  ג''לג''וליה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (628, 'ג''ת', array['מועצה מקומית  ג''ת'], 'local_council'::kesef.authority_status, 'חיפה'),
  (3730, 'גבעת זאב', array['מועצה מקומית  גבעת זאב'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (2550, 'גדרה', array['מועצה מקומית  גדרה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (487, 'ג''ש (גוש חלב)', array['מועצה מקומית  ג''ש (גוש חלב)'], 'local_council'::kesef.authority_status, 'הצפון'),
  (166, 'גן יבנה', array['מועצה מקומית  גן יבנה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (489, 'דבורייה', array['מועצה מקומית  דבורייה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (492, 'דייר חנא', array['מועצה מקומית  דייר חנא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (490, 'דייר אל-אסד', array['מועצה מקומית  דייר אל-אסד'], 'local_council'::kesef.authority_status, 'הצפון'),
  (494, 'דאלית אל-כרמל', array['מועצה מקומית  דאלית אל-כרמל'], 'local_council'::kesef.authority_status, 'חיפה'),
  (3769, 'הר אדר', array['מועצה מקומית  הר אדר'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (9300, 'זכרון יעקב', array['מועצה מקומית  זכרון יעקב'], 'local_council'::kesef.authority_status, 'חיפה'),
  (1290, 'זמר', array['מועצה מקומית  זמר'], 'local_council'::kesef.authority_status, 'המרכז'),
  (975, 'זרזיר', array['מועצה מקומית  זרזיר'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1303, 'חורה', array['מועצה מקומית  חורה'], 'local_council'::kesef.authority_status, 'הדרום'),
  (496, 'חורפיש', array['מועצה מקומית  חורפיש'], 'local_council'::kesef.authority_status, 'הצפון'),
  (2034, 'חצור הגלילית', array['מועצה מקומית  חצור הגלילית'], 'local_council'::kesef.authority_status, 'הצפון'),
  (962, 'טובא-זנגרייה', array['מועצה מקומית  טובא-זנגרייה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (498, 'טורעאן', array['מועצה מקומית  טורעאן'], 'local_council'::kesef.authority_status, 'הצפון'),
  (46, 'יבנאל', array['מועצה מקומית  יבנאל'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1295, 'יאנוח-ג''ת', array['מועצה מקומית  יאנוח-ג''ת'], 'local_council'::kesef.authority_status, 'הצפון'),
  (29, 'יסוד המעלה', array['מועצה מקומית  יסוד המעלה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (499, 'יפיע', array['מועצה מקומית  יפיע'], 'local_council'::kesef.authority_status, 'הצפון'),
  (831, 'ירוחם', array['מועצה מקומית  ירוחם'], 'local_council'::kesef.authority_status, 'הדרום'),
  (502, 'ירכא', array['מועצה מקומית  ירכא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (504, 'כאבול', array['מועצה מקומית  כאבול'], 'local_council'::kesef.authority_status, 'הצפון'),
  (505, 'כאוכב אבו אל-היג''א', array['מועצה מקומית  כאוכב אבו אל-היג''א'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1224, 'כוכב יאיר', array['מועצה מקומית  כוכב יאיר'], 'local_council'::kesef.authority_status, 'המרכז'),
  (1059, 'כסיפה', array['מועצה מקומית  כסיפה'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1296, 'כסרא-סמיע', array['מועצה מקומית  כסרא-סמיע'], 'local_council'::kesef.authority_status, 'הצפון'),
  (978, 'כעביה-טבאש-חג''אג''רה', array['מועצה מקומית  כעביה-טבאש-חג''אג''רה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (633, 'כפר ברא', array['מועצה מקומית  כפר ברא'], 'local_council'::kesef.authority_status, 'המרכז'),
  (509, 'כפר כנא', array['מועצה מקומית  כפר כנא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1263, 'כפר ורדים', array['מועצה מקומית  כפר ורדים'], 'local_council'::kesef.authority_status, 'הצפון'),
  (507, 'כפר יאסיף', array['מועצה מקומית  כפר יאסיף'], 'local_council'::kesef.authority_status, 'הצפון'),
  (510, 'כפר מנדא', array['מועצה מקומית  כפר מנדא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (508, 'כפר כמא', array['מועצה מקומית  כפר כמא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (267, 'כפר שמריהו', array['מועצה מקומית  כפר שמריהו'], 'local_council'::kesef.authority_status, 'תל אביב'),
  (47, 'כפר תבור', array['מועצה מקומית  כפר תבור'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1271, 'להבים', array['מועצה מקומית  להבים'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1060, 'לקיה', array['מועצה מקומית  לקיה'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1015, 'מבשרת ציון', array['מועצה מקומית  מבשרת ציון'], 'local_council'::kesef.authority_status, 'ירושלים'),
  (516, 'מג''ד אל-כרום', array['מועצה מקומית  מג''ד אל-כרום'], 'local_council'::kesef.authority_status, 'הצפון'),
  (4201, 'מג''דל שמס', array['מועצה מקומית  מג''דל שמס'], 'local_council'::kesef.authority_status, 'הצפון'),
  (65, 'מגדל', array['מועצה מקומית  מגדל'], 'local_council'::kesef.authority_status, 'הצפון'),
  (28, 'מזכרת בתיה', array['מועצה מקומית  מזכרת בתיה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (517, 'מזרעה', array['מועצה מקומית  מזרעה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (43, 'מטולה', array['מועצה מקומית  מטולה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1268, 'מיתר', array['מועצה מקומית  מיתר'], 'local_council'::kesef.authority_status, 'הדרום'),
  (4203, 'מסעדה', array['מועצה מקומית  מסעדה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (518, 'מעיליא', array['מועצה מקומית  מעיליא'], 'local_council'::kesef.authority_status, 'הצפון'),
  (3608, 'מעלה אפרים', array['מועצה מקומית  מעלה אפרים'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (1327, 'מעלה עירון', array['מועצה מקומית  מעלה עירון'], 'local_council'::kesef.authority_status, 'חיפה'),
  (99, 'מצפה רמון', array['מועצה מקומית  מצפה רמון'], 'local_council'::kesef.authority_status, 'הדרום'),
  (520, 'משהד', array['מועצה מקומית  משהד'], 'local_council'::kesef.authority_status, 'הצפון'),
  (522, 'נחף', array['מועצה מקומית  נחף'], 'local_council'::kesef.authority_status, 'הצפון'),
  (525, 'סאג''ור', array['מועצה מקומית  סאג''ור'], 'local_council'::kesef.authority_status, 'הצפון'),
  (587, 'סביון', array['מועצה מקומית  סביון'], 'local_council'::kesef.authority_status, 'המרכז'),
  (666, 'עומר', array['מועצה מקומית  עומר'], 'local_council'::kesef.authority_status, 'הדרום'),
  (534, 'עספיא', array['מועצה מקומית  עספיא'], 'local_council'::kesef.authority_status, 'חיפה'),
  (530, 'עיילבון', array['מועצה מקומית  עיילבון'], 'local_council'::kesef.authority_status, 'הצפון'),
  (511, 'עילוט', array['מועצה מקומית  עילוט'], 'local_council'::kesef.authority_status, 'הצפון'),
  (3660, 'עמנואל', array['מועצה מקומית  עמנואל'], 'local_council'::kesef.authority_status, 'הצפון'),
  (532, 'עין מאהל', array['מועצה מקומית  עין מאהל'], 'local_council'::kesef.authority_status, 'הצפון'),
  (637, 'ערערה', array['מועצה מקומית  ערערה'], 'local_council'::kesef.authority_status, 'חיפה'),
  (1192, 'ערערה-בנגב', array['מועצה מקומית  ערערה-בנגב'], 'local_council'::kesef.authority_status, 'הדרום'),
  (537, 'פוריידיס', array['מועצה מקומית  פוריידיס'], 'local_council'::kesef.authority_status, 'חיפה'),
  (535, 'פסוטה', array['מועצה מקומית  פסוטה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (536, 'פקיעין (בוקייעה)', array['מועצה מקומית  פקיעין (בוקייעה)'], 'local_council'::kesef.authority_status, 'הצפון'),
  (7800, 'פרדס חנה-כרכור', array['מועצה מקומית  פרדס חנה-כרכור'], 'local_council'::kesef.authority_status, 'חיפה'),
  (171, 'פרדסייה', array['מועצה מקומית  פרדסייה'], 'local_council'::kesef.authority_status, 'המרכז'),
  (3557, 'קדומים', array['מועצה מקומית  קדומים'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (195, 'קדימה-צורן', array['מועצה מקומית  קדימה-צורן'], 'local_council'::kesef.authority_status, 'המרכז'),
  (4100, 'קצרין', array['מועצה מקומית  קצרין'], 'local_council'::kesef.authority_status, 'הצפון'),
  (3611, 'קריית ארבע', array['מועצה מקומית  קריית ארבע'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (2300, 'קריית טבעון', array['מועצה מקומית  קריית טבעון'], 'local_council'::kesef.authority_status, 'חיפה'),
  (1137, 'קריית יערים', array['מועצה מקומית  קריית יערים'], 'local_council'::kesef.authority_status, 'ירושלים'),
  (469, 'קריית עקרון', array['מועצה מקומית  קריית עקרון'], 'local_council'::kesef.authority_status, 'המרכז'),
  (3640, 'קרני שומרון', array['מועצה מקומית  קרני שומרון'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (543, 'ראמה', array['מועצה מקומית  ראמה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (26, 'ראש פינה', array['מועצה מקומית  ראש פינה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (542, 'ריינה', array['מועצה מקומית  ריינה'], 'local_council'::kesef.authority_status, 'הצפון'),
  (922, 'רכסים', array['מועצה מקומית  רכסים'], 'local_council'::kesef.authority_status, 'חיפה'),
  (122, 'רמת ישי', array['מועצה מקומית  רמת ישי'], 'local_council'::kesef.authority_status, 'הצפון'),
  (913, 'שבלי - אום אל-גנם', array['מועצה מקומית  שבלי - אום אל-גנם'], 'local_council'::kesef.authority_status, 'הצפון'),
  (1286, 'שגב-שלום', array['מועצה מקומית  שגב-שלום'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1304, 'שוהם', array['מועצה מקומית  שוהם'], 'local_council'::kesef.authority_status, 'המרכז'),
  (812, 'שלומי', array['מועצה מקומית  שלומי'], 'local_council'::kesef.authority_status, 'הצפון'),
  (538, 'שעב', array['מועצה מקומית  שעב'], 'local_council'::kesef.authority_status, 'הצפון'),
  (154, 'תל מונד', array['מועצה מקומית  תל מונד'], 'local_council'::kesef.authority_status, 'המרכז'),
  (1054, 'תל שבע', array['מועצה מקומית  תל שבע'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1722, 'מגדל תפן', array['מועצה מקומית  מגדל תפן'], 'local_council'::kesef.authority_status, null),
  (1770, 'נאות חובב', array['מועצה מקומית  נאות חובב'], 'local_council'::kesef.authority_status, 'הדרום'),
  (1113, 'צור הדסה', array['מועצה מקומית  צור הדסה'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (3826, 'שער שומרון', array['מועצה מקומית  שער שומרון'], 'local_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5565, 'אל-בטוף', array['מועצה אזורית  אל-בטוף'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5569, 'אל קסום', array['מועצה אזורית  אל קסום'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5545, 'אלונה', array['מועצה אזורית  אלונה'], 'regional_council'::kesef.authority_status, 'חיפה'),
  (5538, 'אשכול', array['מועצה אזורית  אשכול'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5533, 'באר טוביה', array['מועצה אזורית  באר טוביה'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5566, 'בוסתן אל-מרג''', array['מועצה אזורית  בוסתן אל-מרג'''], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5541, 'בני שמעון', array['מועצה אזורית  בני שמעון'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5528, 'ברנר', array['מועצה אזורית  ברנר'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5532, 'גדרות', array['מועצה אזורית  גדרות'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5571, 'גולן', array['מועצה אזורית  גולן'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5576, 'גוש עציון', array['מועצה אזורית  גוש עציון'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5530, 'גזר', array['מועצה אזורית  גזר'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5527, 'גן רווה', array['מועצה אזורית  גן רווה'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5520, 'דרום השרון', array['מועצה אזורית  דרום השרון'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5508, 'הגלבוע', array['מועצה אזורית  הגלבוע'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5501, 'הגליל העליון', array['מועצה אזורית  הגליל העליון'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5503, 'הגליל התחתון', array['מועצה אזורית  הגליל התחתון'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5554, 'הערבה התיכונה', array['מועצה אזורית  הערבה התיכונה'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5578, 'הר חברון', array['מועצה אזורית  הר חברון'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5512, 'זבולון', array['מועצה אזורית  זבולון'], 'regional_council'::kesef.authority_status, 'חיפה'),
  (5553, 'חבל אילות', array['מועצה אזורית  חבל אילות'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5529, 'חבל יבנה', array['מועצה אזורית  חבל יבנה'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5525, 'חבל מודיעין', array['מועצה אזורית  חבל מודיעין'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5536, 'חוף אשקלון', array['מועצה אזורית  חוף אשקלון'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5515, 'חוף הכרמל', array['מועצה אזורית  חוף הכרמל'], 'regional_council'::kesef.authority_status, 'חיפה'),
  (5519, 'חוף השרון', array['מועצה אזורית  חוף השרון'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5535, 'יואב', array['מועצה אזורית  יואב'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5518, 'לב השרון', array['מועצה אזורית  לב השרון'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5550, 'לכיש', array['מועצה אזורית  לכיש'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5555, 'מבואות החרמון', array['מועצה אזורית  מבואות החרמון'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5513, 'מגידו', array['מועצה אזורית  מגידו'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5574, 'מגילות ים המלח', array['מועצה אזורית  מגילות ים המלח'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5504, 'מטה אשר', array['מועצה אזורית  מטה אשר'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5573, 'מטה בנימין', array['מועצה אזורית  מטה בנימין'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5526, 'מטה יהודה', array['מועצה אזורית  מטה יהודה'], 'regional_council'::kesef.authority_status, 'ירושלים'),
  (5514, 'מנשה', array['מועצה אזורית  מנשה'], 'regional_council'::kesef.authority_status, 'חיפה'),
  (5552, 'מעלה יוסף', array['מועצה אזורית  מעלה יוסף'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5502, 'מרום הגליל', array['מועצה אזורית  מרום הגליל'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5542, 'מרחבים', array['מועצה אזורית  מרחבים'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5556, 'משגב', array['מועצה אזורית  משגב'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5568, 'נווה מדבר', array['מועצה אזורית  נווה מדבר'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5531, 'נחל שורק', array['מועצה אזורית  נחל שורק'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5506, 'עמק הירדן', array['מועצה אזורית  עמק הירדן'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5507, 'עמק המעיינות', array['מועצה אזורית  עמק המעיינות'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5516, 'עמק חפר', array['מועצה אזורית  עמק חפר'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5509, 'עמק יזרעאל', array['מועצה אזורית  עמק יזרעאל'], 'regional_council'::kesef.authority_status, 'הצפון'),
  (5575, 'ערבות הירדן', array['מועצה אזורית  ערבות הירדן'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5548, 'רמת נגב', array['מועצה אזורית  רמת נגב'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5540, 'שדות דן', array['מועצה אזורית  שדות דן'], 'regional_council'::kesef.authority_status, 'המרכז'),
  (5539, 'שדות נגב', array['מועצה אזורית  שדות נגב'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5572, 'שומרון', array['מועצה אזורית  שומרון'], 'regional_council'::kesef.authority_status, 'אזור יהודה והשומרון'),
  (5537, 'שער הנגב', array['מועצה אזורית  שער הנגב'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5534, 'שפיר', array['מועצה אזורית  שפיר'], 'regional_council'::kesef.authority_status, 'הדרום'),
  (5551, 'תמר', array['מועצה אזורית  תמר'], 'regional_council'::kesef.authority_status, 'הדרום')
on conflict (symbol) do update set
  name_he       = excluded.name_he,
  name_variants = excluded.name_variants,
  status        = excluded.status,
  district      = excluded.district,
  updated_at    = now();


-- 2 · The read API ------------------------------------------------------------
-- Every function below is SECURITY DEFINER with a pinned search_path, and every
-- one starts by refusing an unauthenticated caller. SECURITY DEFINER means the
-- function body runs as its owner and RLS on kesef.* no longer applies, so the
-- auth.uid() check is not belt-and-braces — it is the only thing standing
-- between the data and the public internet.

-- Which authorities exist. `p_q` matches the official name or any of the
-- publisher's name variants, so "עריית חצור" finds חצור הגלילית too.
create or replace function public.kesef_authorities(
  p_q        text default null,
  p_district text default null,
  p_status   text default null,
  p_limit    int  default 60
)
returns table (
  symbol                 int,
  name_he                text,
  status                 text,
  district               text,
  population             int,
  population_year        smallint,
  socio_economic_cluster smallint,
  website_url            text,
  has_data               boolean
)
language sql
security definer
set search_path = kesef, public, pg_temp
as $$
  select
    a.symbol, a.name_he, a.status::text, a.district,
    a.population, a.population_year, a.socio_economic_cluster, a.website_url,
    exists (select 1 from kesef.fact_financial f where f.authority_id = a.id)
  from kesef.authority a
  where auth.uid() is not null
    and (p_q is null or p_q = '' or a.name_he ilike '%' || p_q || '%'
         or exists (select 1 from unnest(a.name_variants) v where v ilike '%' || p_q || '%'))
    and (p_district is null or p_district = '' or a.district = p_district)
    and (p_status   is null or p_status   = '' or a.status::text = p_status)
  order by a.name_he
  limit greatest(1, least(coalesce(p_limit, 60), 300));
$$;

-- The source register, with how much has actually landed from each one. The
-- counts are what makes the "coming soon" honest: a source with zero documents
-- says zero rather than showing an empty screen with no explanation.
create or replace function public.kesef_sources()
returns table (
  slug            text,
  display_name    text,
  kind            text,
  base_url        text,
  sync_frequency  text,
  is_active       boolean,
  last_ok_at      timestamptz,
  last_error      text,
  notes           text,
  document_count  bigint
)
language sql
security definer
set search_path = kesef, public, pg_temp
as $$
  select
    s.slug, s.display_name, s.kind::text, s.base_url, s.sync_frequency,
    s.is_active, s.last_ok_at, s.last_error, s.notes,
    (select count(*) from kesef.source_document d where d.source_id = s.id)
  from kesef.data_source s
  where auth.uid() is not null
  order by s.display_name;
$$;

-- One authority, plus how many rows exist for it in every domain the system
-- covers. The UI drives its filter list off this: a domain reporting 0 is shown
-- as "לא זמין" instead of opening an empty table.
create or replace function public.kesef_authority_overview(p_symbol int)
returns jsonb
language sql
security definer
set search_path = kesef, public, pg_temp
as $$
  select case when auth.uid() is null then null else (
    select jsonb_build_object(
      'symbol',                 a.symbol,
      'name_he',                a.name_he,
      'status',                 a.status::text,
      'district',               a.district,
      'population',             a.population,
      'population_year',        a.population_year,
      'socio_economic_cluster', a.socio_economic_cluster,
      'peripherality_cluster',  a.peripherality_cluster,
      'financial_status',       a.financial_status,
      'website_url',            a.website_url,
      'counts', jsonb_build_object(
        'fact_financial',   (select count(*) from kesef.fact_financial    x where x.authority_id = a.id),
        'tabar',            (select count(*) from kesef.tabar             x where x.authority_id = a.id),
        'tender',           (select count(*) from kesef.tender            x where x.authority_id = a.id),
        'award',            (select count(*) from kesef.award             x where x.authority_id = a.id),
        'support_grant',    (select count(*) from kesef.support_grant     x where x.authority_id = a.id),
        'donation',         (select count(*) from kesef.donation          x where x.authority_id = a.id),
        'grant_call',       (select count(*) from kesef.grant_call_authority x where x.authority_id = a.id),
        'council_decision', (select count(*) from kesef.council_decision  x where x.authority_id = a.id),
        'official',         (select count(*) from kesef.official          x where x.authority_id = a.id),
        'satellite_entity', (select count(*) from kesef.satellite_entity  x where x.authority_id = a.id),
        'demographic_fact', (select count(*) from kesef.demographic_fact  x where x.authority_id = a.id),
        'benefit_uptake',   (select count(*) from kesef.benefit_uptake    x where x.authority_id = a.id),
        'metric_value',     (select count(*) from kesef.metric_value      x where x.authority_id = a.id),
        'alert',            (select count(*) from kesef.alert             x where x.authority_id = a.id),
        'source_document',  (select count(*) from kesef.source_document   x where x.authority_id = a.id)
      )
    )
    from kesef.authority a
    where a.symbol = p_symbol
  ) end;
$$;

-- The records themselves, for one authority and one domain, free-text filtered.
-- One function rather than fifteen: the domains share a shape at the UI (title,
-- subtitle, amount, date, source) and splitting them would mean fifteen grants
-- to keep in step. `p_domain` is matched against a fixed list, so it can never
-- become an injection point.
create or replace function public.kesef_records(
  p_symbol int,
  p_domain text,
  p_q      text default null,
  p_limit  int  default 100,
  p_offset int  default 0
)
returns table (
  title    text,
  subtitle text,
  amount   numeric,
  happened date,
  status   text,
  detail   jsonb
)
language plpgsql
security definer
set search_path = kesef, public, pg_temp
as $$
declare
  v_auth uuid;
  v_q    text := nullif(trim(coalesce(p_q, '')), '');
  v_lim  int  := greatest(1, least(coalesce(p_limit, 100), 500));
  v_off  int  := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    return;
  end if;

  select a.id into v_auth from kesef.authority a where a.symbol = p_symbol;
  if v_auth is null then
    return;
  end if;

  if p_domain = 'fact_financial' then
    return query
      select f.row_label, f.sheet_name, f.value, null::date,
             f.value_status::text,
             jsonb_build_object('fiscal_year', f.fiscal_year, 'measure', f.measure,
                                'unit', f.unit, 'coa_code', f.coa_code,
                                'verified', f.verified_by_human)
      from kesef.fact_financial f
      where f.authority_id = v_auth
        and (v_q is null or f.row_label ilike '%' || v_q || '%'
             or f.sheet_name ilike '%' || v_q || '%')
      order by f.fiscal_year desc nulls last, f.row_label
      limit v_lim offset v_off;

  elsif p_domain = 'tabar' then
    return query
      select t.name, t.number, t.approved_amount, t.current_due, t.status,
             jsonb_build_object('financial_pct', t.financial_pct,
                                'physical_pct', t.physical_pct,
                                'original_due', t.original_due,
                                'verified', t.verified_by_human)
      from kesef.tabar t
      where t.authority_id = v_auth
        and (v_q is null or t.name ilike '%' || v_q || '%' or t.number ilike '%' || v_q || '%')
      order by t.approved_amount desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'tender' then
    return query
      select t.title, t.category, t.estimate_amount, t.published_at::date,
             t.procurement_method,
             jsonb_build_object('closes_at', t.closes_at, 'ocid', t.ocid,
                                'exemption_reason', t.exemption_reason)
      from kesef.tender t
      where t.authority_id = v_auth
        and (v_q is null or t.title ilike '%' || v_q || '%' or t.category ilike '%' || v_q || '%')
      order by t.published_at desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'award' then
    return query
      select coalesce(v.name, 'ספק לא מזוהה'), t.title, w.amount, w.awarded_at::date,
             null::text,
             jsonb_build_object('bidders_count', w.bidders_count)
      from kesef.award w
      left join kesef.vendor v on v.id = w.vendor_id
      left join kesef.tender t on t.id = w.tender_id
      where w.authority_id = v_auth
        and (v_q is null or v.name ilike '%' || v_q || '%' or t.title ilike '%' || v_q || '%')
      order by w.awarded_at desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'support_grant' then
    return query
      select coalesce(v.name, g.criterion), g.criterion, g.approved_amount, null::date,
             null::text,
             jsonb_build_object('fiscal_year', g.fiscal_year,
                                'requested_amount', g.requested_amount,
                                'paid_amount', g.paid_amount,
                                'minutes_published', g.committee_minutes_published)
      from kesef.support_grant g
      left join kesef.vendor v on v.id = g.vendor_id
      where g.authority_id = v_auth
        and (v_q is null or v.name ilike '%' || v_q || '%' or g.criterion ilike '%' || v_q || '%')
      order by g.fiscal_year desc nulls last, g.approved_amount desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'donation' then
    return query
      select d.donor_name, d.purpose, d.amount, null::date, null::text,
             jsonb_build_object('fiscal_year', d.fiscal_year,
                                'was_published', d.was_published,
                                'committee_ref', d.committee_decision_ref)
      from kesef.donation d
      where d.authority_id = v_auth
        and (v_q is null or d.donor_name ilike '%' || v_q || '%' or d.purpose ilike '%' || v_q || '%')
      order by d.fiscal_year desc nulls last, d.amount desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'grant_call' then
    return query
      select c.title, c.ministry, coalesce(ga.awarded_amount, c.total_budget),
             c.closes_at::date, ga.state::text,
             jsonb_build_object('category', c.category, 'matching_pct', c.matching_pct,
                                'requested_amount', ga.requested_amount,
                                'missed_amount', ga.missed_amount, 'barrier', ga.barrier)
      from kesef.grant_call_authority ga
      join kesef.grant_call c on c.id = ga.grant_call_id
      where ga.authority_id = v_auth
        and (v_q is null or c.title ilike '%' || v_q || '%' or c.ministry ilike '%' || v_q || '%')
      order by c.closes_at desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'council_decision' then
    return query
      select d.text_he, d.item_number, null::numeric, m.held_at::date, d.state::text,
             jsonb_build_object('days_stuck', d.days_stuck,
                                'meeting_number', m.meeting_number,
                                'page_number', d.page_number)
      from kesef.council_decision d
      left join kesef.council_meeting m on m.id = d.meeting_id
      where d.authority_id = v_auth
        and (v_q is null or d.text_he ilike '%' || v_q || '%')
      order by m.held_at desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'official' then
    return query
      select o.full_name, o.role, null::numeric, o.term_start::date, null::text,
             jsonb_build_object('committees', o.committees, 'term_end', o.term_end,
                                'email', o.official_email, 'phone', o.official_phone)
      from kesef.official o
      where o.authority_id = v_auth
        and (v_q is null or o.full_name ilike '%' || v_q || '%' or o.role ilike '%' || v_q || '%')
      order by o.full_name
      limit v_lim offset v_off;

  elsif p_domain = 'satellite_entity' then
    return query
      select s.name, s.kind::text, null::numeric, null::date, null::text,
             jsonb_build_object('ownership_pct', s.ownership_pct,
                                'registration_id', s.registration_id,
                                'has_public_financials', s.has_public_financials,
                                'data_gap_reason', s.data_gap_reason,
                                'website_url', s.website_url)
      from kesef.satellite_entity s
      where s.authority_id = v_auth
        and (v_q is null or s.name ilike '%' || v_q || '%')
      order by s.name
      limit v_lim offset v_off;

  elsif p_domain = 'demographic_fact' then
    return query
      select d.metric, d.year::text, d.value, null::date, d.value_status::text,
             jsonb_build_object('national_value', d.national_value)
      from kesef.demographic_fact d
      where d.authority_id = v_auth
        and (v_q is null or d.metric ilike '%' || v_q || '%')
      order by d.year desc nulls last, d.metric
      limit v_lim offset v_off;

  elsif p_domain = 'benefit_uptake' then
    return query
      select b.benefit_type, b.year::text, b.avg_amount, null::date, b.value_status::text,
             jsonb_build_object('recipients', b.recipients,
                                'expected_recipients', b.expected_recipients,
                                'underuse_pct', b.underuse_pct)
      from kesef.benefit_uptake b
      where b.authority_id = v_auth
        and (v_q is null or b.benefit_type ilike '%' || v_q || '%')
      order by b.year desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'metric_value' then
    return query
      select m.metric_key, m.fiscal_year::text, m.value, null::date, null::text,
             jsonb_build_object('peer_median', m.peer_median, 'peer_p25', m.peer_p25,
                                'peer_p75', m.peer_p75, 'national_median', m.national_median,
                                'delta_vs_peer_pct', m.delta_vs_peer_pct, 'formula', m.formula)
      from kesef.metric_value m
      where m.authority_id = v_auth
        and (v_q is null or m.metric_key ilike '%' || v_q || '%')
      order by m.fiscal_year desc nulls last, m.metric_key
      limit v_lim offset v_off;

  elsif p_domain = 'alert' then
    return query
      select a.statement_he, a.rule_key, a.measured_value, null::date, a.severity::text,
             jsonb_build_object('fiscal_year', a.fiscal_year,
                                'reference_value', a.reference_value,
                                'delta_pct', a.delta_pct,
                                'methodology_url', a.methodology_url,
                                'response_text', a.response_text)
      from kesef.alert a
      where a.authority_id = v_auth
        and a.is_public
        and (v_q is null or a.statement_he ilike '%' || v_q || '%')
      order by a.computed_at desc nulls last
      limit v_lim offset v_off;

  elsif p_domain = 'source_document' then
    return query
      select d.title, d.doc_type, null::numeric, d.published_at, null::text,
             jsonb_build_object('url', d.url, 'page_count', d.page_count,
                                'fetched_at', d.fetched_at, 'sha256', d.sha256,
                                'disappeared_at', d.disappeared_at)
      from kesef.source_document d
      where d.authority_id = v_auth
        and (v_q is null or d.title ilike '%' || v_q || '%' or d.doc_type ilike '%' || v_q || '%')
      order by d.published_at desc nulls last
      limit v_lim offset v_off;
  end if;
end;
$$;

-- The districts, for the filter control. Derived, so it can never drift from
-- the authority rows the way a hard-coded list in the front-end would.
create or replace function public.kesef_districts()
returns table (district text, authority_count bigint)
language sql
security definer
set search_path = kesef, public, pg_temp
as $$
  select a.district, count(*)
  from kesef.authority a
  where auth.uid() is not null and a.district is not null and a.district <> ''
  group by a.district
  order by a.district;
$$;

-- Grants. `authenticated` only — see the header. Revoking from public first
-- matters because CREATE FUNCTION grants EXECUTE to PUBLIC by default, which
-- would hand anon exactly what these checks are meant to withhold.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.kesef_authorities(text,text,text,int)',
    'public.kesef_sources()',
    'public.kesef_authority_overview(int)',
    'public.kesef_records(int,text,text,int,int)',
    'public.kesef_districts()'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

