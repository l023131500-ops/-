CREATE TABLE public.synagogue_full_access_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  synagogue_portal_id uuid,
  synagogue_name text NOT NULL DEFAULT '',
  city text DEFAULT '',
  contact_name text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  note text DEFAULT '',
  requested_features text[] NOT NULL DEFAULT '{}',
  approved_features text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.synagogue_full_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read synagogue_full_access_requests"
ON public.synagogue_full_access_requests FOR SELECT USING (true);

CREATE POLICY "Anyone can insert synagogue_full_access_requests"
ON public.synagogue_full_access_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update synagogue_full_access_requests"
ON public.synagogue_full_access_requests FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete synagogue_full_access_requests"
ON public.synagogue_full_access_requests FOR DELETE USING (true);

CREATE INDEX idx_sfar_portal ON public.synagogue_full_access_requests(synagogue_portal_id);
CREATE INDEX idx_sfar_status ON public.synagogue_full_access_requests(status);