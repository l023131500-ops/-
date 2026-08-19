-- Migration 007: Nedarim Plus credentials hardening
-- 1. Convert nedarim_configs.api_valid from boolean to text (real Nedarim ApiValid is a string token)
-- 2. Add api_password column for ApiPassword (secret used for refunds/history via Reports/Online endpoint)
-- 3. Add helpful column comments

-- Step 1: api_valid boolean -> text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nedarim_configs'
      AND column_name = 'api_valid'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.nedarim_configs
      ALTER COLUMN api_valid DROP DEFAULT;
    ALTER TABLE public.nedarim_configs
      ALTER COLUMN api_valid TYPE text USING (CASE WHEN api_valid THEN 'true' ELSE NULL END);
  END IF;
END $$;

-- Step 2: api_password column (nullable; stored encrypted-at-rest via Supabase managed encryption)
ALTER TABLE public.nedarim_configs
  ADD COLUMN IF NOT EXISTS api_password text;

-- Step 3: comments
COMMENT ON COLUMN public.nedarim_configs.mosad_id IS
  'Nedarim Plus Mosad identifier (public). Sent as Mosad in iframe PostMessage and as MosadId in Reports/Online API.';
COMMENT ON COLUMN public.nedarim_configs.api_valid IS
  'Nedarim Plus ApiValid token (public, iframe activation key). Sent as ApiValid in iframe PostMessage.';
COMMENT ON COLUMN public.nedarim_configs.api_password IS
  'Nedarim Plus ApiPassword (SECRET). Used for refunds, cancellations and history via Reports/Online endpoint. Never expose to client.';
COMMENT ON COLUMN public.nedarim_configs.webhook_secret IS
  'Optional shared secret for additional webhook verification (Nedarim itself authenticates by source IP 18.194.219.73).';
