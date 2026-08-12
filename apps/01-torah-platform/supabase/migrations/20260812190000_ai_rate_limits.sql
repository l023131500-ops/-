-- #192 — ai-match-teacher runs on service_role and spends LOVABLE_API_KEY credit
-- for anyone holding the public anon key (every browser gets one). This is the
-- storage the per-caller cap counts in. Same shape as 21-mthbram / 22-zchuyot.
-- Applied to the live project (bieebmnmkffwbqlsfozh) on 2026-08-12.
--
-- Additive only. This project also carries the protected zr_* functions, so
-- nothing existing is altered here: one new table and one new function, both
-- with names that did not exist (verified before applying).

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
