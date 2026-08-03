
-- Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template text DEFAULT 'custom',
  total_budget numeric NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own projects" ON public.projects FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Project categories
CREATE TABLE public.project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_group text DEFAULT '',
  budget numeric NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  sort_order int DEFAULT 0
);

ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project categories" ON public.project_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_categories.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_categories.project_id AND projects.user_id = auth.uid()));

-- Project tasks
CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  notes text DEFAULT '',
  show_in_calendar boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project tasks" ON public.project_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tasks.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_tasks.project_id AND projects.user_id = auth.uid()));

-- Project transactions
CREATE TABLE public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.project_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own project transactions" ON public.project_transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_transactions.project_id AND projects.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_transactions.project_id AND projects.user_id = auth.uid()));

-- Add enabled_modules to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '["dashboard","expenses","profile"]'::jsonb;
