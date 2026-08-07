-- 0024 — the register knows where each system's admin entry is; the page that
--        was supposed to offer it never received the column
--
-- §3 asks for a "נהל מערכת זו" link per system and §5 asks that the bkalot clone
-- be shown like every other site, "כולל כניסה לניהול". Both read
-- core.projects.admin_url, and 0022/0023 spent two steps measuring that column
-- against production until fourteen of the twenty-one public systems held a
-- verified address.
--
-- more30_system_page — the RPC behind more30.com/<system>, the only public screen
-- a system has — never selected it. The measurement landed in a column no reader
-- read, so from the customer's side nothing changed in either step.
--
-- What is returned, and what is deliberately withheld:
--
--   admin_url   only when it is a followable address AND admin_auth is 'own' or
--               'hub'. kupot records '/api/switch-leads (כותרת x-admin-token)'
--               with admin_auth='token' — that is an API endpoint plus the header
--               it wants, not a screen, and rendering it as a link would produce
--               a 404 and call it a management entry.
--   admin_auth  passed through so the page can say whose sign-in it is: 'own' is
--               the system's own gate, 'hub' is the platform super-admin.
--
-- The value is a public address either way; every one of these entries is gated at
-- its destination, and this publishes no credential. Two of them are gated only in
-- theory today and both are already filed, not hidden: galil's /gabai cannot
-- authenticate at all (core.issues #62, and the site's own navbar already links
-- there), and torah's /legacy/* consoles are open until one deploy runs
-- (core.issues #87). Neither is made worse by the register telling the truth about
-- where its entry is.
--
-- Nothing here touches 08, 09, bkalut-app, bkalot-admin, zr_* or NEDARIM3873, and
-- no billing or sending state is changed. The only difference in the payload is
-- two added keys.

create or replace function public.more30_system_page(p_app text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core'
as $function$
declare
  v_key   text;
  v_from  text;
  v_proj  core.projects%rowtype;
  v_plans jsonb;
  v_admin text;
begin
  v_key := coalesce(core.app_key_normalize(p_app), 'more30');
  select * into v_proj from core.projects where path = v_key;

  -- A followable address only. Anything carrying a header, a note or a space is
  -- an instruction to a developer, not a link for a person.
  if v_proj.admin_auth in ('own', 'hub')
     and v_proj.admin_url ~ '^(/|https?://)\S*$' then
    v_admin := v_proj.admin_url;
  end if;

  select jsonb_agg(to_jsonb(p) order by p.sort), max(v_key)
    into v_plans, v_from
  from (
    select code, name_he, tagline, price_ils, period, features, is_default, sort
    from core.plans
    where app_key = v_key and active and customer_visible
  ) p;

  if v_plans is null then
    v_from := 'more30';
    select jsonb_agg(to_jsonb(p) order by p.sort) into v_plans
    from (
      select code, name_he, tagline, price_ils, period, features, is_default, sort
      from core.plans
      where app_key = 'more30' and active and customer_visible
    ) p;
  end if;

  return jsonb_build_object(
    'app_key',  v_key,
    'app_name', coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'name_he',  coalesce(v_proj.name_he, 'עולם הסטארטאפים'),
    'enter_url', v_proj.live_url,
    'plans_from', coalesce(v_from, 'more30'),
    'plans', coalesce(v_plans, '[]'::jsonb),
    'found', v_proj.path is not null,
    'is_deployed', coalesce(v_proj.is_deployed, false),
    'tagline', v_proj.tagline,
    'what_it_does', v_proj.what_it_does,
    'functions', v_proj.functions,
    'admin_url', v_admin,
    'admin_auth', case when v_admin is null then null else v_proj.admin_auth end
  );
end;
$function$;

-- One record was withheld by the rule above for a reason that is not a fact about
-- the system: kiosk holds a real console at https://more30.com/kiosk/console with
-- admin_auth NULL, so the gate reads "unknown" and refuses it. The console's own
-- sign-in is documented and used — user 'admin', password changeable from
-- Settings (NEEDS_USER §4) — which is exactly what 'own' means here. Recorded so
-- the entry is withheld only where there is nothing to offer.
update core.projects
   set admin_auth = 'own',
       updated_at = now()
 where slug = 'kioskfleet'
   and admin_url = 'https://more30.com/kiosk/console'
   and admin_auth is null;
