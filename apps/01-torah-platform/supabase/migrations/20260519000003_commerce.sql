-- ============================================================================
-- Torah Platform · Migration 003 · Commerce – Donations + Shop + Nedarim Plus
-- ============================================================================
-- מודול תשלומים מלא: תרומות חד-פעמיות, מנויים, חנות תשמישי קדושה, הקדשות.
-- אינטגרציה אמיתית מול Nedarim Plus (https://www.matara.pro/nedarimplus/).
-- ============================================================================

-- ============================================================================
-- PRODUCT CATEGORIES (חנות תשמישי קדושה)
-- ============================================================================
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  image_url text,
  parent_id uuid references public.product_categories(id) on delete set null,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists idx_pc_tenant on public.product_categories(tenant_id);

-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  slug text not null,
  name text not null,
  description text,
  short_description text,
  images jsonb default '[]'::jsonb,                  -- array of image URLs
  price_ils numeric(10,2) not null default 0,
  compare_at_price_ils numeric(10,2),
  cost_ils numeric(10,2),
  stock int,                                         -- null = unlimited
  is_digital boolean default false,
  digital_file_url text,                             -- אם זה דיגיטלי (PDF / קובץ שמע)
  sku text,
  weight_grams int,
  attributes jsonb default '{}'::jsonb,              -- מידה, צבע, סוג עור
  meta jsonb default '{}'::jsonb,
  is_active boolean default true,
  is_featured boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists idx_products_tenant on public.products(tenant_id);
create index if not exists idx_products_category on public.products(category_id);

-- ============================================================================
-- ORDERS + ORDER ITEMS
-- ============================================================================
do $$ begin
  create type order_status as enum (
    'pending','awaiting_payment','paid','processing','shipped','delivered','cancelled','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'pending','authorized','captured','failed','refunded','cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_number text unique not null default ('TP-' || to_char(now(), 'YYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  user_id uuid references auth.users(id) on delete set null,

  -- Customer (גם לא-משתמשים יכולים להזמין)
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  shipping_address text,
  shipping_city text,
  shipping_zip text,
  shipping_notes text,

  status order_status not null default 'pending',
  payment_status payment_status not null default 'pending',

  -- Totals (ILS)
  subtotal_ils numeric(10,2) not null default 0,
  shipping_ils numeric(10,2) not null default 0,
  discount_ils numeric(10,2) not null default 0,
  total_ils numeric(10,2) not null default 0,

  payment_method text default 'nedarim',             -- 'nedarim','manual','transfer','none'
  payment_reference text,                            -- TransactionId של נדרים פלוס
  payment_meta jsonb default '{}'::jsonb,
  shipping_tracking text,

  notes text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz
);
create index if not exists idx_orders_tenant on public.orders(tenant_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_sku text,
  quantity int not null default 1,
  unit_price_ils numeric(10,2) not null,
  total_ils numeric(10,2) not null,
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_oi_order on public.order_items(order_id);

-- ============================================================================
-- DONATIONS (תרומות + הקדשות)
-- ============================================================================
create table if not exists public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  hero_image_url text,
  goal_ils numeric(12,2),
  raised_ils numeric(12,2) default 0,
  is_active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists idx_campaigns_tenant on public.donation_campaigns(tenant_id);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid references public.donation_campaigns(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  donor_name text not null,
  donor_email text,
  donor_phone text not null,
  donor_city text,
  donor_address text,
  is_anonymous boolean default false,

  amount_ils numeric(10,2) not null,
  payment_method text default 'nedarim',
  payment_status payment_status not null default 'pending',
  payment_reference text,                            -- Nedarim TransactionId
  payment_meta jsonb default '{}'::jsonb,

  -- הקדשות
  dedication_type text,                              -- 'le_zecher','le_refuah','le_iluy','le_hatzlacha','other'
  dedication_for_name text,                          -- "פלוני בן פלונית"
  dedication_father_name text,
  dedication_message text,

  -- מנויים
  is_recurring boolean default false,
  recurring_months int,                              -- כמה חודשים סך הכל (null = ללא הגבלה)
  recurring_charge_day int,                          -- יום בחודש
  parent_donation_id uuid references public.donations(id) on delete set null,

  -- קבלה
  receipt_number text,
  receipt_url text,
  receipt_issued_at timestamptz,

  notes text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_donations_tenant on public.donations(tenant_id);
create index if not exists idx_donations_campaign on public.donations(campaign_id);
create index if not exists idx_donations_user on public.donations(user_id);
create index if not exists idx_donations_status on public.donations(payment_status);

-- ============================================================================
-- NEDARIM PLUS — Configuration per tenant + transaction log
-- ============================================================================
create table if not exists public.nedarim_configs (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  mosad_id text not null,                            -- ה-Mosad ID של הטננט בנדרים פלוס
  api_valid boolean default false,
  default_campaign_id uuid references public.donation_campaigns(id) on delete set null,
  charge_message text default 'תרומה לעמותה',
  success_redirect_url text,
  failure_redirect_url text,
  webhook_secret text,                               -- לאימות IPN
  meta jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.nedarim_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  transaction_id text,                               -- מנדרים פלוס
  confirmation_code text,
  status text,                                       -- 'success','failed','pending'
  amount_ils numeric(10,2),
  raw_request jsonb,
  raw_response jsonb,
  webhook_payload jsonb,
  donation_id uuid references public.donations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_neda_tenant on public.nedarim_transactions(tenant_id);
create index if not exists idx_neda_txn on public.nedarim_transactions(transaction_id);

-- ============================================================================
-- CART (sessions cart for shop)
-- ============================================================================
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,                                   -- למשתמשים אנונימיים
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_carts_user on public.carts(user_id);
create index if not exists idx_carts_session on public.carts(session_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.donation_campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.nedarim_configs enable row level security;
alter table public.nedarim_transactions enable row level security;
alter table public.carts enable row level security;

-- Public read for active products/categories/campaigns
drop policy if exists "pc_read" on public.product_categories;
create policy "pc_read" on public.product_categories for select using (is_active = true or public.user_in_tenant(tenant_id));

drop policy if exists "pc_write" on public.product_categories;
create policy "pc_write" on public.product_categories
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using (is_active = true or public.user_in_tenant(tenant_id));

drop policy if exists "products_write" on public.products;
create policy "products_write" on public.products
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

drop policy if exists "campaigns_read" on public.donation_campaigns;
create policy "campaigns_read" on public.donation_campaigns for select using (is_active = true or public.user_in_tenant(tenant_id));

drop policy if exists "campaigns_write" on public.donation_campaigns;
create policy "campaigns_write" on public.donation_campaigns
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

-- Orders: customer can read own, tenant_admin sees all in tenant
drop policy if exists "orders_self_read" on public.orders;
create policy "orders_self_read" on public.orders for select using (
  user_id = auth.uid()
  or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
  or public.is_super_admin(auth.uid())
);

drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert with check (true);   -- אורחים יכולים להזמין

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

drop policy if exists "oi_read" on public.order_items;
create policy "oi_read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_tenant_role(auth.uid(), o.tenant_id, 'tenant_admin')))
);

drop policy if exists "oi_insert" on public.order_items;
create policy "oi_insert" on public.order_items for insert with check (true);

-- Donations
drop policy if exists "donations_self_read" on public.donations;
create policy "donations_self_read" on public.donations for select using (
  user_id = auth.uid()
  or public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin')
  or public.is_super_admin(auth.uid())
);

drop policy if exists "donations_insert" on public.donations;
create policy "donations_insert" on public.donations for insert with check (true);

drop policy if exists "donations_admin_update" on public.donations;
create policy "donations_admin_update" on public.donations
  for update using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

-- Nedarim configs/transactions – admin only
drop policy if exists "neda_cfg" on public.nedarim_configs;
create policy "neda_cfg" on public.nedarim_configs
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'))
  with check (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin'));

drop policy if exists "neda_txn" on public.nedarim_transactions;
create policy "neda_txn" on public.nedarim_transactions
  for all using (public.has_tenant_role(auth.uid(), tenant_id, 'tenant_admin') or public.is_super_admin(auth.uid()));

-- Carts – self / session only
drop policy if exists "carts_self" on public.carts;
create policy "carts_self" on public.carts for all using (
  (user_id is not null and user_id = auth.uid())
  or session_id is not null
) with check (
  (user_id is not null and user_id = auth.uid())
  or session_id is not null
);

-- updated_at triggers
drop trigger if exists trg_products_upd on public.products;
create trigger trg_products_upd before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_upd on public.orders;
create trigger trg_orders_upd before update on public.orders for each row execute function public.set_updated_at();

drop trigger if exists trg_neda_cfg_upd on public.nedarim_configs;
create trigger trg_neda_cfg_upd before update on public.nedarim_configs for each row execute function public.set_updated_at();
