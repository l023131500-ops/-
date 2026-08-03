-- Torah Editor MVP - Supabase schema
-- Tables: profiles, documents, citations, edits
-- All tables use Row Level Security (RLS) scoped to auth.uid()

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ documents ============
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'ללא כותרת',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_own"
  on public.documents for select
  using (auth.uid() = owner_id);

create policy "documents_insert_own"
  on public.documents for insert
  with check (auth.uid() = owner_id);

create policy "documents_update_own"
  on public.documents for update
  using (auth.uid() = owner_id);

create policy "documents_delete_own"
  on public.documents for delete
  using (auth.uid() = owner_id);

-- ============ citations ============
create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  ref text not null,
  quoted_text text not null,
  start_char integer not null,
  end_char integer not null,
  status text not null default 'pending' check (status in ('pending','match','deviation','missing')),
  source_text text,
  source_url text,
  distance integer,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.citations enable row level security;

create policy "citations_select_own"
  on public.citations for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = citations.document_id and d.owner_id = auth.uid()
    )
  );

create policy "citations_insert_own"
  on public.citations for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = citations.document_id and d.owner_id = auth.uid()
    )
  );

create policy "citations_update_own"
  on public.citations for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = citations.document_id and d.owner_id = auth.uid()
    )
  );

create policy "citations_delete_own"
  on public.citations for delete
  using (
    exists (
      select 1 from public.documents d
      where d.id = citations.document_id and d.owner_id = auth.uid()
    )
  );

-- ============ edits ============
create table if not exists public.edits (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  kind text not null check (kind in ('nikud','proofread','citation_format','title_suggestion','other')),
  before_text text,
  after_text text,
  approved boolean,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.edits enable row level security;

create policy "edits_select_own"
  on public.edits for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = edits.document_id and d.owner_id = auth.uid()
    )
  );

create policy "edits_insert_own"
  on public.edits for insert
  with check (
    exists (
      select 1 from public.documents d
      where d.id = edits.document_id and d.owner_id = auth.uid()
    )
  );

create policy "edits_update_own"
  on public.edits for update
  using (
    exists (
      select 1 from public.documents d
      where d.id = edits.document_id and d.owner_id = auth.uid()
    )
  );
