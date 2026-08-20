-- Per-property document repository: mirrors property_media.property_label
-- (20260820140000_property_media.sql) so a broker can file a document (a
-- lease, a home inspection report, a mortgage doc) against a specific
-- property address instead of it just sitting in a flat client-wide list.
-- Nullable and additive — existing documents keep working as "כללי" (general).

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS property_label TEXT;
