-- src/pages/admin/TeacherFeaturesDialog.tsx (opened from the live "הרשאות"
-- button on admin/Teachers.tsx) reads/writes public.teacher_features and
-- public.teacher_forum_access -- neither table exists in any prior
-- migration (grep across supabase/migrations: 0 hits for either name
-- outside this one file). The load queries silently return no rows (so the
-- dialog always opens showing every switch defaulted to "on"), but every
-- save has always thrown "relation ... does not exist" (42P01), so no
-- per-teacher feature/forum permission set from this screen has ever
-- persisted. teacher_id is a public.profiles(id) -- the same row
-- admin/Teachers.tsx passes into the dialog as `teacher`.
--
-- Same RLS shape as the existing per-tenant equivalent (tenant_features):
-- world-readable booleans (features_read on tenant_features uses `true`
-- too -- these gate UI, not sensitive data), writes restricted to
-- is_super_admin() since only the admin screen ever writes here.
create table if not exists public.teacher_features (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, feature_key)
);
alter table public.teacher_features enable row level security;

create policy "teacher_features_read" on public.teacher_features for select using (true);
create policy "teacher_features_write" on public.teacher_features for all
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));

create table if not exists public.teacher_forum_access (
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  can_view boolean not null default true,
  can_post boolean not null default true,
  can_comment boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, category_id)
);
alter table public.teacher_forum_access enable row level security;

create policy "teacher_forum_access_read" on public.teacher_forum_access for select using (true);
create policy "teacher_forum_access_write" on public.teacher_forum_access for all
  using (is_super_admin((select auth.uid())))
  with check (is_super_admin((select auth.uid())));
