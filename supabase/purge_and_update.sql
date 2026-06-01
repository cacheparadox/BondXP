-- ============================================================
-- BondXP — Database Purge, Reset & Self-Deletion Policy
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the RLS policy to allow users to delete their own profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'users_delete_own'
  ) THEN
    CREATE POLICY "users_delete_own" ON users
      FOR DELETE USING (auth.uid() = id);
  END IF;
END
$$;

-- 2. Make sure the notes table and bucket exist (in case not already run)
CREATE TABLE IF NOT EXISTS notes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_session_id  UUID REFERENCES couple_sessions(id) ON DELETE CASCADE,
  sender_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  content            TEXT NOT NULL,
  image_url          TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notes if not enabled
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Note Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'notes_select_couple') THEN
    CREATE POLICY "notes_select_couple" ON notes FOR SELECT USING (couple_session_id = get_my_couple_session_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'notes_insert_couple') THEN
    CREATE POLICY "notes_insert_couple" ON notes FOR INSERT WITH CHECK (couple_session_id = get_my_couple_session_id() AND auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'notes_delete_couple') THEN
    CREATE POLICY "notes_delete_couple" ON notes FOR DELETE USING (couple_session_id = get_my_couple_session_id());
  END IF;
END
$$;

-- Ensure storage bucket and policies exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-images', 'notes-images', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'notes_images_select') THEN
    CREATE POLICY "notes_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'notes-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'notes_images_insert') THEN
    CREATE POLICY "notes_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes-images' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'notes_images_delete') THEN
    CREATE POLICY "notes_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'notes-images' AND auth.role() = 'authenticated');
  END IF;
END
$$;

-- Ensure tasks table has value column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS value INT DEFAULT 1;

-- 3. PURGE & RESET ALL USER DATA TO DEFAULT TEMPLATE STATE
-- WARNING: This is destructive. It deletes all users, sessions, streaks, tasks, and history.
TRUNCATE auth.users CASCADE;
TRUNCATE couple_sessions CASCADE;

-- Clear all couple-specific custom rewards, but keep the template rewards (which have couple_session_id = NULL)
DELETE FROM rewards WHERE couple_session_id IS NOT NULL;

-- Note: Accidental direct deletion from storage.objects is blocked by Supabase triggers.
-- To completely wipe uploaded images files, empty the 'notes-images' bucket inside your Supabase Storage dashboard.
