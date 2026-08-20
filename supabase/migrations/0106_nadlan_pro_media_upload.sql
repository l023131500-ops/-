-- more30 · 36 nadlan-pro — real photo upload + a video link on a property
-- ============================================================================
-- Two things flagged as "a separate, larger next step" and left as comments
-- for whoever came back to this (app.html's propertyForm, and 0105's header):
--   1. Photos were paste-a-link only — no actual upload, no storage bucket.
--   2. There was no video field on a property at all.
--
-- Photos: a real Storage bucket, public read (the public listing page at
-- listing.html has no session — it reads with the anon key, same as every
-- other public-facing page in this app), write restricted to a signed-in
-- member of the office the file is filed under. Video: a pasted link, same
-- posture as `property_documents.url` (0105) and `images` (0009) — no
-- transcoding pipeline, no upload-progress-across-days problem, just a link
-- the office already has (YouTube/Vimeo/their own host) or a direct file URL
-- the app embeds with a plain <video> tag. A real video *upload* pipeline is
-- its own, larger step — not invented here.
-- ============================================================================

alter table nadlan_pro.properties
  add column if not exists video_url text;

-- Storage bucket for property photos uploaded from the browser. Public read
-- (this is what makes the public listing page work without a session);
-- 15MB/file is generous for a phone photo without inviting a video dumped in
-- here under the wrong feature.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nadlan-pro-media', 'nadlan-pro-media', true, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects are written under `{office_id}/{property_id}/{filename}`. A member
-- may write under any office they belong to (agents share the same photo
-- shelf as their office, same as `images` on the property row itself); the
-- first path segment must parse as a uuid before it is compared, so a
-- malformed key fails the policy instead of raising inside it.
do $$ begin
  create policy np_media_insert on storage.objects for insert to authenticated
    with check (
      bucket_id = 'nadlan-pro-media'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and ((storage.foldername(name))[1])::uuid in (select nadlan_pro.my_office_ids())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy np_media_delete on storage.objects for delete to authenticated
    using (
      bucket_id = 'nadlan-pro-media'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and ((storage.foldername(name))[1])::uuid in (select nadlan_pro.my_office_ids())
    );
exception when duplicate_object then null; end $$;

-- Explicit read policy in addition to the bucket's public flag: the public
-- flag serves anonymous GETs through the object endpoint regardless of RLS,
-- but a signed-in office member listing/rendering their own photos should
-- not depend on that flag alone.
do $$ begin
  create policy np_media_select on storage.objects for select to authenticated, anon
    using (bucket_id = 'nadlan-pro-media');
exception when duplicate_object then null; end $$;

-- np_property_save (0104): add video_url alongside the existing text fields.
-- Same coalesce-from-existing shape as title/address/description — sending
-- an empty string clears it (nullif), omitting the key leaves it alone.
create or replace function public.np_property_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
begin
  if v_id is null then
    insert into nadlan_pro.properties (
      office_id, owner_id, seller_contact_id, title, address, city,
      gush, helka, tat_helka, asset_type, rooms, area_sqm, floor, total_floors,
      price, status, is_exclusive, exclusivity_until, description, images, video_url)
    values (
      (p->>'office_id')::uuid,
      coalesce(nullif(p->>'owner_id','')::uuid, auth.uid()),
      nullif(p->>'seller_contact_id','')::uuid,
      p->>'title', p->>'address', p->>'city',
      nullif(p->>'gush',''), nullif(p->>'helka',''), nullif(p->>'tat_helka',''),
      coalesce(nullif(p->>'asset_type',''), 'apartment')::nadlan_pro.asset_type,
      nullif(p->>'rooms','')::numeric, nullif(p->>'area_sqm','')::int,
      nullif(p->>'floor','')::int, nullif(p->>'total_floors','')::int,
      nullif(p->>'price','')::numeric,
      coalesce(nullif(p->>'status',''), 'active')::nadlan_pro.property_status,
      coalesce(nullif(p->>'is_exclusive','')::boolean, false),
      nullif(p->>'exclusivity_until','')::date,
      p->>'description',
      coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}'),
      nullif(p->>'video_url',''))
    returning id into v_id;
  else
    update nadlan_pro.properties pr set
      seller_contact_id = coalesce(nullif(p->>'seller_contact_id','')::uuid, pr.seller_contact_id),
      title      = coalesce(p->>'title', pr.title),
      address    = coalesce(p->>'address', pr.address),
      city       = coalesce(p->>'city', pr.city),
      gush       = coalesce(nullif(p->>'gush',''), pr.gush),
      helka      = coalesce(nullif(p->>'helka',''), pr.helka),
      tat_helka  = coalesce(nullif(p->>'tat_helka',''), pr.tat_helka),
      asset_type = coalesce(nullif(p->>'asset_type','')::nadlan_pro.asset_type, pr.asset_type),
      rooms      = coalesce(nullif(p->>'rooms','')::numeric, pr.rooms),
      area_sqm   = coalesce(nullif(p->>'area_sqm','')::int, pr.area_sqm),
      floor      = coalesce(nullif(p->>'floor','')::int, pr.floor),
      total_floors = coalesce(nullif(p->>'total_floors','')::int, pr.total_floors),
      price      = coalesce(nullif(p->>'price','')::numeric, pr.price),
      status     = coalesce(nullif(p->>'status','')::nadlan_pro.property_status, pr.status),
      is_exclusive = coalesce(nullif(p->>'is_exclusive','')::boolean, pr.is_exclusive),
      exclusivity_until = coalesce(nullif(p->>'exclusivity_until','')::date, pr.exclusivity_until),
      description = coalesce(p->>'description', pr.description),
      owner_id   = coalesce(nullif(p->>'owner_id','')::uuid, pr.owner_id),
      images     = case when p ? 'images'
                     then coalesce((select array_agg(value::text) from jsonb_array_elements_text(p->'images')), '{}')
                     else pr.images end,
      video_url  = case when p ? 'video_url' then nullif(p->>'video_url','') else pr.video_url end
    where pr.id = v_id;
    if not found then
      raise exception 'הנכס לא נמצא, או שאין לך הרשאה לערוך אותו';
    end if;
  end if;
  return v_id;
end $$;

-- np_property_public (0104): the client-facing listing gets the video link
-- too, same posture as images — it is content the office chose to publish.
create or replace function public.np_property_public(p_token text)
returns jsonb language plpgsql security definer
set search_path = nadlan_pro, public, pg_temp as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'ok', true,
    'title', p.title, 'address', p.address, 'city', p.city,
    'asset_type', p.asset_type::text, 'rooms', p.rooms, 'area_sqm', p.area_sqm,
    'floor', p.floor, 'total_floors', p.total_floors, 'price', p.price,
    'status', p.status::text, 'description', p.description, 'images', p.images,
    'video_url', p.video_url,
    'office_name', o.name, 'office_phone', o.phone, 'office_email', o.email,
    'report_query', case
      when nullif(trim(coalesce(p.address, '')), '') is not null
        then trim(p.address || coalesce(' ' || nullif(p.city, ''), ''))
      when p.gush is not null and p.helka is not null then p.gush || '/' || p.helka
      else null
    end
  ) into v
  from nadlan_pro.properties p
  join nadlan_pro.offices o on o.id = p.office_id
  where p.share_token = p_token and p.share_enabled = true;

  if v is null then
    return jsonb_build_object('ok', false,
      'error', 'הקישור אינו זמין. ייתכן שהמתווך הסיר את השיתוף, או שהקישור שגוי.');
  end if;
  return v;
end $$;
