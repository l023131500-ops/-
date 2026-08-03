-- Create synagogue_portals table mirroring org_portals shape
CREATE TABLE public.synagogue_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  access_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  public_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  synagogue_name text NOT NULL,
  city text DEFAULT '',
  street text DEFAULT '',
  street_number text DEFAULT '',
  neighborhood text DEFAULT '',
  logo_url text DEFAULT '',
  contact_name text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  contact_whatsapp text DEFAULT '',
  contact_address text DEFAULT '',
  contact_mailing_address text DEFAULT '',
  contact_fax text DEFAULT '',
  donation_link text DEFAULT '',
  background_preset text DEFAULT '',
  custom_background_url text DEFAULT '',
  font_color text DEFAULT 'light',
  target_audience text[] DEFAULT '{}',
  about_text text DEFAULT '',
  notes text DEFAULT '',
  features_enabled jsonb DEFAULT '{"lessons": true, "settings": false}'::jsonb,
  custom_sections jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.synagogue_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read synagogue_portals" ON public.synagogue_portals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert synagogue_portals" ON public.synagogue_portals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update synagogue_portals" ON public.synagogue_portals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete synagogue_portals" ON public.synagogue_portals FOR DELETE USING (true);

-- Add synagogue_portal_id to lessons
ALTER TABLE public.lessons ADD COLUMN synagogue_portal_id uuid;
CREATE INDEX idx_lessons_synagogue_portal_id ON public.lessons(synagogue_portal_id);