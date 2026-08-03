
-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  family_status text DEFAULT '',
  children_count integer DEFAULT 0,
  children_ages integer[] DEFAULT '{}',
  children_names text[] DEFAULT '{}',
  children_health_needs text[] DEFAULT '{}',
  monthly_income numeric DEFAULT 0,
  business_dividends numeric DEFAULT 0,
  passive_income numeric DEFAULT 0,
  recurring_support numeric DEFAULT 0,
  yearly_bonus numeric DEFAULT 0,
  one_time_income numeric DEFAULT 0,
  living_standard text DEFAULT 'בינוני',
  health_fund text DEFAULT '',
  special_health_needs text DEFAULT '',
  residential_status text DEFAULT 'renter',
  mortgage_monthly numeric DEFAULT 0,
  rent_amount numeric DEFAULT 0,
  car_type text DEFAULT '',
  car_year integer DEFAULT 0,
  real_estate_assets text DEFAULT '',
  loans jsonb DEFAULT '[]',
  credit_card_debt numeric DEFAULT 0,
  family_financial_help boolean DEFAULT false,
  family_help_amount numeric DEFAULT 0,
  sector text DEFAULT '',
  city text DEFAULT '',
  daily_expenses numeric DEFAULT 0,
  weekly_expenses numeric DEFAULT 0,
  monthly_fixed_expenses numeric DEFAULT 0,
  yearly_fixed_expenses numeric DEFAULT 0,
  profile_complete boolean DEFAULT false,
  tier text DEFAULT 'standard',
  business_enabled boolean DEFAULT false,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  description text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_recurring boolean DEFAULT false,
  is_installment boolean DEFAULT false,
  installment_details jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  category text DEFAULT 'general',
  completion_note text,
  completed_at timestamptz,
  auto_generated boolean DEFAULT false,
  auto_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.tasks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Task history table
CREATE TABLE public.task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  task_description text DEFAULT '',
  task_category text DEFAULT 'general',
  completion_note text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  auto_generated boolean DEFAULT false,
  auto_id text
);

ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task history" ON public.task_history
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  items jsonb DEFAULT '[]',
  total numeric DEFAULT 0,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invoices" ON public.invoices
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  rating integer DEFAULT 5,
  total_paid numeric DEFAULT 0,
  next_payment_date date,
  next_payment_amount numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own suppliers" ON public.suppliers
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Budget limits table
CREATE TABLE public.budget_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  UNIQUE(user_id, category)
);

ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget limits" ON public.budget_limits
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin: user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Admin: dynamic questions table
CREATE TABLE public.dynamic_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options text[] DEFAULT '{}',
  target_segment text DEFAULT 'all',
  condition_alerts jsonb DEFAULT '[]',
  required boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dynamic_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read questions" ON public.dynamic_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON public.dynamic_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin: academy content table
CREATE TABLE public.academy_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'tip',
  category text DEFAULT '',
  content text DEFAULT '',
  duration text DEFAULT '',
  icon text DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.academy_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read academy" ON public.academy_content
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage academy" ON public.academy_content
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin: condition rules table
CREATE TABLE public.condition_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field text NOT NULL,
  operator text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  value_to numeric,
  alert_title text NOT NULL,
  alert_message text NOT NULL,
  target_segment text DEFAULT 'all',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.condition_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read rules" ON public.condition_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rules" ON public.condition_rules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin policy: allow admins to view all profiles (read-only)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
