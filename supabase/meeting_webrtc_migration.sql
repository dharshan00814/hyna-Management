-- ====================================================================
-- HYNA STUDIO: MEETINGS & WEBRTC REALTIME SQL MIGRATION
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. SAFE ENUM TYPES CREATION
DO $$ BEGIN
  CREATE TYPE meeting_type AS ENUM ('team', 'standup', 'review', 'planning', 'one-on-one');
EXCEPTION 
  WHEN duplicate_object THEN null; 
END $$;

DO $$ BEGIN
  CREATE TYPE meeting_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
EXCEPTION 
  WHEN duplicate_object THEN null; 
END $$;

-- 2. CREATE MEETINGS TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY DEFAULT ('mt_' || encode(gen_random_bytes(6), 'hex')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT NOT NULL DEFAULT '10:00',
  end_time TEXT NOT NULL DEFAULT '11:00',
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_ids TEXT[] DEFAULT '{}',
  type meeting_type DEFAULT 'team',
  is_recurring BOOLEAN DEFAULT false,
  meeting_link TEXT DEFAULT '',
  status meeting_status DEFAULT 'scheduled',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENSURE ALL COLUMNS EXIST (If table was previously created with older schema)
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS participant_ids TEXT[] DEFAULT '{}';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT DEFAULT '';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS status meeting_status DEFAULT 'scheduled';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. CREATE INDEXES FOR FAST LOOKUPS
CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON public.meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_meeting_link ON public.meetings(meeting_link);

-- 5. TRIGGER FOR AUTO-UPDATING updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON public.meetings;
CREATE TRIGGER trg_meetings_updated_at 
  BEFORE UPDATE ON public.meetings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR MEETINGS

-- A. SELECT: All authenticated members can view meetings 
-- (Ensures anyone with the room link or invited can join without permission errors)
DROP POLICY IF EXISTS "meetings_select" ON public.meetings;
DROP POLICY IF EXISTS "meetings_select_all_authenticated" ON public.meetings;

CREATE POLICY "meetings_select_all_authenticated" 
  ON public.meetings 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- B. INSERT: Any authenticated user can create a meeting
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;

CREATE POLICY "meetings_insert" 
  ON public.meetings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() IS NOT NULL);

-- C. UPDATE: Host, invited participants, or managers/executives can update meeting details
DROP POLICY IF EXISTS "meetings_update" ON public.meetings;

CREATE POLICY "meetings_update" 
  ON public.meetings 
  FOR UPDATE 
  TO authenticated 
  USING (
    host_id = auth.uid() 
    OR auth.uid()::text = ANY(participant_ids)
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND (role IN ('admin', 'manager') OR UPPER(designation) IN ('CEO', 'COO', 'CTO', 'ADMIN', 'MANAGER'))
    )
  );

-- D. DELETE: Host or Executive can delete meetings
DROP POLICY IF EXISTS "meetings_delete" ON public.meetings;

CREATE POLICY "meetings_delete" 
  ON public.meetings 
  FOR DELETE 
  TO authenticated 
  USING (
    host_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND (role = 'admin' OR UPPER(designation) IN ('CEO', 'COO', 'CTO', 'ADMIN'))
    )
  );

-- 8. ENABLE REALTIME SYNC FOR MEETINGS TABLE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  END IF;
END $$;

-- 9. VERIFICATION
SELECT 
  'meetings' AS table_name,
  COUNT(*) AS total_meetings_count 
FROM public.meetings;
