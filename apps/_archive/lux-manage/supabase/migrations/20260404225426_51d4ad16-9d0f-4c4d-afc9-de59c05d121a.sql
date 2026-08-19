ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'credit_card',
  ADD COLUMN IF NOT EXISTS installments integer DEFAULT 1;