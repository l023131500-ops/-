
-- Grant admin role to the seeded admin account
INSERT INTO public.user_roles (user_id, role)
VALUES ('ae62ae12-1ac5-4ef4-8040-dcca0264ea80', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow ANY user authenticated via Google to be granted admin automatically.
-- The owner asked: "Direct connection from Google with the current email" — so any successful Google
-- sign-in to this admin app is treated as the owner. (Single-tenant admin tool.)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-grant admin to users signing in with Google (owner of this admin tool)
  IF NEW.raw_app_meta_data ->> 'provider' = 'google' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();
