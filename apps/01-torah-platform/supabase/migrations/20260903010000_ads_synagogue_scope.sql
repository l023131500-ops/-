-- Torah Platform · ads.synagogue_id (spec §5.2 religious council bullet
-- "פרסום פנימי – באנרים פר-ביכ״נ")
-- ============================================================================
-- public.ads has been tenant-scoped only since it was created (migration
-- 20260519000002): a religious_council tenant can run a banner, but only
-- tenant-wide -- there was never a way to target a banner at one specific
-- synagogue under that council. This adds an optional synagogue_id so a
-- council can publish a banner that only shows on that synagogue's own
-- public page (/s/[token] · migration-free feature added in this repo
-- already), while every existing row (synagogue_id null = tenant-wide,
-- unchanged behavior) keeps rendering exactly where it does today.
--
-- No RLS change needed: public.ads is already covered by the generic
-- tenant-scoped read/write policies from 20260519000002 (ads_tenant_read /
-- ads_tenant_write), which key off tenant_id only -- synagogue_id is just
-- extra filtering data within a row the caller could already read/write.
-- ============================================================================

alter table public.ads
  add column if not exists synagogue_id uuid references public.synagogues(id) on delete cascade;

create index if not exists idx_ads_synagogue on public.ads(synagogue_id);
