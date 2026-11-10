-- ==============================================================================
-- Supabase Schema: Users Table & Automatic Auth Sync
-- Follows AGENTS.md guidelines:
-- 1. Explicit GRANT permissions to anon and authenticated roles
-- 2. Row Level Security (RLS) enabled with appropriate policies
-- 3. Automatic Trigger on auth.users for seamless sync
-- 4. Immediate backfill for existing auth users
-- ==============================================================================

-- 1. Create public.users table linked to auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  provider text DEFAULT 'google',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Explicit GRANT permissions for PostgREST API (Required by AGENTS.md)
GRANT ALL ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Enable Row Level Security (RLS) (Required by AGENTS.md)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow public read access to user profiles
DROP POLICY IF EXISTS "Allow public read access for user profiles" ON public.users;
CREATE POLICY "Allow public read access for user profiles"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to manage their own record
DROP POLICY IF EXISTS "Allow users to insert or update their own record" ON public.users;
CREATE POLICY "Allow users to insert or update their own record"
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Database Trigger: Automatically copy/update profile when user logs in via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, provider, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'google'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    provider = EXCLUDED.provider,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Immediate backfill: Sync any existing users from auth.users to public.users
INSERT INTO public.users (id, email, full_name, avatar_url, provider, updated_at)
SELECT
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ),
  COALESCE(
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data->>'picture'
  ),
  COALESCE(raw_app_meta_data->>'provider', 'google'),
  now()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  provider = EXCLUDED.provider,
  updated_at = now();
