-- Public, no-login "case status" share link per client (analogous to the
-- share-link feature built for the 36-nadlan-pro broker CRM). Agents can
-- toggle share_enabled on a client; only then does the random share_token
-- resolve to a summary via the server-side /api/public/case-status route
-- (service-role lookup, never exposed to anon/RLS directly).
ALTER TABLE public.clients
  ADD COLUMN share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN share_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_clients_share_token ON public.clients(share_token);
