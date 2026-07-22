-- ════════════════════════════════════════════════════════════════
-- SUPABASE SETUP FOR ANTIGRAVITY PLAY
-- Run these SQL statements in your Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- ─── 1. CREATE VIDEOS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  embed_url TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  duration TEXT DEFAULT '',
  creator TEXT DEFAULT 'Administrator',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting by created_at (used by homepage queries)
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC);



-- ─── 2. CREATE STORAGE BUCKETS ───────────────────────────────
-- In Supabase Dashboard: Storage → New Bucket
--   Name: "videos"      → Public bucket
--   Name: "thumbnails"   → Public bucket

-- ─── 3. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT from videos table
CREATE POLICY "Anyone can read videos" ON videos
  FOR SELECT USING (true);

-- Only authenticated users can INSERT
CREATE POLICY "Auth can insert videos" ON videos
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only authenticated users can UPDATE
CREATE POLICY "Auth can update videos" ON videos
  FOR UPDATE TO authenticated USING (true);

-- Only authenticated users can DELETE
CREATE POLICY "Auth can delete videos" ON videos
  FOR DELETE TO authenticated USING (true);

-- ─── 4. STORAGE RLS POLICIES ──

-- Public read on videos bucket
CREATE POLICY "Public read videos bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'videos');

-- Auth can upload/delete in videos bucket
CREATE POLICY "Auth upload videos bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Auth delete videos bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'videos');

-- Public read on thumbnails bucket
CREATE POLICY "Public read thumbnails bucket" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'thumbnails');

-- Auth can upload/delete in thumbnails bucket
CREATE POLICY "Auth upload thumbnails bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Auth delete thumbnails bucket" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'thumbnails');
