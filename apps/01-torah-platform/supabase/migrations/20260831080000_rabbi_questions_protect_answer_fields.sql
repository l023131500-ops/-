-- Same class of gap as 20260831050000/60000/70000 (raised_ils, orders/
-- donations payment fields, materials moderation fields): RLS restricts
-- rows, not columns. `rabbi_questions_tenant_write_upd` grants UPDATE to
-- `moderator`/`tenant_admin` AND plain `member` alike, with no column
-- restriction. The only public-facing consumer, public/RabbiQuestions.tsx,
-- reads rows `where is_public = true and answer is not null` and renders
-- them under a "תשובת הרב" (the rabbi's answer) badge -- but nothing stops
-- any tenant member from calling
-- `.from("rabbi_questions").update({answer:"...", is_public:true, status:
-- "answered"})` on ANY question in the tenant, including someone else's
-- anonymous/private submission (`rabbi_questions_tenant_read` already lets
-- tenant members read rows they didn't submit). That both fabricates an
-- official-looking rabbi answer under a real user's name and can publish a
-- private/anonymous question to the public page without consent.
--
-- `rabbi_questions_insert`'s `with_check` has the same shape: the public-
-- intake branch correctly requires `answer is null and is_public = false`,
-- but the `has_tenant_role(..., 'member')` branch has no such requirement --
-- an authenticated member can INSERT a brand-new row with `answer` and
-- `is_public` already set, achieving the same fake-answer result at create
-- time instead of update time. Both paths need the same guard.
--
-- `question`/`from_name`/`from_phone`/`from_email`/`is_anonymous`/
-- `category` stay freely editable -- those are the asker's own fields, not
-- moderation-decision fields, and no UI restricts them.
create or replace function public.protect_rabbi_questions_answer_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.has_tenant_role(auth.uid(), new.tenant_id, 'tenant_admin')
    or public.has_tenant_role(auth.uid(), new.tenant_id, 'moderator')
  then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.answer := null;
    new.is_public := false;
    new.status := 'new';
    new.rabbi_user_id := null;
    new.answered_at := null;
    return new;
  end if;

  -- UPDATE: revert the moderation-decision columns to their prior value,
  -- leave everything else (question text, contact fields) freely editable.
  if new.answer is distinct from old.answer then
    new.answer := old.answer;
  end if;
  if new.is_public is distinct from old.is_public then
    new.is_public := old.is_public;
  end if;
  if new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if new.rabbi_user_id is distinct from old.rabbi_user_id then
    new.rabbi_user_id := old.rabbi_user_id;
  end if;
  if new.answered_at is distinct from old.answered_at then
    new.answered_at := old.answered_at;
  end if;
  return new;
end;
$$;

drop trigger if exists rabbi_questions_protect_answer_fields on public.rabbi_questions;
create trigger rabbi_questions_protect_answer_fields
  before insert or update on public.rabbi_questions
  for each row execute function public.protect_rabbi_questions_answer_fields();
