-- more30 · 36 nadlan-pro — fix function_search_path_mutable advisor warnings
-- ============================================================================
-- nadlan_pro.touch_updated_at() (0009_nadlan_pro_schema.sql, the before-update
-- trigger on offices/contacts/properties/deals) and
-- nadlan_pro.allocation_threshold() (0011_nadlan_pro_invoices.sql, the
-- allocation-number threshold lookup used by the invoice red-line constraint)
-- were both defined without `set search_path`, unlike every other nadlan_pro
-- function in this schema (can_touch/manages_office/my_office_ids/etc all set
-- it). A mutable search_path lets a caller who can create objects in a schema
-- earlier in their session's search_path shadow an unqualified reference —
-- not exploitable here today since neither function makes an unqualified
-- reference to another object (touch_updated_at only touches NEW.updated_at;
-- allocation_threshold only compares literals), but it is the standing gap
-- the advisor flags and the one-line fix costs nothing.
--
-- ALTER FUNCTION ... SET search_path only attaches a configuration parameter
-- to the function; it does not redefine the body, so behavior is unchanged.
-- ============================================================================

alter function nadlan_pro.touch_updated_at()
  set search_path = nadlan_pro, public, pg_temp;

alter function nadlan_pro.allocation_threshold(date)
  set search_path = nadlan_pro, public, pg_temp;
