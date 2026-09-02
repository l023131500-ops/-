-- more30 · 36 nadlan-pro — rent payment waive + client wiring for manual/edit
-- ============================================================================
-- Module 6 rental management (0127) shipped rent_payment_status as an enum
-- of 'due' | 'paid' | 'waived', and app.html's RSTATUS_HE already carried a
-- Hebrew label for 'waived' ("ויתור") -- but no function ever set a payment
-- to 'waived', and np_rent_payment_save (insert/edit due_date, amount, note)
-- was never called from any client file at all. In practice a broker who
-- generated a monthly schedule had no way to: add a one-off/ad-hoc payment
-- row outside the generated schedule, fix a wrong due_date/amount before it
-- was collected, or record a month the landlord waived (a state the schema
-- and the UI's own label already anticipated but could never be reached).
--
-- This migration adds only the missing waive action, mirroring
-- np_rent_payment_mark_paid exactly (same table, same RLS via the lease's
-- office/owner gate, same not-found error). np_rent_payment_save already
-- exists and needs no schema change -- only client wiring (done in
-- sites/36-nadlan-pro/tivuch/app.html alongside this migration).

create or replace function public.np_rent_payment_waive(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.rent_payments set status = 'waived'
  where id = p_id;
  if not found then
    raise exception 'התשלום לא נמצא, או שאין לך הרשאה לערוך אותו';
  end if;
end
$$;
