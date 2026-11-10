-- ==============================================================================
-- Activity Tracking & Study Summary Tables (AGENTS.md Compliance)
-- 1. Explicit GRANT permissions to anon and authenticated roles
-- 2. Row Level Security (RLS) enabled with appropriate policies
-- 3. Detailed activity log table with timestamps
-- 4. Cumulative progress summary table for user dashboard
-- ==============================================================================

-- 1. Detailed user activities log with timestamps
CREATE TABLE IF NOT EXISTS public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sentence_id integer NOT NULL,
  activity_type text NOT NULL, -- 'listen', 'shadowing', 'self_check', 'complete'
  listen_count integer DEFAULT 0,
  shadowing_count integer DEFAULT 0,
  speed_check smallint,
  stress_check smallint,
  intonation_check smallint,
  status text DEFAULT 'practiced',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Aggregate user progress summary table
CREATE TABLE IF NOT EXISTS public.user_progress_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_listen_count integer DEFAULT 0,
  total_shadowing_count integer DEFAULT 0,
  completed_sentences integer DEFAULT 0,
  total_sentences integer DEFAULT 13,
  progress_percent integer DEFAULT 0,
  last_studied_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Explicit Role GRANT permissions (Required by AGENTS.md)
GRANT ALL ON TABLE public.user_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_activities TO anon, authenticated;

GRANT ALL ON TABLE public.user_progress_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_progress_summary TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Enable Row Level Security (RLS) (Required by AGENTS.md)
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_summary ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_activities
DROP POLICY IF EXISTS "Users can manage their own activities" ON public.user_activities;
CREATE POLICY "Users can manage their own activities"
  ON public.user_activities
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anon read user_activities" ON public.user_activities;
CREATE POLICY "Allow anon read user_activities"
  ON public.user_activities
  FOR SELECT
  TO anon
  USING (true);

-- 6. RLS Policies for user_progress_summary
DROP POLICY IF EXISTS "Users can manage their own summary" ON public.user_progress_summary;
CREATE POLICY "Users can manage their own summary"
  ON public.user_progress_summary
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow anon read user_progress_summary" ON public.user_progress_summary;
CREATE POLICY "Allow anon read user_progress_summary"
  ON public.user_progress_summary
  FOR SELECT
  TO anon
  USING (true);
