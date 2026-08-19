-- Rabbi Questions table
CREATE TABLE public.rabbi_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  question text NOT NULL,
  contact_method text NOT NULL DEFAULT 'whatsapp',
  contact_value text NOT NULL,
  destination text NOT NULL DEFAULT 'beit_horaa',
  urgent boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rabbi_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rabbi questions public insert" ON public.rabbi_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Rabbi questions readable" ON public.rabbi_questions FOR SELECT USING (true);
CREATE POLICY "Rabbi questions updatable" ON public.rabbi_questions FOR UPDATE USING (true);
CREATE POLICY "Rabbi questions deletable" ON public.rabbi_questions FOR DELETE USING (true);

-- Gallery Images table
CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery public read" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Gallery writable" ON public.gallery_images FOR ALL USING (true) WITH CHECK (true);

-- Activity Slides table
CREATE TABLE public.activity_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity slides public read" ON public.activity_slides FOR SELECT USING (true);
CREATE POLICY "Activity slides writable" ON public.activity_slides FOR ALL USING (true) WITH CHECK (true);

-- Knowledge Base table
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  title text NOT NULL,
  content text NOT NULL,
  phone text,
  address text,
  contact_name text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge public read" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Knowledge writable" ON public.knowledge_base FOR ALL USING (true) WITH CHECK (true);

-- Insert default knowledge data
INSERT INTO public.knowledge_base (category, title, content, phone, address, contact_name) VALUES
  ('סת"ם', 'סופר סת"ם — רבי יעקב הסופר', 'כתיבת ספרי תורה, מזוזות ותפילין. בדיקה ותיקון.', '050-1111111', 'רחוב הרצל 8, חצור הגלילית', 'רבי יעקב הסופר'),
  ('סת"ם', 'בדיקת מזוזות ותפילין', 'בדיקה ממוחשבת ובדיקה ידנית מוסמכת.', '052-2222222', NULL, 'הרב שמעון'),
  ('גמ"חים', 'גמ"ח ציוד רפואי', 'השאלת כסאות גלגלים, קביים, מכשירי לחץ דם וציוד נוסף.', '053-4444444', NULL, 'אבי כהן'),
  ('גמ"חים', 'גמ"ח שמחות', 'ציוד לאירועים: שולחנות, כיסאות, כלים חד-פעמיים.', '054-5555555', NULL, 'משה לוי'),
  ('גמ"חים', 'גמ"ח ביגוד', 'בגדים חדשים ומשומרים לכל הגילאים.', '050-6666666', 'רחוב הזית 10', 'שרה ישראלי'),
  ('גמ"חים', 'גמ"ח מזון', 'חלוקת סלי מזון לנזקקים.', '050-7770000', NULL, 'יצחק פרץ'),
  ('גמ"חים', 'גמ"ח ספרי קודש', 'השאלת ספרי קודש, גמרות, שולחן ערוך.', '052-8880000', NULL, 'דוד מזרחי'),
  ('נישואין', 'רישום לנישואין', 'יש להגיע לרבנות המקומית עם תעודות זהות.', '04-6000001', 'רבנות חצור הגלילית', 'מזכירות הרבנות'),
  ('נישואין', 'הכנה לחתונה', 'שיעורי כלה וחתן.', '050-7777777', NULL, 'הרבנית שרה'),
  ('פטירה ואבלות', 'חברה קדישא', 'טיפול בנפטר, לוויה וקבורה. פעילים 24/6.', '04-6333333', NULL, 'חברה קדישא חצור'),
  ('פטירה ואבלות', 'הלכות אבלות', 'מידע על שבעה, שלושים ויב חודש.', '050-8888888', NULL, 'הרב עוזיאל דיעי'),
  ('מידע כללי', 'רב העיר', 'הרב עוזיאל דיעי שליט"א.', '050-9999999', NULL, 'הרב עוזיאל דיעי'),
  ('מידע כללי', 'שעות קבלת קהל — רבנות', 'ימים א-ה 09:00-13:00, ימים ב ו-ד 16:00-18:00.', '04-6000000', NULL, NULL),
  ('בית דין', 'בית הדין לממונות', 'סכסוכי שכנים, תביעות ממוניות, בוררות.', '04-6000002', NULL, 'מזכירות בית הדין'),
  ('ייעוץ נישואין', 'ייעוץ זוגי ומשפחתי', 'שירות ייעוץ משפחתי של המועצה הדתית.', '04-6000003', NULL, 'היועצת');