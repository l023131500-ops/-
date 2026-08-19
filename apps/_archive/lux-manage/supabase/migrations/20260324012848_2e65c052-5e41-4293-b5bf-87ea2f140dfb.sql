
-- Add 'advisor' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor';

-- Create rights_inquiries table
CREATE TABLE public.rights_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  right_type text NOT NULL DEFAULT '',
  description text DEFAULT '',
  service_preference text NOT NULL DEFAULT 'diy',
  status text NOT NULL DEFAULT 'new',
  assigned_advisor_id uuid DEFAULT NULL,
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rights_inquiries ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own inquiries
CREATE POLICY "Clients manage own rights inquiries"
  ON public.rights_inquiries FOR ALL
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Admins can see all
CREATE POLICY "Admins manage all rights inquiries"
  ON public.rights_inquiries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Advisors can see assigned inquiries
CREATE POLICY "Advisors see assigned inquiries"
  ON public.rights_inquiries FOR SELECT
  TO authenticated
  USING (assigned_advisor_id = auth.uid());

-- Add advisor columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_advisor_id uuid DEFAULT NULL;

-- Add dismissal_reason and snooze_date to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dismissal_reason text DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS snooze_until date DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS remind_date date DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS remind_channel text DEFAULT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.rights_inquiries;
