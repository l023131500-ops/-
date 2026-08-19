
ALTER TABLE public.rabbi_portals ADD COLUMN IF NOT EXISTS font_color text DEFAULT 'light';
ALTER TABLE public.org_portals ADD COLUMN IF NOT EXISTS font_color text DEFAULT 'light';
ALTER TABLE public.rabbi_portals ADD COLUMN IF NOT EXISTS donation_link text DEFAULT '';
ALTER TABLE public.rabbi_portals ADD COLUMN IF NOT EXISTS lesson_download_url text DEFAULT '';
ALTER TABLE public.prayer_times ADD COLUMN IF NOT EXISTS custom_category text DEFAULT '';
