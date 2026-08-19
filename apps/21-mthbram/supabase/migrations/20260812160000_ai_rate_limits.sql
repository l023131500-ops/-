-- #165 — chat / search-lessons run with verify_jwt=false and spend LOVABLE_API_KEY
-- credits on every call. This is the storage the per-caller cap counts in.
-- Applied to the live project (aypsqqvfohekxxuqsmrw) on 2026-08-12.

create table if not exists public.ai_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket, window_start)
);

-- No policies: only service_role (the edge functions) ever touches this.
alter table public.ai_rate_limits enable row level security;

-- Atomic increment, so two concurrent requests can't both read the same count.
-- Returns allowed=false on the request that crosses p_limit.
create or replace function public.ai_rate_limit_hit(p_bucket text, p_window_start timestamptz, p_limit integer)
returns table(allowed boolean, hits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.ai_rate_limits as t (bucket, window_start, hits)
  values (p_bucket, p_window_start, 1)
  on conflict (bucket, window_start) do update
    set hits = t.hits + 1, updated_at = now()
  returning t.hits into v_hits;

  -- Opportunistic cleanup, only on the first hit of a new bucket.
  if v_hits = 1 then
    delete from public.ai_rate_limits where window_start < now() - interval '2 days';
  end if;

  return query select (v_hits <= p_limit), v_hits;
end;
$$;

revoke all on function public.ai_rate_limit_hit(text, timestamptz, integer) from public;
revoke all on function public.ai_rate_limit_hit(text, timestamptz, integer) from anon;
revoke all on function public.ai_rate_limit_hit(text, timestamptz, integer) from authenticated;
