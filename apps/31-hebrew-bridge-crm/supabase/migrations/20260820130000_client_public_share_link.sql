-- Public, no-login "case status" share link per client (mirrors the identical
-- feature just built for the sibling CRM 30-zchuyotpro-crm, adapted to this
-- app's real schema: client_profiles + partner_assignments, not clients).
-- An admin can toggle share_enabled on a client_profiles row; only then does
-- the random share_token resolve to a summary via the server-side
-- /api/public/case-status route (service-role lookup, never exposed to
-- anon/RLS directly).
--
-- Deliberately NOT a single `ADD COLUMN share_token UUID NOT NULL DEFAULT
-- gen_random_uuid()`: the 36-nadlan-pro round (0104_nadlan_pro_public_listing)
-- verified live that this environment's Postgres evaluates a volatile
-- ADD COLUMN default once for the whole table rewrite rather than once per
-- row, so every pre-existing client_profiles row would collide on the
-- unique index below. Add nullable, backfill per-row, then lock it down.
ALTER TABLE public.client_profiles ADD COLUMN share_token UUID;
UPDATE public.client_profiles SET share_token = gen_random_uuid() WHERE share_token IS NULL;
ALTER TABLE public.client_profiles ALTER COLUMN share_token SET NOT NULL;
ALTER TABLE public.client_profiles ALTER COLUMN share_token SET DEFAULT gen_random_uuid();

ALTER TABLE public.client_profiles ADD COLUMN share_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_client_profiles_share_token ON public.client_profiles(share_token);
