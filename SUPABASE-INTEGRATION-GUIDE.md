# 🚀 Complete Step-by-Step Guide: Integrating Supabase into **Antigravity Play**

> **Project**: [Antigravity Play](c:/Users/amans/Videos/pcids/index.html) — A video sharing platform  
> **Current Storage**: `localStorage` (all data is client-side only)  
> **Goal**: Migrate to **Supabase** (PostgreSQL database + Authentication + Realtime + Storage)  
> **When you upload a video from Admin → users see it on the Homepage instantly**

---

## 📋 Table of Contents

1. [Part 1: Understanding Our Current Architecture](#part-1-understanding-our-current-architecture)
2. [Part 2: Supabase Project Setup](#part-2-supabase-project-setup)
3. [Part 3: Database Schema Design](#part-3-database-schema-design)
4. [Part 4: Install & Configure Supabase Client](#part-4-install--configure-supabase-client)
5. [Part 5: Authentication System (Login/Logout)](#part-5-authentication-system-loginlogout)
6. [Part 6: CRUD Operations - Videos](#part-6-crud-operations---videos)
7. [Part 7: Modify `main.js` - App API Migration Layer](#part-7-modify-mainjs---app-api-migration-layer)
8. [Part 8: Hook Up Admin Upload (admin/upload.js → Supabase)](#part-8-hook-up-admin-upload-adminuploadjs--supabase)
9. [Part 9: Hook Up Admin Dashboard (admin/dashboard.js → Supabase)](#part-9-hook-up-admin-dashboard-admindashboardjs--supabase)
10. [Part 10: Hook Up Admin Videos Management (admin/videos.js → Supabase)](#part-10-hook-up-admin-videos-management-adminvideosjs--supabase)
11. [Part 11: Hook Up Admin Tags Management (admin/tags.js → Supabase)](#part-11-hook-up-admin-tags-management-admintagsjs--supabase)
12. [Part 12: Hook Up Homepage (home.js → Users See Videos)](#part-12-hook-up-homepage-homejs--users-see-videos)
13. [Part 13: Hook Up Watch Page (watch.js → View Video)](#part-13-hook-up-watch-page-watchjs--view-video)
14. [Part 14: Supabase Storage for Thumbnails](#part-14-supabase-storage-for-thumbnails)
15. [Part 15: Row Level Security (RLS) Policies](#part-15-row-level-security-rls-policies)
16. [Part 16: Real-time Subscriptions (Live Updates)](#part-16-real-time-subscriptions-live-updates)
17. [Part 17: Testing the Full Flow](#part-17-testing-the-full-flow)
18. [Part 18: Field Mapping Reference](#part-18-field-mapping-reference)
19. [Part 19: Common Issues & Troubleshooting](#part-19-common-issues--troubleshooting)

---

## Part 1: Understanding Our Current Architecture

### 🔍 Current Data Flow (all in browser localStorage)

```
┌──────────────────────────────────────────────────────────────────┐
│                   BROWSER localStorage (client-side only)         │
│                                                                   │
│  🔑 db-videos       →  Array of videos (from MOCK_VIDEOS)        │
│  🏷️  db-tags         →  Array of tags (from MOCK_TAGS)           │
│  ❤️  liked-videos    →  Array of liked video IDs                  │
│  🔐 admin-session   →  Session token "session-active-{timestamp}" │
│  👤 admin-name      →  "Alex Mercer"                              │
│  👥 mock-users      →  [{email:"admin@videoshare.com", ...}]      │
│  📌 up-next-video-id →  Pinned video ID for Up Next               │
│  📋 video-upload-history →  Recent uploads history                │
│  🌙 site-theme      →  "dark" or "light"                          │
│  ▶️  continue-{id}   →  Resume playback position (seconds)         │
│  😂 emoji-reactions-{id} →  Emoji counts per video                │
└──────────────────────────────────────────────────────────────────┘
```

### 🔧 Our Project's 10 Key JavaScript Files to Modify

| File | Purpose | What to Change |
|------|---------|----------------|
| `c:/Users/amans/Videos/pcids/js/main.js` | Core `window.App` API — `getVideos()`, `saveVideos()`, `getTags()`, `saveTags()`, `isVideoLiked()`, `toggleLikeVideo()` | Replace localStorage with Supabase queries |
| `c:/Users/amans/Videos/pcids/js/login.js` | Authentication — validates against `MOCK_USERS` + `localStorage` | Replace with Supabase Auth (`signInWithPassword`) |
| `c:/Users/amans/Videos/pcids/js/home.js` | Homepage — calls `window.App.getVideos()`, renders `setupHeroBanner()`, trending, new releases | Load published videos from Supabase |
| `c:/Users/amans/Videos/pcids/js/watch.js` | Watch page — `setupVideoPlayer()`, `setupVideoDetails()`, `setupRelatedSidebar()`, view/like tracking | Fetch video from Supabase, increment views via RPC |
| `c:/Users/amans/Videos/pcids/js/admin/upload.js` | Upload form — `setupFormSubmission()` saves to `db-videos` in localStorage | Save to Supabase `videos` table instead |
| `c:/Users/amans/Videos/pcids/js/admin/dashboard.js` | Dashboard — `computeStats()`, `renderRecentUploadsTable()`, `drawViewsChart()` | Compute stats from Supabase aggregate queries |
| `c:/Users/amans/Videos/pcids/js/admin/videos.js` | Video management — `renderCards()` with `state.videos`, inline edit/delete | CRUD via Supabase `videos` + `video_tags` tables |
| `c:/Users/amans/Videos/pcids/js/admin/tags.js` | Tag management — `renderTags()`, `mergeTags()`, inline add/rename/delete | CRUD via Supabase `tags` table |
| `c:/Users/amans/Videos/pcids/js/components.js` | UI injectors — `injectNavbar()`, `injectAdminSidebar()` with logout | Logout uses `localStorage.removeItem('admin-session')` — needs Supabase signOut |
| `c:/Users/amans/Videos/pcids/js/mockData.js` | Seed data — `MOCK_VIDEOS` (21 videos), `MOCK_TAGS` (16 tags), `MOCK_USERS` | Use as initial SQL seed for Supabase tables |

### ⚡ Our Data Flow After Supabase Migration

```
┌──────────┐     ┌──────────────────────────────────────┐     ┌──────────┐
│  Admin   │────▶│         SUPABSE (PostgreSQL)         │────▶│  Users   │
│ Uploads  │     │                                      │     │ See on   │
│ Video    │     │  videos table                         │     │ Homepage │
│          │     │  tags table                           │     │          │
│          │     │  video_tags (junction)                │     │          │
│          │     │  likes table                          │     │          │
│          │     │  profiles (auth users)                │     │          │
│          │     │  view_logs (daily analytics)          │     │          │
└──────────┘     └──────────────────────────────────────┘     └──────────┘
```

---

## Part 2: Supabase Project Setup

### Step 2.1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub or email
4. Verify your email address

### Step 2.2: Create a New Project

1. Click **"New project"**
2. Fill in:
   - **Name**: `antigravity-play` (or your project name)
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose the closest to your users (e.g., `Singapore` for Asia, `US East` for USA)
   - **Pricing Plan**: Free tier (500 MB database, 1 GB bandwidth, 50,000 monthly active users)
3. Click **"Create new project"**
4. Wait ~2 minutes for the database to provision

### Step 2.3: Get Your API Credentials

After the project is ready:

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these two values:
   - **`Project URL`** (e.g., `https://abc123.supabase.co`)
   - **`anon public key`** (e.g., `eyJhbGciOiJIUzI1NiIs...`)

> ⚠️ **Security Note**: The `anon` key is safe for frontend use. The `service_role` key must NEVER be exposed publicly.

### Step 2.4: Create Our Config File

Create **`c:/Users/amans/Videos/pcids/js/supabase-config.js`**:

```javascript
// ============================================================
// Supabase Configuration for Antigravity Play
// File: c:/Users/amans/Videos/pcids/js/supabase-config.js
// IMPORTANT: Replace these with YOUR Supabase project credentials
// ============================================================
window.SUPABASE_CONFIG = {
  // Your Supabase Project URL (from Project Settings → API)
  PROJECT_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  
  // Your Supabase anon/public key (from Project Settings → API)
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR_ANON_KEY_HERE...',
  
  // Supabase Storage bucket name for video thumbnails
  STORAGE_BUCKET: 'thumbnails'
};
```

---

## Part 3: Database Schema Design

### Step 3.1: Open SQL Editor

In your Supabase Dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste the SQL below and click **"Run"**

### Step 3.2: Create All Tables

Run this SQL — it's designed to match our exact mock data structure:

```sql
-- ============================================================
-- SUPABASE DATABASE SCHEMA FOR ANTIGRAVITY PLAY
-- Matches our exact localStorage structure from mockData.js
-- ============================================================

-- 1️⃣ PROFILES TABLE (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'administrator')),
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ TAGS TABLE (mirrors MOCK_TAGS from mockData.js)
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,  -- Using same string IDs as MOCK_TAGS (e.g., 'programming', 'review')
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#0070f3',
  usage_count INTEGER DEFAULT 0,
  created_date DATE DEFAULT CURRENT_DATE
);

-- 3️⃣ VIDEOS TABLE (mirrors MOCK_VIDEOS from mockData.js)
CREATE TABLE IF NOT EXISTS public.videos (
  id TEXT PRIMARY KEY,  -- Using same string IDs as MOCK_VIDEOS (e.g., 'vid-01', 'vid-02')
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  embed_url TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  platform TEXT DEFAULT '',
  platform_label TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  duration TEXT DEFAULT '0:00',
  publish_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft')),
  creator TEXT DEFAULT 'Administrator',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ VIDEO-TAGS JUNCTION TABLE (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS public.video_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(video_id, tag_id)
);

-- 5️⃣ LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 6️⃣ COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7️⃣ NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8️⃣ VIEW LOGS TABLE (for daily analytics chart)
CREATE TABLE IF NOT EXISTS public.view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewed_at DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,
  UNIQUE(video_id, viewed_at)
);

-- ============================================================
-- INDEXES (matches our sort/filter patterns)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_publish_date ON public.videos(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views ON public.videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON public.video_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON public.video_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_video_id ON public.view_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewed_at ON public.view_logs(viewed_at);
```

### Step 3.3: Seed Our Exact Mock Data

Run this SQL to seed the database with our project's exact mock data from `mockData.js`:

```sql
-- ============================================================
-- SEED ALL 16 TAGS (from MOCK_TAGS in mockData.js)
-- ============================================================
INSERT INTO public.tags (id, name, color, usage_count, created_date) VALUES
  ('programming', 'Programming', '#0070f3', 3, '2026-06-01'),
  ('review', 'Review', '#7928ca', 4, '2026-06-02'),
  ('live', 'Live', '#ff0080', 3, '2026-06-03'),
  ('highlight', 'Highlight', '#ffa42b', 3, '2026-06-04'),
  ('tutorial', 'Tutorial', '#50e3c2', 6, '2026-06-05'),
  ('vlogging', 'Vlogging', '#539df5', 2, '2026-06-06'),
  ('gameplay', 'Gameplay', '#1db954', 2, '2026-06-07'),
  ('indie', 'Indie', '#f3727f', 2, '2026-06-08'),
  ('pop', 'Pop', '#e91e63', 2, '2026-06-09'),
  ('rock', 'Rock', '#ff5722', 2, '2026-06-10'),
  ('design', 'Design', '#9c27b0', 2, '2026-06-11'),
  ('setup', 'Setup', '#00bcd4', 2, '2026-06-12'),
  ('food', 'Food', '#ff9800', 2, '2026-06-13'),
  ('workout', 'Workout', '#4caf50', 2, '2026-06-14'),
  ('speedrun', 'Speedrun', '#f44336', 1, '2026-06-15'),
  ('unboxing', 'Unboxing', '#3f51b5', 2, '2026-06-16')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED ALL 21 VIDEOS (from MOCK_VIDEOS in mockData.js)
-- ============================================================
INSERT INTO public.videos (id, title, description, video_url, thumbnail, views, likes, duration, publish_date, status, creator) VALUES
  ('vid-01', 'Building a Modern Design System from Scratch', 'Learn the principles of building scalable design tokens, clean CSS architectures, and flexible components that work across teams and frameworks.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&auto=format&fit=crop', 14205, 842, '10:14', '2026-07-01', 'published', 'DesignOps Weekly'),
  ('vid-02', 'Midnight Chill Lo-Fi - Acoustic Session', 'Relax and unwind with this live recorded acoustic lo-fi session, featuring gentle guitar riffs, analog synth pads, and warm ambient beats.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop', 45892, 3204, '14:53', '2026-07-05', 'published', 'Lofi Labs'),
  ('vid-03', 'Hollow Knight Speedrun - World Record Attempt', 'Pushing the limits of Hollow Knight movement tech in an attempt to beat the current Any% speedrun record. Analyzed live.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop', 18204, 981, '15:02', '2026-07-10', 'published', 'SpeedyBug'),
  ('vid-04', 'React vs. Vue vs. Svelte: The 2026 Verdict', 'An honest, un-hyped evaluation of the top frontend frameworks, evaluating load times, rendering budgets, and developer experience in 2026.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop', 29402, 1675, '12:45', '2026-07-12', 'published', 'WebDev Frontier'),
  ('vid-05', 'Ultimate Tokyo Travel Guide - Hidden Alleyways', 'Venturing off the tourist trail into Tokyo''s historic districts. Exploring tiny Izakayas, vintage vinyl bars, and quiet temples.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=500&auto=format&fit=crop', 84920, 5912, '18:22', '2026-07-14', 'published', 'Roam & Capture'),
  ('vid-06', 'Making the Perfect Neapolitan Pizza at Home', 'Mastering the dough formula, fermentation schedules, tomato selection, and cooking in a domestic high-heat portable pizza oven.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop', 32049, 2180, '8:30', '2026-07-15', 'published', 'Kitchen Science'),
  ('vid-07', '20-Minute Full Body HIIT - No Equipment', 'Follow-along bodyweight high-intensity interval training designed to build endurance and strength. Modifications included.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop', 61204, 4012, '20:00', '2026-07-16', 'published', 'Pulse Cardio'),
  ('vid-08', 'Standup Comedy - The Office Coffee Maker', 'A standup comedy bit about office kitchen politics, the complexity of modern espresso makers, and early morning small talk.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop', 95204, 8420, '5:12', '2026-07-17', 'published', 'Giggle Factory'),
  ('vid-09', 'How Quantum Computers Actually Work', 'Breaking down qubits, superposition, entanglement, and quantum gates in plain English without the mathematical overload.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500&auto=format&fit=crop', 158902, 12890, '22:15', '2026-07-18', 'published', 'Deep Dive Science'),
  ('vid-10', 'Retro Desk Setup Makeover - Minimalist Edition', 'Overhauling a messy workspace with a custom wood top, monitor arms, warm backlighting, and physical audio control knobs.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop', 72403, 5012, '9:45', '2026-07-19', 'published', 'Desk Design Studio'),
  ('vid-11', 'Slay the Spire - A Perfect Silent Run', 'Navigating the Spire with a poison-oriented Silent build. Every decision explained, from card picks to boss relics.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop', 8420, 320, '48:10', '2026-07-19', 'published', 'SlayMaster'),
  ('vid-12', 'Behind the Scenes of a Sci-Fi Short Film', 'A walkthrough of CGI rendering pipelines, camera rigging, and color grading steps for our recent short film project.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop', 12048, 745, '14:22', '2026-07-20', 'published', 'VFX Lab'),
  ('vid-13', 'Acoustic Fingerstyle Tutorial - Autumn Leaves', 'Step-by-step guitar tutorial teaching bass-line integration, melody overlay, and minor chord voicings for fingerstyle players.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500&auto=format&fit=crop', 15402, 984, '11:05', '2026-07-20', 'published', 'Guitar Hub'),
  ('vid-14', 'Unboxing the Ultimate Mechanical Keyboard', 'Testing a custom gasket-mounted hot-swap keyboard. Reviewing linear switches, aluminum casing sound test, and keycap designs.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&auto=format&fit=crop', 22340, 1102, '7:18', '2026-07-20', 'published', 'Switch Enthusiast'),
  ('vid-15', 'Iceland Road Trip Vlog - 7 Days on the Ring Road', 'Glaciers, black sand beaches, epic waterfalls, and sleeping in a 4x4 camper van under the midnight sun.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&auto=format&fit=crop', 53049, 3204, '24:50', '2026-07-20', 'published', 'Roam & Capture'),
  ('vid-16', 'Crispy Skin Salmon - Pro Chef Technique', 'A quick visual guide on moisture extraction, pan temperature regulation, and scoring skin to achieve restaurant-grade salmon.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop', 19804, 1403, '6:15', '2026-07-20', 'published', 'Kitchen Science'),
  ('vid-17', 'Gym Motivation - Breaking Plateaus', 'A compilation of progressive overload insights, mindset changes, and lifting techniques to break through strength stalls.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop', 38402, 2840, '4:40', '2026-07-20', 'published', 'Pulse Cardio'),
  ('vid-18', 'Programming a Game Engine from Scratch in C', 'Deep coding session implementing a basic software rasterizer, math utilities, and win32 window event loops in raw C.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500&auto=format&fit=crop', 41209, 3049, '1:15:30', '2026-07-20', 'published', 'LowLevelDev'),
  ('vid-19', '[DRAFT] Secret Tech Unboxing Video', 'A review of a prototype wearable console that hasn''t been officially announced. Shh!', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop', 0, 0, '8:25', '2026-07-20', 'draft', 'Desk Design Studio'),
  ('vid-20', '[DRAFT] New Indie Game First Impressions', 'Checking out the demo for a new pixel art metroidvania that mixes time travel mechanics with fluid sword combat.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop', 0, 0, '14:15', '2026-07-20', 'draft', 'SlayMaster'),
  ('vid-21', 'Acoustic Blues Improvisation in E', 'Live improvisation session focusing on E major blues riffs, sliding double stops, and hybrid picking techniques.', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', 'https://images.unsplash.com/photo-1525201548942-d8c8cd361db0?w=500&auto=format&fit=crop', 3405, 210, '5:45', '2026-07-20', 'published', 'Guitar Hub')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED VIDEO-TAGS JUNCTION (matching tags arrays in MOCK_VIDEOS)
-- ============================================================
INSERT INTO public.video_tags (video_id, tag_id) VALUES
  ('vid-01', 'programming'), ('vid-01', 'design'), ('vid-01', 'tutorial'),
  ('vid-02', 'live'), ('vid-02', 'pop'), ('vid-02', 'rock'),
  ('vid-03', 'gameplay'), ('vid-03', 'highlight'), ('vid-03', 'speedrun'),
  ('vid-04', 'programming'), ('vid-04', 'review'),
  ('vid-05', 'vlogging'), ('vid-05', 'review'),
  ('vid-06', 'food'), ('vid-06', 'tutorial'),
  ('vid-07', 'workout'), ('vid-07', 'tutorial'),
  ('vid-08', 'live'), ('vid-08', 'highlight'),
  ('vid-09', 'tutorial'), ('vid-09', 'review'),
  ('vid-10', 'setup'), ('vid-10', 'design'), ('vid-10', 'unboxing'),
  ('vid-11', 'gameplay'), ('vid-11', 'indie'),
  ('vid-12', 'design'), ('vid-12', 'tutorial'),
  ('vid-13', 'tutorial'), ('vid-13', 'rock'),
  ('vid-14', 'unboxing'), ('vid-14', 'setup'), ('vid-14', 'review'),
  ('vid-15', 'vlogging'), ('vid-15', 'highlight'),
  ('vid-16', 'food'), ('vid-16', 'tutorial'),
  ('vid-17', 'workout'), ('vid-17', 'highlight'),
  ('vid-18', 'programming'), ('vid-18', 'tutorial'),
  ('vid-19', 'unboxing'), ('vid-19', 'review'),
  ('vid-20', 'gameplay'), ('vid-20', 'indie'),
  ('vid-21', 'live'), ('vid-21', 'pop')
ON CONFLICT (video_id, tag_id) DO NOTHING;
```

### Step 3.4: Enable Row Level Security (base state)

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;
```

### Step 3.5: Create Database Functions (RPCs for view/like counting)

```sql
-- ============================================================
-- Database Functions (RPCs) used by our JavaScript
-- ============================================================

-- Used by: window.SupabaseQueries.incrementViewCount() in watch.js
CREATE OR REPLACE FUNCTION increment_views(video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET views = views + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Used by: window.SupabaseQueries.toggleLike()
CREATE OR REPLACE FUNCTION increment_likes(video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET likes = likes + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Used by: window.SupabaseQueries.toggleLike()
CREATE OR REPLACE FUNCTION decrement_likes(video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.videos
  SET likes = GREATEST(0, likes - 1)
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Part 4: Install & Configure Supabase Client

### Step 4.1: Create Supabase Initialization File

Create **`c:/Users/amans/Videos/pcids/js/supabase-init.js`**:

```javascript
// ============================================================
// Supabase Client Initialization for Antigravity Play
// File: c:/Users/amans/Videos/pcids/js/supabase-init.js
// Creates global window.supabase instance
// ============================================================
(function() {
  if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.PROJECT_URL) {
    console.error('❌ Supabase config not found. Create js/supabase-config.js first.');
    return;
  }

  try {
    window.supabase = supabase.createClient(
      window.SUPABASE_CONFIG.PROJECT_URL,
      window.SUPABASE_CONFIG.ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: { eventsPerSecond: 10 }
        }
      }
    );
    
    console.log('✅ Supabase client initialized for Antigravity Play');
    
    // Listen for auth state changes
    window.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('🔐 User signed in:', session?.user?.email);
        syncUserProfile(session.user);
        // Maintain backward compat with our admin-session check in main.js
        localStorage.setItem('admin-session', session?.access_token || 'active');
        if (session?.user?.user_metadata?.name) {
          localStorage.setItem('admin-name', session.user.user_metadata.name);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out');
        localStorage.removeItem('admin-session');
        localStorage.removeItem('admin-name');
      }
    });

  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
  }

  async function syncUserProfile(user) {
    if (!user) return;
    try {
      const { data: existing, error: fetchError } = await window.supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking profile:', fetchError);
        return;
      }

      if (!existing) {
        const { error: insertError } = await window.supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: user.email === 'admin@videoshare.com' ? 'administrator' : 'user'
          }]);

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('✅ Profile created for:', user.email);
        }
      }
    } catch (error) {
      console.error('Error syncing profile:', error);
    }
  }
})();
```

### Step 4.2: Add Scripts to ALL Our HTML Pages

For **public pages** (index.html, watch.html, search.html, tag.html, etc.) — add INSIDE `<head>` before `</head>`:

```html
<!-- Supabase: Client library + Config + Init -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./js/supabase-config.js"></script>
<script src="./js/supabase-init.js"></script>
```

For **admin pages** (admin/index.html, admin/upload.html, admin/videos.html, admin/tags.html, etc.):

```html
<!-- Supabase: Client library + Config + Init -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-init.js"></script>
```

### Step 4.3: Pages That Need Supabase Scripts

Here is every HTML file in our project that needs the Supabase scripts added:

| Page | File Path | Script Path Prefix |
|------|-----------|-------------------|
| Homepage | `c:/Users/amans/Videos/pcids/index.html` | `./js/` |
| Watch | `c:/Users/amans/Videos/pcids/watch.html` | `./js/` |
| Login | `c:/Users/amans/Videos/pcids/login.html` | `./js/` |
| Search | `c:/Users/amans/Videos/pcids/search.html` | `./js/` |
| Tag | `c:/Users/amans/Videos/pcids/tag.html` | `./js/` |
| About | `c:/Users/amans/Videos/pcids/about.html` | `./js/` |
| Admin Dashboard | `c:/Users/amans/Videos/pcids/admin/index.html` | `../js/` |
| Admin Upload | `c:/Users/amans/Videos/pcids/admin/upload.html` | `../js/` |
| Admin Videos | `c:/Users/amans/Videos/pcids/admin/videos.html` | `../js/` |
| Admin Tags | `c:/Users/amans/Videos/pcids/admin/tags.html` | `../js/` |
| Admin Analytics | `c:/Users/amans/Videos/pcids/admin/analytics.html` | `../js/` |
| Admin Settings | `c:/Users/amans/Videos/pcids/admin/settings.html` | `../js/` |
| Admin Notifications | `c:/Users/amans/Videos/pcids/admin/notifications.html` | `../js/` |

Place the scripts **after** the theme-inline script and CSS links, but **before** other JS files like `mockData.js` and `main.js`. For example in `index.html`:

```html
<head>
  ...
  <!-- ═══ NEW: Supabase Scripts ═══ -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="./js/supabase-config.js"></script>
  <script src="./js/supabase-init.js"></script>
  <!-- ═══ END Supabase Scripts ═══ -->
  ...
</head>
<body>
  ...
  <!-- Our existing script order stays the same -->
  <script src="./js/mockData.js"></script>
  <script src="./js/main.js"></script>
  <script src="./js/components.js"></script>
  <script src="./js/animations.js"></script>
  <script src="./js/home.js"></script>
</body>
```

---

## Part 5: Authentication System (Login/Logout)

### Step 5.1: Modify `js/login.js` — Replace Mock Auth with Supabase Auth

**Current code** (in `c:/Users/amans/Videos/pcids/js/login.js`):

```javascript
// Current login flow:
// 1. Gets users from localStorage 'mock-users' or falls back to window.MOCK_USERS
// 2. Finds user with users.find(u => u.email === email && u.password === password)
// 3. Stores localStorage.setItem('admin-session', 'session-active-' + Date.now())
// 4. Redirects to ./admin/index.html
```

**Change**: Replace the entire file with this:

```javascript
// ============================================================
// LOGIN PAGE - Supabase Authentication for Antigravity Play
// File: c:/Users/amans/Videos/pcids/js/login.js
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectNavbar('login');
  window.Components.injectFooter();

  // Redirect if already logged in via Supabase
  checkExistingSession();

  const loginForm = document.getElementById('login-form');       // ID from login.html
  const emailInput = document.getElementById('email-input');     // ID from login.html
  const passwordInput = document.getElementById('password-input'); // ID from login.html
  const errorMsg = document.getElementById('login-error-msg');   // ID from login.html
  const submitBtn = loginForm?.querySelector('button[type="submit"]'); // "Sign In" button

  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Reset error states
    errorMsg.style.display = 'none';
    errorMsg.innerText = '';
    emailInput.style.borderColor = '';
    passwordInput.style.borderColor = '';

    if (!email || !password) {
      errorMsg.innerText = 'Please enter both email and password.';
      errorMsg.style.display = 'block';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      // ─── SUPABASE AUTH: Sign In ───
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          errorMsg.innerText = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg.innerText = 'Please confirm your email before logging in.';
        } else {
          errorMsg.innerText = error.message;
        }
        errorMsg.style.display = 'block';
        emailInput.style.borderColor = 'var(--error)';
        passwordInput.style.borderColor = 'var(--error)';
        window.App.showToast('Login failed.', 'error');
        return;
      }

      // ─── SUCCESS ───
      const user = data.user;
      const session = data.session;

      // Store for compat with our admin-session route guard in main.js
      localStorage.setItem('admin-session', session.access_token);
      const userName = user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'Administrator';
      localStorage.setItem('admin-name', userName);

      window.App.showToast('Login successful! Redirecting to Dashboard...', 'success');
      setTimeout(() => { window.location.href = './admin/index.html'; }, 1200);

    } catch (err) {
      console.error('Login error:', err);
      errorMsg.innerText = 'An unexpected error occurred. Please try again.';
      errorMsg.style.display = 'block';
      window.App.showToast('Login failed due to an error.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  async function checkExistingSession() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session) {
        window.location.href = './admin/index.html';
      }
    } catch (err) {
      console.log('No existing session');
    }
  }
});
```

### Step 5.2: Modify `js/main.js` — Update Route Guard

**Current code** (find this in `c:/Users/amans/Videos/pcids/js/main.js`):

```javascript
// ─── ROUTE GUARD ───
const path = window.location.pathname.replace(/\\/g, '/');
const isAdminPage = path.includes('/admin/');
const isLoggedIn = localStorage.getItem('admin-session') !== null;

if (isAdminPage && !isLoggedIn) {
  const redirectPath = '../login.html';
  window.location.href = redirectPath;
}
```

**Replace with** (checks Supabase session first, falls back to localStorage):

```javascript
// ─── ROUTE GUARD ───
const path = window.location.pathname.replace(/\\/g, '/');
const isAdminPage = path.includes('/admin/');

async function checkAuth() {
  if (!isAdminPage) return;
  try {
    if (window.supabase) {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem('admin-session');
        window.location.href = '../login.html';
      }
    } else {
      // Fallback to localStorage session
      if (!localStorage.getItem('admin-session')) {
        window.location.href = '../login.html';
      }
    }
  } catch (err) {
    console.error('Auth check error:', err);
    if (!localStorage.getItem('admin-session')) {
      window.location.href = '../login.html';
    }
  }
}
checkAuth();
```

### Step 5.3: Update Logout in `js/components.js`

**Current code** in `injectAdminSidebar()`:

```javascript
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('admin-session');
  localStorage.removeItem('admin-name');
  window.location.href = `${rootPrefix}index.html`;
});
```

**Replace with**:

```javascript
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    if (window.supabase) {
      const { error } = await window.supabase.auth.signOut();
      if (error) console.error('Logout error:', error);
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
  localStorage.removeItem('admin-session');
  localStorage.removeItem('admin-name');
  window.location.href = `${rootPrefix}index.html`;
});
```

### Step 5.4: Disable Email Confirmation (for Development)

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Under **"Confirm email"**, toggle it **OFF**
3. Click **"Save"**

---

## Part 6: CRUD Operations - Videos & Tags

### Step 6.1: Create the Queries File

Create **`c:/Users/amans/Videos/pcids/js/supabase-queries.js`**:

This file provides `window.SupabaseQueries` — a complete query layer that replaces all localStorage operations. It maps our exact field names from `MOCK_VIDEOS` and `MOCK_TAGS` to the Supabase columns.

```javascript
// ============================================================
// Supabase Query Helpers for Antigravity Play
// File: c:/Users/amans/Videos/pcids/js/supabase-queries.js
// Mirrors our localStorage patterns but works with Supabase
// ============================================================

window.SupabaseQueries = {
  // ============================================================
  // VIDEOS
  // ============================================================

  /**
   * Get videos with tags. Used by: home.js, watch.js, dashboard.js, videos.js
   * @param {Object} options - { status, search, sortBy, sortOrder, page, limit }
   * @returns {Promise<{data: Array, count: number}>}
   */
  async getVideos(options = {}) {
    const {
      status = null,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = options;

    try {
      let query = window.supabase
        .from('videos')
        .select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (search) query = query.or(`title.ilike.%${search}%,creator.ilike.%${search}%`);

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // Attach tags to each video (mimics how tags array was embedded in MOCK_VIDEOS)
      const videosWithTags = await Promise.all(
        (data || []).map(async (video) => {
          const tags = await this.getVideoTags(video.id);
          return { ...video, tags: tags || [] };
        })
      );

      return { data: videosWithTags, count: count || 0 };
    } catch (error) {
      console.error('Error fetching videos:', error);
      return { data: [], count: 0 };
    }
  },

  /**
   * Get a single video by ID. Used by: watch.js
   * @param {string} videoId - e.g., 'vid-01'
   * @returns {Promise<Object|null>}
   */
  async getVideoById(videoId) {
    try {
      const { data, error } = await window.supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const tags = await this.getVideoTags(videoId);
      return { ...data, tags: tags || [] };
    } catch (error) {
      console.error('Error fetching video:', error);
      return null;
    }
  },

  /**
   * Create a new video. Used by: admin/upload.js
   * @param {Object} videoData - Includes tags array, creator, etc.
   * @returns {Promise<Object|null>}
   */
  async createVideo(videoData) {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      const { tags, ...videoFields } = videoData;

      const { data, error } = await window.supabase
        .from('videos')
        .insert([{ ...videoFields, creator_id: user?.id || null }])
        .select()
        .single();

      if (error) throw error;

      if (tags && tags.length > 0 && data) {
        await this.setVideoTags(data.id, tags);
      }

      return data;
    } catch (error) {
      console.error('Error creating video:', error);
      return null;
    }
  },

  /**
   * Update a video. Used by: admin/videos.js (inline edit)
   * @param {string} videoId - e.g., 'vid-01'
   * @param {Object} updates - Fields to update (title, status, etc.)
   * @returns {Promise<boolean>}
   */
  async updateVideo(videoId, updates) {
    try {
      const { tags, ...videoFields } = updates;
      const { error } = await window.supabase
        .from('videos')
        .update({ ...videoFields, updated_at: new Date().toISOString() })
        .eq('id', videoId);

      if (error) throw error;

      if (tags) await this.setVideoTags(videoId, tags);
      return true;
    } catch (error) {
      console.error('Error updating video:', error);
      return false;
    }
  },

  /**
   * Delete a video. Used by: admin/videos.js
   * @param {string} videoId - e.g., 'vid-01'
   * @returns {Promise<boolean>}
   */
  async deleteVideo(videoId) {
    try {
      const { error } = await window.supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  },

  /**
   * Increment view count. Used by: watch.js on first play
   * @param {string} videoId - e.g., 'vid-01'
   */
  async incrementViewCount(videoId) {
    try {
      // Try RPC first (created in Step 3.5)
      const { error } = await window.supabase.rpc('increment_views', { video_id: videoId });
      if (error) {
        // Fallback: direct update
        const { data: video } = await window.supabase
          .from('videos')
          .select('views')
          .eq('id', videoId)
          .single();
        if (video) {
          await window.supabase
            .from('videos')
            .update({ views: (video.views || 0) + 1 })
            .eq('id', videoId);
        }
      }

      // Log the view for analytics chart
      const today = new Date().toISOString().split('T')[0];
      await window.supabase
        .from('view_logs')
        .upsert(
          { video_id: videoId, viewed_at: today, count: 1 },
          { onConflict: 'video_id,viewed_at', ignoreDuplicates: false }
        );
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  },

  // ============================================================
  // TAGS
  // ============================================================

  /**
   * Get all tags. Used by: home.js, components.js, dashboard.js, tags.js
   * @returns {Promise<Array>}
   */
  async getTags() {
    try {
      const { data, error } = await window.supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  /**
   * Create a tag. Used by: admin/tags.js, admin/upload.js
   * @param {string} name - Tag name e.g., 'Programming'
   * @param {string} color - Hex color e.g., '#0070f3'
   * @returns {Promise<Object|null>}
   */
  async createTag(name, color = '#0070f3') {
    try {
      const { data, error } = await window.supabase
        .from('tags')
        .insert([{ name, color }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  },

  /**
   * Update a tag. Used by: admin/tags.js (inline rename)
   * @param {string} tagId - e.g., 'programming'
   * @param {Object} updates - { name?, color? }
   */
  async updateTag(tagId, updates) {
    try {
      const { error } = await window.supabase
        .from('tags')
        .update(updates)
        .eq('id', tagId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating tag:', error);
      return false;
    }
  },

  /**
   * Delete a tag. Used by: admin/tags.js
   * @param {string} tagId - e.g., 'programming'
   */
  async deleteTag(tagId) {
    try {
      await window.supabase.from('video_tags').delete().eq('tag_id', tagId);
      const { error } = await window.supabase.from('tags').delete().eq('id', tagId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  },

  /**
   * Get tags for a specific video. Used by: getVideos, getVideoById
   * @param {string} videoId - e.g., 'vid-01'
   * @returns {Promise<Array>}
   */
  async getVideoTags(videoId) {
    try {
      const { data, error } = await window.supabase
        .from('video_tags')
        .select('tag_id, tags(*)')
        .eq('video_id', videoId);
      if (error) throw error;
      return (data || []).map(item => item.tags).filter(Boolean);
    } catch (error) {
      console.error('Error fetching video tags:', error);
      return [];
    }
  },

  /**
   * Set tags for a video (replaces all). Used by: createVideo, updateVideo
   * @param {string} videoId - e.g., 'vid-01'
   * @param {string[]} tagIds - Array of tag IDs e.g., ['programming', 'design']
   */
  async setVideoTags(videoId, tagIds) {
    try {
      await window.supabase.from('video_tags').delete().eq('video_id', videoId);
      if (tagIds && tagIds.length > 0) {
        const junctionRecords = tagIds.map(tagId => ({
          video_id: videoId,
          tag_id: tagId
        }));
        const { error } = await window.supabase.from('video_tags').insert(junctionRecords);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error setting video tags:', error);
    }
  },

  // ============================================================
  // LIKES
  // ============================================================

  /**
   * Check if video is liked. Used by: watch.js, components.js
   * @param {string} videoId - e.g., 'vid-01'
   * @param {string} userId - UUID from auth
   * @returns {Promise<boolean>}
   */
  async isVideoLiked(videoId, userId) {
    try {
      const { data, error } = await window.supabase
        .from('likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking like:', error);
      return false;
    }
  },

  /**
   * Toggle like. Used by: watch.js, home.js (hero banner)
   * @param {string} videoId - e.g., 'vid-01'
   * @returns {Promise<{liked: boolean, likes_count: number}>}
   */
  async toggleLike(videoId) {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isLiked = await this.isVideoLiked(videoId, user.id);

      if (isLiked) {
        await window.supabase.from('likes').delete().eq('video_id', videoId).eq('user_id', user.id);
        await window.supabase.rpc('decrement_likes', { video_id: videoId });
      } else {
        await window.supabase.from('likes').insert([{ video_id: videoId, user_id: user.id }]);
        await window.supabase.rpc('increment_likes', { video_id: videoId });
      }

      const { data: vid } = await window.supabase.from('videos').select('likes').eq('id', videoId).single();
      return { liked: !isLiked, likes_count: vid?.likes || 0 };
    } catch (error) {
      console.error('Error toggling like:', error);
      return { liked: false, likes_count: 0 };
    }
  },

  // ============================================================
  // DASHBOARD STATS
  // ============================================================

  /**
   * Get dashboard stats. Used by: admin/dashboard.js
   * @returns {Promise<Object>}
   */
  async getDashboardStats() {
    try {
      const { count: totalVideos } = await window.supabase
        .from('videos').select('*', { count: 'exact', head: true }).eq('status', 'published');

      const { data: viewsData } = await window.supabase.from('videos').select('views');
      const { data: likesData } = await window.supabase.from('videos').select('likes');

      const { count: totalTags } = await window.supabase
        .from('tags').select('*', { count: 'exact', head: true });

      const viewsTrend = await this.getViewsLast7Days();

      return {
        totalVideos: totalVideos || 0,
        totalViews: (viewsData || []).reduce((s, v) => s + (v.views || 0), 0),
        totalLikes: (likesData || []).reduce((s, v) => s + (v.likes || 0), 0),
        totalTags: totalTags || 0,
        viewsTrend
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { totalVideos: 0, totalViews: 0, totalLikes: 0, totalTags: 0, viewsTrend: [] };
    }
  },

  /**
   * Get daily views for last 7 days. Used by: dashboard.js chart
   * @returns {Promise<Array<{date: string, views: number}>>}
   */
  async getViewsLast7Days() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const { data, error } = await window.supabase
        .from('view_logs')
        .select('viewed_at, count')
        .gte('viewed_at', sevenDaysAgo.toISOString().split('T')[0])
        .order('viewed_at', { ascending: true });

      if (error) throw error;

      const viewsByDate = {};
      (data || []).forEach(log => {
        viewsByDate[log.viewed_at] = (viewsByDate[log.viewed_at] || 0) + (log.count || 1);
      });

      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({ date: dateStr.slice(5), views: viewsByDate[dateStr] || 0 });
      }
      return result;
    } catch (error) {
      console.error('Error getting views trend:', error);
      return [];
    }
  }
};
```

---

## Part 7: Modify `main.js` - App API Migration Layer

### Step 7.1: Update `window.App` Methods in `js/main.js`

In `c:/Users/amans/Videos/pcids/js/main.js`, we need to wrap all localStorage calls with Supabase-aware versions. The methods use Supabase when available, and fall back to localStorage.

**Replace the existing `window.App` object methods** (keeping the utility methods like `getQueryParams`, `showToast`, `showConfirmModal`).

Here are the exact methods to change inside the existing `window.App = { ... }` block:

#### Change `getVideos`

```javascript
// OLD (synchronous localStorage):
getVideos() {
  let raw = localStorage.getItem('db-videos');
  if (!raw) {
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  }
  try {
    let parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    if (Array.isArray(parsed)) return [];
    this.showToast('Video data was corrupted. Default data restored.', 'warning');
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  } catch (e) {
    this.showToast('Video data was corrupted. Default data restored.', 'warning');
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  }
},

// NEW (async with Supabase):
async getVideos(options = {}) {
  if (window.supabase && window.SupabaseQueries) {
    try {
      const result = await window.SupabaseQueries.getVideos(options);
      if (result.data) {
        localStorage.setItem('db-videos', JSON.stringify(result.data));
      }
      return result.data || [];
    } catch (err) {
      console.warn('Supabase failed, falling back to localStorage:', err);
    }
  }
  return this.getVideosLocal();
},
```

#### Change `saveVideos`

```javascript
// OLD:
saveVideos(videosList) {
  localStorage.setItem('db-videos', JSON.stringify(videosList));
  window.dispatchEvent(new CustomEvent('videosupdated'));
},

// NEW:
async saveVideo(videoData) {
  if (window.supabase && window.SupabaseQueries) {
    try {
      if (videoData.id) {
        await window.SupabaseQueries.updateVideo(videoData.id, videoData);
      } else {
        const result = await window.SupabaseQueries.createVideo(videoData);
        if (result) videoData.id = result.id;
      }
      return true;
    } catch (err) {
      console.warn('Supabase save failed, falling back:', err);
    }
  }
  // Fallback: update in localStorage
  const videos = this.getVideosLocal();
  const idx = videoData.id ? videos.findIndex(v => v.id === videoData.id) : -1;
  if (idx !== -1) {
    videos[idx] = { ...videos[idx], ...videoData };
  } else {
    videoData.id = videoData.id || 'vid-' + Date.now();
    videos.push(videoData);
  }
  localStorage.setItem('db-videos', JSON.stringify(videos));
  window.dispatchEvent(new CustomEvent('videosupdated'));
  return true;
},

saveVideosLocal(videosList) {
  localStorage.setItem('db-videos', JSON.stringify(videosList));
  window.dispatchEvent(new CustomEvent('videosupdated'));
  return true;
},

getVideosLocal() {
  let raw = localStorage.getItem('db-videos');
  if (!raw) {
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  }
  try {
    let parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  } catch (e) {
    const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
    localStorage.setItem('db-videos', JSON.stringify(mockCopy));
    return mockCopy;
  }
},
```

#### Change `getTags` and `saveTags`

```javascript
// OLD getTags:
getTags() {
  let raw = localStorage.getItem('db-tags');
  if (!raw) {
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  }
  try {
    let parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  } catch (e) {
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  }
},

// NEW async getTags:
async getTags() {
  if (window.supabase && window.SupabaseQueries) {
    try {
      const tags = await window.SupabaseQueries.getTags();
      localStorage.setItem('db-tags', JSON.stringify(tags));
      return tags;
    } catch (err) {
      console.warn('Supabase getTags failed, falling back:', err);
    }
  }
  return this.getTagsLocal();
},

getTagsLocal() {
  let raw = localStorage.getItem('db-tags');
  if (!raw) {
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  }
  try {
    let parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  } catch (e) {
    localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
    return window.MOCK_TAGS;
  }
},

// NEW saveTags (kept for backward compat):
saveTags(tagsList) {
  localStorage.setItem('db-tags', JSON.stringify(tagsList));
},
```

#### Change `isVideoLiked` and `toggleLikeVideo`

```javascript
// OLD:
isVideoLiked(videoId) {
  const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
  return likedVideos.includes(videoId);
},

toggleLikeVideo(videoId) {
  let likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
  let isLikedNow = false;
  if (likedVideos.includes(videoId)) {
    likedVideos = likedVideos.filter(id => id !== videoId);
  } else {
    likedVideos.push(videoId);
    isLikedNow = true;
  }
  localStorage.setItem('liked-videos', JSON.stringify(likedVideos));
  return isLikedNow;
},

// NEW:
async isVideoLiked(videoId) {
  if (window.supabase && window.SupabaseQueries) {
    try {
      const { data: { user } } = await window.supabase.auth.getUser();
      if (user) return await window.SupabaseQueries.isVideoLiked(videoId, user.id);
    } catch (err) {
      console.warn('Supabase isVideoLiked failed:', err);
    }
  }
  const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
  return likedVideos.includes(videoId);
},

async toggleLikeVideo(videoId) {
  if (window.supabase && window.SupabaseQueries) {
    try {
      const result = await window.SupabaseQueries.toggleLike(videoId);
      return result.liked;
    } catch (err) {
      console.warn('Supabase toggleLike failed:', err);
    }
  }
  let likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
  let isLikedNow = false;
  if (likedVideos.includes(videoId)) {
    likedVideos = likedVideos.filter(id => id !== videoId);
  } else {
    likedVideos.push(videoId);
    isLikedNow = true;
  }
  localStorage.setItem('liked-videos', JSON.stringify(likedVideos));
  return isLikedNow;
},
```

---

## Part 8: Hook Up Admin Upload (`admin/upload.js` → Supabase)

### Step 8.1: Add Supabase Scripts to `admin/upload.html`

Add these **INSIDE** `<head>` (before `</head>`):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-init.js"></script>
```

Add this **BEFORE** the other scripts in the body:

```html
<script src="../js/supabase-queries.js"></script>
```

### Step 8.2: Modify `setupFormSubmission` in `js/admin/upload.js`

**Current code** (around lines 420-450 in upload.js):

```javascript
// -------- Save the new video to the data store --------
dbVideos.push(newVideoObj);
window.App.saveVideos(dbVideos);

window.App.showToast('Video published successfully!', 'success');

// -------- Redirect to the videos page after a 1-second delay --------
setTimeout(() => {
  window.location.href = './videos.html';
}, 1000);
```

**Replace with**:

```javascript
// -------- Save the new video to Supabase (or localStorage fallback) --------
const videoToSave = {
  title: newVideoObj.title,
  description: newVideoObj.description,
  video_url: newVideoObj.videoUrl,
  embed_url: newVideoObj.embedUrl,
  thumbnail: newVideoObj.thumbnail,
  platform: newVideoObj.platform,
  platform_label: newVideoObj.platformLabel,
  views: 0,
  likes: 0,
  tags: [...selectedTags],  // array of tag IDs (e.g., ['programming', 'design'])
  duration: newVideoObj.duration,
  publish_date: newVideoObj.publishDate,
  status: newVideoObj.status,
  creator: newVideoObj.creator
};

// Use our new App.saveVideo method (tries Supabase first, falls back to localStorage)
const success = await window.App.saveVideo(videoToSave);

if (success) {
  window.App.showToast('Video published successfully!', 'success');
  
  // Save to recent history (still uses localStorage for this)
  saveToHistory(currentPlatform, currentVideoId, currentEmbedUrl);
  
  setTimeout(() => { window.location.href = './videos.html'; }, 1000);
} else {
  window.App.showToast('Failed to publish video. Please try again.', 'error');
  submitBtn.disabled = false;
}
```

**Also make the form submit handler async** — find this line and add `async`:

```javascript
// OLD:
form.addEventListener('submit', (e) => {
// NEW:
form.addEventListener('submit', async (e) => {
```

### Step 8.3: Update Thumbnail Upload to Use Supabase Storage

In `setupThumbnailUpload` function, add Supabase storage upload:

**Find this code**:

```javascript
thumbInput.addEventListener('change', () => {
  if (thumbInput.files.length > 0) {
    const file = thumbInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      thumbPreview.src = e.target.result;
      thumbPreview.style.display = 'block';
      thumbPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
});
```

**Replace with**:

```javascript
thumbInput.addEventListener('change', async () => {
  if (thumbInput.files.length > 0) {
    const file = thumbInput.files[0];
    
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = function(e) {
      thumbPreview.src = e.target.result;
      thumbPreview.style.display = 'block';
      thumbPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage (if configured)
    if (window.supabase && window.SUPABASE_CONFIG) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `thumb-${Date.now()}.${fileExt}`;
        
        const { error } = await window.supabase.storage
          .from(window.SUPABASE_CONFIG.STORAGE_BUCKET)
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = window.supabase.storage
          .from(window.SUPABASE_CONFIG.STORAGE_BUCKET)
          .getPublicUrl(fileName);

        window._uploadedThumbnailUrl = publicUrl;
        console.log('✅ Thumbnail uploaded:', publicUrl);
      } catch (err) {
        console.error('❌ Thumbnail upload failed:', err);
        window.App.showToast('Using local thumbnail (cloud upload failed)', 'warning');
      }
    }
  }
});
```

Then in the form submission, update to use the uploaded URL:

```javascript
// Find this line:
const thumbnailSrc = thumbnailImg.style.display === 'block' ? thumbnailImg.src : ...;

// Replace with:
const thumbnailSrc = window._uploadedThumbnailUrl || 
  (thumbnailImg.style.display === 'block' ? thumbnailImg.src : 
  (currentThumbnailUrl || (plat && plat.getThumbnailUrl ? plat.getThumbnailUrl(currentVideoId) : null) || placeholderThumb));
```

---

## Part 9: Hook Up Admin Dashboard (`admin/dashboard.js` → Supabase)

### Step 9.1: Add Supabase Scripts to `admin/index.html`

Add to `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-init.js"></script>
```

Add before other scripts:

```html
<script src="../js/supabase-queries.js"></script>
```

### Step 9.2: Rewrite the Main Dashboard Logic

In `c:/Users/amans/Videos/pcids/js/admin/dashboard.js`, replace the `DOMContentLoaded` handler and all functions.

**Find this at the top of dashboard.js**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('dashboard');
  const videos = window.App.getVideos();
  const tags = window.App.getTags();
  computeStats(videos, tags);
  renderRecentUploadsTable(videos, tags);
  renderUpNextSelector(videos, tags);
  drawViewsChart();
  // ...
```

**Replace with**:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  window.Components.injectAdminSidebar('dashboard');
  
  await loadDashboardData();

  window.addEventListener('themechanged', () => {
    invalidateChartCache();
    if (window._dashboardViewsTrend) drawViewsChart(window._dashboardViewsTrend);
  });
  window.addEventListener('videosupdated', () => {
    invalidateChartCache();
    loadDashboardData();
  });
});

async function loadDashboardData() {
  try {
    if (window.supabase && window.SupabaseQueries) {
      const stats = await window.SupabaseQueries.getDashboardStats();
      
      // Update stat cards (IDs from admin/index.html)
      document.getElementById('stat-total-videos').innerText = stats.totalVideos;
      document.getElementById('stat-total-views').innerText = stats.totalViews.toLocaleString();
      document.getElementById('stat-total-likes').innerText = stats.totalLikes.toLocaleString();
      document.getElementById('stat-total-tags').innerText = stats.totalTags;

      // Get recent uploads (published, latest 5)
      const { data: recentVideos } = await window.SupabaseQueries.getVideos({
        status: 'published', sortBy: 'created_at', sortOrder: 'desc', page: 1, limit: 5
      });
      
      const tagsList = await window.SupabaseQueries.getTags();
      renderRecentUploadsGridSupabase(recentVideos || [], tagsList);

      // Draw chart
      window._dashboardViewsTrend = stats.viewsTrend;
      drawViewsChart(stats.viewsTrend);

      // Up Next selector
      renderUpNextSelectorSupabase(recentVideos || []);
    } else {
      fallbackToLocalDashboard();
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
    fallbackToLocalDashboard();
  }
}

function renderRecentUploadsGridSupabase(videos, tags) {
  const grid = document.getElementById('recent-uploads-grid');
  if (!grid) return;
  if (videos.length === 0) {
    grid.innerHTML = '<div class="uploads-empty">No recent uploads found.</div>';
    return;
  }
  grid.innerHTML = videos.map((vid, idx) => {
    const tagHtml = (vid.tags || []).slice(0, 3).map(tag =>
      `<span class="upload-tag" style="background-color:${tag.color}18; color:${tag.color};">${tag.name}</span>`
    ).join('');
    const badgeClass = vid.status === 'published' ? 'badge-success' : 'badge-warning';
    return `
      <div class="upload-card" style="animation-delay:${idx * 0.06}s">
        <div class="upload-card-thumb">
          <img src="${vid.thumbnail || ''}" alt="${vid.title || ''}" loading="lazy">
          <div class="upload-card-overlay">
            <span class="upload-card-views">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${Number(vid.views || 0).toLocaleString()}
            </span>
            <span class="badge ${badgeClass}">${vid.status || 'draft'}</span>
          </div>
        </div>
        <div class="upload-card-body">
          <h3 class="upload-card-title">${vid.title || 'Untitled'}</h3>
          <div class="upload-card-tags">${tagHtml}</div>
        </div>
      </div>`;
  }).join('');
}

function renderUpNextSelectorSupabase(videos) {
  const container = document.getElementById('upnext-selector');
  if (!container) return;
  const savedId = localStorage.getItem('up-next-video-id');
  const selectedVideo = savedId ? videos.find(v => v.id === savedId) : null;
  container.innerHTML = `
    <div class="upnext-card">
      <div class="upnext-card-body">
        <div class="upnext-current">
          <span class="upnext-label">Currently pinned:</span>
          ${selectedVideo ? `<div class="upnext-selected-video"><img src="${selectedVideo.thumbnail || ''}" alt="" class="upnext-thumb"><div class="upnext-info"><span class="upnext-title">${selectedVideo.title}</span><span class="upnext-creator">${selectedVideo.creator}</span></div></div>` : '<span class="upnext-none">None selected</span>'}
        </div>
        <div class="upnext-form">
          <select id="upnext-select" class="upnext-select">
            <option value="">— Auto (no pin) —</option>
            ${videos.map(v => `<option value="${v.id}" ${v.id === savedId ? 'selected' : ''}>${v.title} (${v.creator})</option>`).join('')}
          </select>
          <button id="upnext-save-btn" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>`;
  document.getElementById('upnext-save-btn').addEventListener('click', () => {
    const val = document.getElementById('upnext-select').value;
    if (val) { localStorage.setItem('up-next-video-id', val); window.App.showToast('Up Next pinned!'); }
    else { localStorage.removeItem('up-next-video-id'); window.App.showToast('Pin removed.'); }
  });
}

function fallbackToLocalDashboard() {
  const videos = window.App.getVideosLocal();
  const tags = window.App.getTagsLocal();
  const published = videos.filter(v => v.status === 'published');
  document.getElementById('stat-total-videos').innerText = published.length;
  document.getElementById('stat-total-views').innerText = published.reduce((a, v) => a + Number(v.views), 0).toLocaleString();
  document.getElementById('stat-total-likes').innerText = published.reduce((a, v) => a + Number(v.likes), 0).toLocaleString();
  document.getElementById('stat-total-tags').innerText = tags.length;
  renderRecentUploadsGridSupabase(published.slice(0, 5), tags);
}
```

---

## Part 10: Hook Up Admin Videos Management (`admin/videos.js` → Supabase)

### Step 10.1: Add Scripts to `admin/videos.html`

Add to `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-init.js"></script>
```

Add before other scripts:

```html
<script src="../js/supabase-queries.js"></script>
```

### Step 10.2: Modify `renderCards` and Related Functions

**Find this in `js/admin/videos.js`**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('videos');
  const state = {
    videos: window.App.getVideos(),  // sync call
    // ...
  };
```

**Replace with async version**:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  window.Components.injectAdminSidebar('videos');
  
  const state = {
    videos: [],
    allVideos: [],
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 15,
    sortBy: 'publishDate',
    sortOrder: 'desc',
    selectedIds: []
  };

  await loadVideosFromSupabase(state);
  renderCards(state);
  setupSortDropdown(state);
  setupTableSearch(state);
  setupBulkSelection(state);
  setupBulkActions(state);

  async function loadVideosFromSupabase(state) {
    try {
      if (window.supabase && window.SupabaseQueries) {
        const result = await window.SupabaseQueries.getVideos({ limit: 1000 });
        state.allVideos = (result.data || []).map(v => ({
          id: v.id,
          title: v.title,
          description: v.description,
          videoUrl: v.video_url,
          embedUrl: v.embed_url,
          thumbnail: v.thumbnail,
          platform: v.platform,
          platformLabel: v.platform_label,
          views: v.views,
          likes: v.likes,
          tags: (v.tags || []).map(t => t.id),
          duration: v.duration,
          publishDate: v.publish_date,
          status: v.status,
          creator: v.creator
        }));
      } else {
        state.allVideos = window.App.getVideosLocal();
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      state.allVideos = window.App.getVideosLocal();
    }
    state.videos = [...state.allVideos];
  }
});
```

### Step 10.3: Update Inline Save Operations

In `bindCardActions`, for **title edit** — find:

```javascript
window.App.saveVideos(state.videos);
```

Replace with:

```javascript
window.App.saveVideosLocal(state.videos);  // Keep localStorage sync
if (window.supabase && window.SupabaseQueries) {
  await window.SupabaseQueries.updateVideo(videoId, { title: nextVal });
}
```

For **status edit** — find:

```javascript
window.App.saveVideos(state.videos);
```

Replace with:

```javascript
window.App.saveVideosLocal(state.videos);
if (window.supabase && window.SupabaseQueries) {
  await window.SupabaseQueries.updateVideo(videoId, { status: nextVal });
}
```

For **delete button** — find:

```javascript
state.videos = state.videos.filter(v => v.id !== videoId);
window.App.saveVideos(state.videos);
```

Replace with:

```javascript
state.videos = state.videos.filter(v => v.id !== videoId);
state.selectedIds = state.selectedIds.filter(id => id !== videoId);
window.App.saveVideosLocal(state.videos);
if (window.supabase && window.SupabaseQueries) {
  await window.SupabaseQueries.deleteVideo(videoId);
}
window.App.showToast('Video deleted successfully.');
renderCards(state);
```

For **bulk delete** — find:

```javascript
state.videos = state.videos.filter(v => !state.selectedIds.includes(v.id));
window.App.saveVideos(state.videos);
```

Replace with:

```javascript
const idsToDelete = [...state.selectedIds];
state.videos = state.videos.filter(v => !idsToDelete.includes(v.id));
state.selectedIds = [];
window.App.saveVideosLocal(state.videos);
if (window.supabase && window.SupabaseQueries) {
  await Promise.all(idsToDelete.map(id => window.SupabaseQueries.deleteVideo(id)));
}
window.App.showToast('Selected videos deleted successfully.');
renderCards(state);
```

**Important**: All these inline edit/delete handlers need to become `async` — add `async` before the function in `addEventListener`.

---

## Part 11: Hook Up Admin Tags Management (`admin/tags.js` → Supabase)

### Step 11.1: Add Scripts to `admin/tags.html`

Add to `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-init.js"></script>
```

Add before other scripts:

```html
<script src="../js/supabase-queries.js"></script>
```

### Step 11.2: Modify `js/admin/tags.js`

**Find this at the top**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('tags');
  const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
  const state = {
    tags: window.App.getTags(),
    currentPage: 1,
    itemsPerPage: 12,
    // ...
  };
```

**Replace with**:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  window.Components.injectAdminSidebar('tags');
  
  const TAG_PALETTE = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
  
  const state = {
    tags: [],
    currentPage: 1,
    itemsPerPage: 12,
    searchQuery: '',
    selectedIds: [],
    sortBy: 'name',
    sortOrder: 'asc'
  };

  await loadTagsFromSupabase(state);
  renderTags(state);

  document.getElementById('add-tag-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (!name || state.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        window.App.showToast('Tag already exists.', 'warning');
        return;
      }
      const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];
      
      if (window.supabase && window.SupabaseQueries) {
        const newTag = await window.SupabaseQueries.createTag(name, color);
        if (newTag) state.tags.push(newTag);
      } else {
        state.tags.push({ id: 'tag-' + Date.now(), name, color, usageCount: 0, createdDate: new Date().toISOString().split('T')[0] });
        window.App.saveTags(state.tags);
      }
      e.target.value = '';
      window.App.showToast('Tag added successfully.');
      renderTags(state);
    }
  });

  async function loadTagsFromSupabase(state) {
    try {
      if (window.supabase && window.SupabaseQueries) {
        const tags = await window.SupabaseQueries.getTags();
        state.tags = tags.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          usageCount: t.usage_count || 0,
          createdDate: t.created_date || ''
        }));
      } else {
        state.tags = window.App.getTagsLocal();
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      state.tags = window.App.getTagsLocal();
    }
  }
```

### Step 11.3: Update Tag Delete (with Supabase)

In `bindTagCardActions`, find:

```javascript
state.tags = state.tags.filter(t => t.id !== tag.id);
window.App.saveTags(state.tags);
```

Replace with:

```javascript
state.tags = state.tags.filter(t => t.id !== tag.id);
state.selectedIds = state.selectedIds.filter(id => id !== tag.id);
window.App.saveTags(state.tags);
if (window.supabase && window.SupabaseQueries) {
  await window.SupabaseQueries.deleteTag(tag.id);
}
```

### Step 11.4: Update Tag Merge (with Supabase)

In `mergeTags` function, find:

```javascript
window.App.saveVideos(videos);
window.App.saveTags(state.tags);
```

Replace with:

```javascript
window.App.saveVideosLocal(videos);
window.App.saveTags(state.tags);
if (window.supabase && window.SupabaseQueries) {
  // For each merged tag, delete from Supabase
  for (const id of idsToMerge) {
    await window.SupabaseQueries.deleteTag(id);
  }
  // Update each video's tags in Supabase
  for (const video of videos) {
    if (video.tags && Array.isArray(video.tags)) {
      await window.SupabaseQueries.setVideoTags(video.id, video.tags);
    }
  }
}
```

---

## Part 12: Hook Up Homepage (`home.js` → Users See Videos)

### Step 12.1: Add Scripts to `index.html`

Add to `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./js/supabase-config.js"></script>
<script src="./js/supabase-init.js"></script>
```

Add before other scripts:

```html
<script src="./js/supabase-queries.js"></script>
```

### Step 12.2: Modify `js/home.js`

**Find this**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectNavbar('home');
  window.Components.injectFooter();
  
  const allVideos = window.App.getVideos().filter(v => v.status === 'published');
  // ... rest of code
```

**Replace with**:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  window.Components.injectNavbar('home');
  window.Components.injectFooter();

  let allVideos = [];
  try {
    if (window.supabase && window.SupabaseQueries) {
      const result = await window.SupabaseQueries.getVideos({
        status: 'published',
        sortBy: 'publish_date',
        sortOrder: 'desc',
        limit: 50
      });
      allVideos = (result.data || []).map(v => ({
        id: v.id,
        title: v.title,
        description: v.description,
        videoUrl: v.video_url,
        embedUrl: v.embed_url,
        thumbnail: v.thumbnail,
        platform: v.platform,
        platformLabel: v.platform_label,
        views: v.views,
        likes: v.likes,
        tags: (v.tags || []).map(t => t.id),
        duration: v.duration,
        publishDate: v.publish_date,
        status: v.status,
        creator: v.creator
      }));
    } else {
      allVideos = window.App.getVideosLocal().filter(v => v.status === 'published');
    }
  } catch (error) {
    console.error('Error loading videos for homepage:', error);
    allVideos = window.App.getVideosLocal().filter(v => v.status === 'published');
  }

  if (allVideos.length === 0) {
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.innerHTML = window.Components.renderEmptyState('No published videos found. Admin please upload some videos!');
    }
    return;
  }

  // ─── SAME RENDERING CODE AS BEFORE — just uses allVideos from Supabase ───
  const heroVideo = allVideos.reduce((max, v) => v.views > max.views ? v : max, allVideos[0]);
  setupHeroBanner(heroVideo);

  // Popular Tags
  const popularTagsContainer = document.getElementById('popular-tags-container');
  if (popularTagsContainer) {
    const tags = window.App.getTags();  // Works with Supabase now (async, but we get the result)
    // ... rest of tags rendering stays the same
  }

  // ... rest of homepage rendering stays exactly the same (trending, new releases, browse by tag)
```

**Important**: The `setupHeroBanner` function calls `window.App.isVideoLiked()` and `window.App.toggleLikeVideo()` — these are now async. In `setupHeroBanner`, the like button click handler needs to be updated:

Find:

```javascript
likeBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const isNowLiked = window.App.toggleLikeVideo(video.id);
```

Replace with:

```javascript
likeBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  const isNowLiked = await window.App.toggleLikeVideo(video.id);
```

---

## Part 13: Hook Up Watch Page (`watch.js` → View Video)

### Step 13.1: Add Scripts to `watch.html`

Add to `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./js/supabase-config.js"></script>
<script src="./js/supabase-init.js"></script>
```

Add before other scripts:

```html
<script src="./js/supabase-queries.js"></script>
```

### Step 13.2: Modify `js/watch.js`

**Find this**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectNavbar();
  window.Components.injectFooter();

  const params = window.App.getQueryParams();
  const videoId = params.id;

  if (!videoId) { renderErrorView('Invalid Video Reference.'); return; }

  const dbVideos = window.App.getVideos();
  const videoIndex = dbVideos.findIndex(v => v.id === videoId);
  const video = dbVideos[videoIndex];

  if (!video) { renderErrorView('The video you are looking for does not exist.'); return; }
```

**Replace with**:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  window.Components.injectNavbar();
  window.Components.injectFooter();

  const params = window.App.getQueryParams();
  const videoId = params.id;

  if (!videoId) { renderErrorView('Invalid Video Reference.'); return; }

  // ─── LOAD VIDEO FROM SUPABASE ───
  let video = null;
  try {
    if (window.supabase && window.SupabaseQueries) {
      const supabaseVideo = await window.SupabaseQueries.getVideoById(videoId);
      if (supabaseVideo) {
        // Map Supabase field names to our player's expected field names
        video = {
          id: supabaseVideo.id,
          title: supabaseVideo.title,
          description: supabaseVideo.description,
          videoUrl: supabaseVideo.video_url,
          embedUrl: supabaseVideo.embed_url,
          thumbnail: supabaseVideo.thumbnail,
          platform: supabaseVideo.platform,
          platformLabel: supabaseVideo.platform_label,
          views: supabaseVideo.views,
          likes: supabaseVideo.likes,
          tags: (supabaseVideo.tags || []).map(t => typeof t === 'object' ? t.id : t),
          duration: supabaseVideo.duration,
          publishDate: supabaseVideo.publish_date,
          status: supabaseVideo.status,
          creator: supabaseVideo.creator
        };
      }
    }
    if (!video) {
      video = window.App.getVideosLocal().find(v => v.id === videoId);
    }
  } catch (error) {
    console.error('Error loading video:', error);
    video = window.App.getVideosLocal().find(v => v.id === videoId);
  }

  if (!video) { renderErrorView('The video you are looking for does not exist.'); return; }
```

### Step 13.3: Update View Counting

Find this code inside `setupVideoPlayer`:

```javascript
if (!viewIncremented) {
  dbVideos[videoIndex].views += 1;
  window.App.saveVideos(dbVideos);
  viewIncremented = true;
  const viewsEl = document.getElementById('watch-views-count');
  if (viewsEl) { viewsEl.innerText = Number(dbVideos[videoIndex].views).toLocaleString(); }
}
```

Replace with:

```javascript
if (!viewIncremented) {
  viewIncremented = true;
  if (window.supabase && window.SupabaseQueries) {
    await window.SupabaseQueries.incrementViewCount(video.id);
  } else {
    const localVideos = window.App.getVideosLocal();
    const idx = localVideos.findIndex(v => v.id === video.id);
    if (idx !== -1) {
      localVideos[idx].views += 1;
      window.App.saveVideosLocal(localVideos);
    }
  }
  const viewsEl = document.getElementById('watch-views-count');
  if (viewsEl) { viewsEl.innerText = Number(video.views + 1).toLocaleString(); }
}
```

### Step 13.4: Update Like Handling

Find:

```javascript
const handleLike = (isNowLiked) => {
  const db = window.App.getVideos();
  const idx = db.findIndex(v => v.id === video.id);
  if (idx !== -1) {
    db[idx].likes = isNowLiked ? db[idx].likes + 1 : db[idx].likes - 1;
    window.App.saveVideos(db);
    const likeCountEl = document.getElementById('watch-like-count');
    if (likeCountEl) likeCountEl.innerText = db[idx].likes.toLocaleString();
  }
  // ...
};
```

Replace with:

```javascript
const handleLike = async (isNowLiked) => {
  if (window.supabase && window.SupabaseQueries) {
    const result = await window.SupabaseQueries.toggleLike(video.id);
    video.likes = result.likes_count;
  } else {
    const db = window.App.getVideosLocal();
    const idx = db.findIndex(v => v.id === video.id);
    if (idx !== -1) {
      db[idx].likes = isNowLiked ? db[idx].likes + 1 : db[idx].likes - 1;
      window.App.saveVideosLocal(db);
      video.likes = db[idx].likes;
    }
  }
  const likeCountEl = document.getElementById('watch-like-count');
  if (likeCountEl) likeCountEl.innerText = Number(video.likes).toLocaleString();
  const likeBtn = document.getElementById('watch-like-btn');
  if (likeBtn) {
    if (isNowLiked) likeBtn.classList.add('liked');
    else likeBtn.classList.remove('liked');
  }
  const npHeart = document.getElementById('np-heart');
  if (npHeart) {
    if (isNowLiked) npHeart.classList.add('liked');
    else npHeart.classList.remove('liked');
  }
};
```

---

## Part 14: Supabase Storage for Thumbnails

### Step 14.1: Create a Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"Create a new bucket"**
3. Set:
   - **Name**: `thumbnails` (must match `SUPABASE_CONFIG.STORAGE_BUCKET`)
   - **Public**: ✅ ON
4. Click **"Create bucket"**

### Step 14.2: Set Storage Policies

```sql
-- Allow anyone to view thumbnails (they're on video cards)
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails' AND owner = auth.uid());
```

---

## Part 15: Row Level Security (RLS) Policies

Run this SQL in the SQL Editor — these match our app's exact access patterns:

```sql
-- ============================================================
-- RLS POLICIES FOR ANTIGRAVITY PLAY
-- ============================================================

-- PROFILES: anyone can view, users can update own
CREATE POLICY "Profiles publicly viewable" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- VIDEOS: public sees published only; admins can CRUD all
CREATE POLICY "Public view published videos" ON public.videos FOR SELECT TO public USING (status = 'published');
CREATE POLICY "Auth view all videos" ON public.videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator'));
CREATE POLICY "Admins update videos" ON public.videos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator'));
CREATE POLICY "Admins delete videos" ON public.videos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'administrator'));

-- TAGS: anyone can view, authenticated can CRUD
CREATE POLICY "Anyone view tags" ON public.tags FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update tags" ON public.tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete tags" ON public.tags FOR DELETE TO authenticated USING (true);

-- VIDEO_TAGS: anyone can view, authenticated can manage
CREATE POLICY "Anyone view video_tags" ON public.video_tags FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert video_tags" ON public.video_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete video_tags" ON public.video_tags FOR DELETE TO authenticated USING (true);

-- LIKES: anyone can view, authenticated can manage own
CREATE POLICY "Anyone view likes" ON public.likes FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert likes" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own likes" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- VIEW_LOGS: authenticated can insert, anyone can view aggregated
CREATE POLICY "Auth insert view_logs" ON public.view_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone view view_logs" ON public.view_logs FOR SELECT TO public USING (true);
```

---

## Part 16: Real-time Subscriptions (Live Updates)

### Step 16.1: Enable Realtime on Tables

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
```

### Step 16.2: Add to Homepage (`js/home.js`)

Add this after the initial rendering in `home.js`:

```javascript
// ─── REAL-TIME: Auto-refresh when admin publishes a new video ───
if (window.supabase) {
  const videoChannel = window.supabase
    .channel('home-video-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'videos' },
      async (payload) => {
        console.log('🔄 Video changed:', payload.eventType);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const { data: freshVideos } = await window.SupabaseQueries.getVideos({
            status: 'published', sortBy: 'publish_date', sortOrder: 'desc', limit: 50
          });
          if (freshVideos && freshVideos.length > 0) {
            refreshHomepage(freshVideos);
          }
        }
      }
    )
    .subscribe();
    
  window.addEventListener('beforeunload', () => {
    window.supabase.removeChannel(videoChannel);
  });
}

function refreshHomepage(videosData) {
  const allVideos = (videosData || []).map(v => ({
    id: v.id, title: v.title, description: v.description,
    videoUrl: v.video_url, embedUrl: v.embed_url, thumbnail: v.thumbnail,
    platform: v.platform, platformLabel: v.platform_label,
    views: v.views, likes: v.likes,
    tags: (v.tags || []).map(t => t.id),
    duration: v.duration, publishDate: v.publish_date,
    status: v.status, creator: v.creator
  }));
  if (allVideos.length === 0) return;

  const heroVideo = allVideos.reduce((max, v) => v.views > max.views ? v : max, allVideos[0]);
  setupHeroBanner(heroVideo);

  const trendingEl = document.getElementById('trending-container');
  if (trendingEl) {
    const trending = [...allVideos].sort((a, b) => b.views - a.views).slice(0, 8);
    trendingEl.innerHTML = trending.map(v => window.Components.renderVideoCard(v)).join('');
  }

  const newEl = document.getElementById('new-releases-container');
  if (newEl) {
    const newest = [...allVideos].reverse().slice(0, 8);
    newEl.innerHTML = newest.map(v => window.Components.renderVideoCard(v)).join('');
  }
}
```

### Step 16.3: Add to Watch Page (`js/watch.js`)

For live like count updates, add after `setupVideoPlayer`:

```javascript
// ─── REAL-TIME: Live like count updates ───
if (window.supabase) {
  const likeChannel = window.supabase
    .channel('watch-like-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'likes', filter: `video_id=eq.${video.id}` },
      async () => {
        const { data: updatedVideo } = await window.supabase
          .from('videos').select('likes').eq('id', video.id).single();
        if (updatedVideo) {
          video.likes = updatedVideo.likes;
          const likeCountEl = document.getElementById('watch-like-count');
          if (likeCountEl) likeCountEl.innerText = Number(updatedVideo.likes).toLocaleString();
        }
      }
    )
    .subscribe();

  window.addEventListener('beforeunload', () => {
    window.supabase.removeChannel(likeChannel);
  });
}
```

---

## Part 17: Testing the Full Flow

### ✅ Test: Admin Uploads → User Sees Video

```
1. Open /login.html
   → Enter email: admin@videoshare.com, password: admin123 (or your Supabase user)
   → Click "Sign In"
   → ✅ Redirected to /admin/index.html

2. Click "Upload Video" → /admin/upload.html
   → Select YouTube platform
   → Paste: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   → Click "Load Video"
   → ✅ Preview loads, metadata fills in

3. Select tags, set title, click "Publish Video"
   → ✅ Toast: "Video published successfully!"
   → ✅ Redirected to /admin/videos.html
   → ✅ New video appears in the grid

4. Open /index.html (in a new tab, no login needed)
   → ✅ New video appears in:
        • "Trending Now" (sorted by views)
        • "New Releases" (sorted by date)
        • Under relevant tag pill

5. Click the video → /watch.html?id={id}
   → ✅ Video player loads (YouTube embed)
   → ✅ Title, description, creator, tags display
   → ✅ Related videos in sidebar

6. Play the video
   → ✅ View count increments once
   → ✅ Admin dashboard shows updated stats
```

### ✅ Test: Like/Unlike Flow

```
1. On watch page, click the heart/like button
   → ✅ Like count increments
   → ✅ Button fills with pink color
   → ✅ Like saved to Supabase likes table

2. Click again to unlike
   → ✅ Like count decrements
   → ✅ Button returns to outline

3. Open homepage, hero banner like button works the same
```

### ✅ Test: Admin Dashboard Stats

```
1. Go to /admin/index.html
   → ✅ Total Videos = number of published videos in DB
   → ✅ Total Views = sum of all video views
   → ✅ Total Likes = sum of all video likes
   → ✅ Total Tags = count of tags
   → ✅ Recent Uploads shows latest 5 videos
   → ✅ Views Trend chart shows daily view data from view_logs
```

---

## Part 18: Field Mapping Reference

### Our `MOCK_VIDEOS` ↔ Supabase `videos` Table

| mockData.js Field | Supabase Column | Example Value |
|---|---|---|
| `video.id` | `id` TEXT PRIMARY KEY | `'vid-01'` |
| `video.title` | `title` TEXT | `'Building a Modern Design System...'` |
| `video.description` | `description` TEXT | `'Learn the principles...'` |
| `video.videoUrl` | `video_url` TEXT | `'https://commondatastorage...'` |
| `video.embedUrl` | `embed_url` TEXT | `'https://www.youtube.com/embed/...'` |
| `video.thumbnail` | `thumbnail` TEXT | `'https://images.unsplash.com/...'` |
| `video.platform` | `platform` TEXT | `'youtube'` |
| `video.platformLabel` | `platform_label` TEXT | `'YouTube'` |
| `video.views` | `views` INTEGER | `14205` |
| `video.likes` | `likes` INTEGER | `842` |
| `video.tags[]` | `→ video_tags junction table` | `['programming','design','tutorial']` |
| `video.duration` | `duration` TEXT | `'10:14'` |
| `video.publishDate` | `publish_date` DATE | `'2026-07-01'` |
| `video.status` | `status` TEXT | `'published'` or `'draft'` |
| `video.creator` | `creator` TEXT | `'DesignOps Weekly'` |

### Our `MOCK_TAGS` ↔ Supabase `tags` Table

| mockData.js Field | Supabase Column | Example Value |
|---|---|---|
| `tag.id` | `id` TEXT PRIMARY KEY | `'programming'` |
| `tag.name` | `name` TEXT UNIQUE | `'Programming'` |
| `tag.color` | `color` TEXT | `'#0070f3'` |
| `tag.usageCount` | `usage_count` INTEGER | `3` |
| `tag.createdDate` | `created_date` DATE | `'2026-06-01'` |

---

## Part 19: Common Issues & Troubleshooting

### 🔴 Issue: "Failed to fetch" or CORS errors

**For Antigravity Play** (running locally via `file://` protocol):

- CORS is not an issue if using `file://`. But Supabase Auth has issues with `file://` redirects.
- **Solution**: Use a local server instead of opening files directly:
  - VS Code: Install "Live Server" extension, right-click `index.html` → "Open with Live Server"
  - Python: `python -m http.server 5500` in the project root
  - Then update Supabase Auth settings: Go to Dashboard → Authentication → Settings → Add `http://localhost:5500` to redirect URLs

### 🔴 Issue: "relation does not exist"

**Solution**: Run the entire SQL schema from Part 3. Make sure all 8 tables (profiles, tags, videos, video_tags, likes, comments, notifications, view_logs) are created.

### 🔴 Issue: "new row violates row-level security"

**Solution**:

1. Make sure RLS policies from Part 15 are applied
2. For admin operations, the user must be logged in with `role = 'administrator'` in the `profiles` table
3. Check Supabase Auth → Users to confirm the user exists

### 🔴 Issue: Videos don't show on homepage after admin uploads

**Solution**:

1. Check that the video was saved with `status: 'published'` (not 'draft')
2. Check the browser console for Supabase errors
3. Clear localStorage and try again
4. Verify the Supabase scripts are loaded in `index.html`

### 🔴 Issue: Login page redirects but dashboard is blank

**Solution**:

1. Check console for JavaScript errors
2. Make sure `supabase-queries.js` is loaded BEFORE `dashboard.js`
3. Check that the `checkAuth()` async function in `main.js` is working

### 🔴 Issue: Like count not updating

**Solution**:

1. User must be authenticated (likes require a user_id)
2. Check that RPC functions (`increment_likes`, `decrement_likes`) were created in Part 3.5
3. Check browser console for "Error toggling like" messages

### 🔴 Issue: localStorage still has old data

**Solution**: Clear browser data:

1. Open DevTools (F12)
2. Application → Local Storage → Clear All
3. Or run in console: `localStorage.clear()`

### 🔴 Issue: Supabase client not initialized

**Solution**: Ensure scripts load in this exact order:

```html
1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
2. <script src="./js/supabase-config.js"></script>
3. <script src="./js/supabase-init.js"></script>
4. <script src="./js/supabase-queries.js"></script>
5. <script src="./js/mockData.js"></script>
6. <script src="./js/main.js"></script>
7. <script src="./js/components.js"></script>
8. <script src="./js/animations.js"></script>
9. <script src="./js/home.js"></script> (or other page-specific file)
```

---

> **🎉 Congratulations! Antigravity Play now runs on Supabase!**
>
> **Full flow**:
>
> 1. **Admin** logs in via Supabase Auth → uploads video in `/admin/upload.html`
> 2. **Video saved** to Supabase PostgreSQL `videos` table + `video_tags` junction
> 3. **Users** on `/index.html` see it instantly (data fetched from Supabase)
> 4. **Views and likes** tracked in real-time via `view_logs` and `likes` tables
> 5. **Admin Dashboard** at `/admin/index.html` shows live stats from database
> 6. **Real-time** with Supabase Realtime means no page refresh needed!
>
> Your data is no longer trapped in localStorage — it's in a real PostgreSQL database!
