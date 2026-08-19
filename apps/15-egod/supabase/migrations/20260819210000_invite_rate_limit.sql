-- core.issues #168 — activate-invite has no auth beyond {code,email}, and the
-- invite_code itself is a random 64-bit hex value (see teacher_invites.invite_code
-- default), so brute force is not practical today -- but the function still had
-- zero rate limiting as defense in depth, and a future weaker/admin-typed code
-- would have made unlimited guessing free. Same shape as public.ai_rate_limits
-- on 01-torah-platform (bieebmnmkffwbqlsfozh), #192.
--
-- Additive only: one new table, one new function, neither name existed before
-- (verified against the migrations already in this folder).

create table if not exists public.invite_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket, window_start)
);

-- No policies: only service_role (the edge function) ever touches this.
alter table public.invite_rate_limits enable row level security;

-- Atomic increment, so two concurrent requests can't both read the same count.
-- Returns allowed=false on the request that crosses p_limit.
create or replace function public.invite_rate_limit_hit(p_bucket text, p_window_start timestamptz, p_limit integer)
returns table(allowed boolean, hits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.invite_rate_limits as t (bucket, window_start, hits)
  values (p_bucket, p_window_start, 1)
  on conflict (bucket, window_start) do update
    set hits = t.hits + 1, updated_at = now()
  returning t.hits into v_hits;

  -- Opportunistic cleanup, only on the first hit of a new bucket.
  if v_hits = 1 then
    delete from public.invite_rate_limits where window_start < now() - interval '2 days';
  end if;

  return query select (v_hits <= p_limit), v_hits;
end;
$$;

revoke all on function public.invite_rate_limit_hit(text, timestamptz, integer) from public;
revoke all on function public.invite_rate_limit_hit(text, timestamptz, integer) from anon;
revoke all on function public.invite_rate_limit_hit(text, timestamptz, integer) from authenticated;
