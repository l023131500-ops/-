-- Torah Platform · material_categories (spec §5.3 "ניהול קטגוריות חומרי עזר")
-- ============================================================================
-- MATERIAL_CATEGORIES (src/types/questionnaire.ts) has always been a hardcoded
-- TS constant with zero admin UI to manage it, even though architecture.md
-- §5.3 lists "ניהול קטגוריות חומרי עזר" as its own distinct Super Admin
-- capability (separate from "מודרציית תוכן" / admin/Content.tsx, which only
-- approves/rejects already-uploaded materials, never manages the category
-- taxonomy itself). Same shape as lesson_topics (migration 002): a real
-- table, RLS public-read/super-admin-write, seeded so existing category
-- names in portal/Materials.tsx + admin/Content.tsx keep working unchanged.
--
-- public.materials.category/subcategory are free-text columns (not FKs) --
-- this table's `name` is the exact string stored there, so seeding with the
-- current MATERIAL_CATEGORIES keys/values is a zero-behavior-change baseline.
-- ============================================================================

create table if not exists public.material_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.material_categories(id) on delete cascade,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A top-level category name must be unique; a subcategory name must be
-- unique within its parent (e.g. "אחר" legitimately repeats under every
-- top-level category) -- a plain UNIQUE(parent_id, name) would not catch
-- duplicate top-level names since Postgres treats NULL as distinct.
create unique index if not exists material_categories_top_name_uniq
  on public.material_categories (name) where parent_id is null;
create unique index if not exists material_categories_sub_name_uniq
  on public.material_categories (parent_id, name) where parent_id is not null;

alter table public.material_categories enable row level security;

drop policy if exists "material_categories_read" on public.material_categories;
create policy "material_categories_read" on public.material_categories
  for select using (true);

drop policy if exists "material_categories_write" on public.material_categories;
create policy "material_categories_write" on public.material_categories
  for all using (public.is_super_admin((select auth.uid())))
  with check (public.is_super_admin((select auth.uid())));

-- Seed: exact current MATERIAL_CATEGORIES content (src/types/questionnaire.ts),
-- so switching the UI to read from this table is additive/invisible on day 1.
do $$
declare
  v_parent uuid;
  v_cat record;
  v_sub text;
  v_sort int;
  v_cats jsonb := '[
    {"name":"גמרא","subs":["דף יומי","מסכת ברכות","מסכת שבת","מסכת בבא קמא","מסכת בבא מציעא","מסכת קידושין","אחר"]},
    {"name":"הלכה","subs":["הלכות שבת","הלכות תפילה","הלכות ברכות","הלכות כשרות","חושן משפט","אבן העזר","יורה דעה","אורח חיים","אחר"]},
    {"name":"פרשת שבוע","subs":["בראשית","שמות","ויקרא","במדבר","דברים","מועדים","אחר"]},
    {"name":"מוסר","subs":["מסילת ישרים","שערי תשובה","אורחות צדיקים","מכתב מאליהו","אחר"]},
    {"name":"חסידות","subs":["תניא","ליקוטי מוהר\"ן","נועם אלימלך","שפת אמת","אחר"]},
    {"name":"מחשבה והשקפה","subs":["יסודות האמונה","כוזרי","מורה נבוכים","אחר"]},
    {"name":"תנ\"ך","subs":["נביאים","כתובים","פרקי אבות","אחר"]},
    {"name":"אחר","subs":["כללי","פרסום שיעור","מודעות","אחר"]}
  ]'::jsonb;
begin
  if not exists (select 1 from public.material_categories) then
    for v_cat in select value, ordinality - 1 as idx from jsonb_array_elements(v_cats) with ordinality loop
      insert into public.material_categories (name, parent_id, sort_order)
      values (v_cat.value->>'name', null, v_cat.idx)
      returning id into v_parent;

      v_sort := 0;
      for v_sub in select jsonb_array_elements_text(v_cat.value->'subs') loop
        insert into public.material_categories (name, parent_id, sort_order)
        values (v_sub, v_parent, v_sort)
        on conflict do nothing;
        v_sort := v_sort + 1;
      end loop;
    end loop;
  end if;
end $$;
