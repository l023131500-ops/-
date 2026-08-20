-- Public, no-login "case status" share link per client (analogous to the
-- share-link feature built for the 36-nadlan-pro broker CRM). Agents can
-- toggle share_enabled on a client; only then does the random share_token
-- resolve to a summary via the server-side /api/public/case-status route
-- (service-role lookup, never exposed to anon/RLS directly).
--
-- Deliberately NOT a single `ADD COLUMN share_token UUID NOT NULL DEFAULT
-- gen_random_uuid()`: the 36-nadlan-pro round (0104_nadlan_pro_public_listing)
-- verified live that this environment's Postgres evaluates a volatile
-- ADD COLUMN default once for the whole table rewrite rather than once per
-- row, so every pre-existing clients row would collide on the unique index
-- below. Add nullable, backfill per-row, then lock it down (same fix already
-- applied to the sibling 31-hebrew-bridge-crm migration).
ALTER TABLE public.clients ADD COLUMN share_token UUID;
UPDATE public.clients SET share_token = gen_random_uuid() WHERE share_token IS NULL;
ALTER TABLE public.clients ALTER COLUMN share_token SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN share_token SET DEFAULT gen_random_uuid();

ALTER TABLE public.clients ADD COLUMN share_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_clients_share_token ON public.clients(share_token);
