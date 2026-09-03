-- Restricted forum categories were never actually restricted for anyone.
-- forum_categories.is_restricted + allowed_subjects (text[]) exist and were
-- seeded meaningfully at table creation (20260501082815), e.g. the "דף יומי"
-- category has allowed_subjects=['דף יומי'] -- clearly intended to scope
-- that forum to teachers who teach Daf Yomi. profiles.subjects (text[]) is
-- the matching teacher-side field. But seed_teacher_defaults() (added later,
-- 20260504220643) grants every new teacher can_view/can_post/can_comment=true
-- on every forum_categories row unconditionally, ignoring is_restricted and
-- allowed_subjects entirely -- so a "restricted" forum was only ever
-- restricted if an admin manually revoked access per teacher afterwards via
-- TeacherFeaturesDialog (public.teacher_forum_access upsert), never by
-- default. Fixes forward only: new teacher signups now get view/post/comment
-- access to a restricted category only when profiles.subjects overlaps that
-- category's allowed_subjects; unrestricted categories are unaffected (still
-- full access by default). Existing teacher_forum_access rows are untouched
-- -- no retroactive revocation of already-granted access, zero regression.
create or replace function public.seed_teacher_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.teacher_features (teacher_id, feature_key, enabled)
  select new.id, k, true from unnest(array[
    'lessons','schedule','study_daily','participants','attendance',
    'prayer_times','materials_upload','public_profile','donations',
    'messages_inbox','forums_view','forums_post','custom_sections'
  ]) as k
  on conflict do nothing;

  insert into public.teacher_forum_access (teacher_id, category_id, can_view, can_post, can_comment)
  select
    new.id,
    c.id,
    coalesce(not c.is_restricted, true) or (coalesce(new.subjects, '{}'::text[]) && coalesce(c.allowed_subjects, '{}'::text[])),
    coalesce(not c.is_restricted, true) or (coalesce(new.subjects, '{}'::text[]) && coalesce(c.allowed_subjects, '{}'::text[])),
    coalesce(not c.is_restricted, true) or (coalesce(new.subjects, '{}'::text[]) && coalesce(c.allowed_subjects, '{}'::text[]))
  from public.forum_categories c
  on conflict do nothing;
  return new;
end $$;
