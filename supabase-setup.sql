-- ════════════════════════════════════════════════════════════════
-- SUPABASE SETUP FOR ANTIGRAVITY PLAY
-- Run these SQL statements in your Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- ─── 1. CREATE VIDEOS TABLE ───────────────────────────────────
-- DROP TABLE IF EXISTS videos;
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  video_source TEXT DEFAULT '',
  external_url TEXT DEFAULT '',
  embed_code TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  reactions BIGINT DEFAULT 0,
  duration TEXT DEFAULT '',
  creator TEXT DEFAULT 'Administrator',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting by created_at (used by homepage queries)
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC);


-- ════════════════════════════════════════════════════════════════
-- MIGRATION NOTES (if you already created the table with old columns):
-- ════════════════════════════════════════════════════════════════
-- If you already ran the old setup (with video_url, embed_url, platform),
-- run these ALTER statements instead of the CREATE above:
--
--   ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_source TEXT DEFAULT '';
--   ALTER TABLE videos ADD COLUMN IF NOT EXISTS external_url TEXT DEFAULT '';
--   ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_code TEXT DEFAULT '';
--   ALTER TABLE videos ADD COLUMN IF NOT EXISTS reactions BIGINT DEFAULT 0;
--   ALTER TABLE videos DROP COLUMN IF EXISTS video_url;
--   ALTER TABLE videos DROP COLUMN IF EXISTS embed_url;
--   ALTER TABLE videos DROP COLUMN IF EXISTS platform;
--
-- Then migrate existing data:
--   UPDATE videos SET video_source = platform WHERE video_source = '' AND platform != '';
--   UPDATE videos SET external_url = video_url WHERE external_url = '' AND video_url != '';
--   UPDATE videos SET embed_code = embed_url WHERE embed_code = '' AND embed_url != '';


-- ─── 2. CREATE SITE SETTINGS TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can upsert settings" ON site_settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update settings" ON site_settings
  FOR UPDATE TO anon, authenticated USING (true);

-- ─── 4. CREATE STORAGE BUCKETS ───────────────────────────────
-- In Supabase Dashboard: Storage → New Bucket
--   Name: "videos"      → Public bucket
--   Name: "thumbnails"   → Public bucket

-- ─── 5. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT from videos table
CREATE POLICY "Anyone can read videos" ON videos
  FOR SELECT USING (true);

-- Anyone can INSERT (both anon and authenticated)
CREATE POLICY "Anyone can insert videos" ON videos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Anyone can UPDATE (for engagement counters: views, likes, reactions)
CREATE POLICY "Anyone can update videos" ON videos
  FOR UPDATE TO anon, authenticated USING (true);

-- Anyone can DELETE (matches INSERT/UPDATE policies above)
CREATE POLICY "Anyone can delete videos" ON videos
  FOR DELETE TO anon, authenticated USING (true);

-- ─── 6. STORAGE RLS POLICIES ──

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


-- ════════════════════════════════════════════════════════════════
-- 7. FEEDBACK / BUG REPORTS / FEATURE REQUESTS TABLES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT DEFAULT '',
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary TEXT NOT NULL,
  page TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT DEFAULT '',
  browser TEXT DEFAULT '',
  os TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  why TEXT DEFAULT '',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can insert bug_reports" ON bug_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can insert feature_requests" ON feature_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read feedback" ON feedback
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read bug_reports" ON bug_reports
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read feature_requests" ON feature_requests
  FOR SELECT USING (true);
