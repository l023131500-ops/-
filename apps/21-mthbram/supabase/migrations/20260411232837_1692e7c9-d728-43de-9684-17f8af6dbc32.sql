
-- Add contact details and custom sections to rabbi_portals
ALTER TABLE public.rabbi_portals 
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_whatsapp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_fax text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_mailing_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_sections jsonb DEFAULT '[]'::jsonb;

-- Add contact details and custom sections to org_portals
ALTER TABLE public.org_portals 
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_whatsapp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_fax text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_mailing_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_sections jsonb DEFAULT '[]'::jsonb;
