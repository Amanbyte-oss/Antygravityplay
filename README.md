# Antigravity Play

Experience books, Reddit stories, and real-life narratives through crystal-clear, emotionally engaging human voice narration in English.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Hosting:** Static file server (any)

## Features

- Video platform with player support (YouTube, Vimeo, Dailymotion, direct MP4, HLS, embed)
- Browse by tags, search with filters
- Admin panel — upload, manage videos/tags, analytics dashboard with custom Canvas charts, settings
- Feedback / Bug Report / Feature Request forms
- Maintenance mode, status page, error pages (404, 403, 500, offline)
- Service worker for offline fallback
- Dark/light theme with persistence
- Responsive design

## Setup

1. Run `supabase-setup.sql` in your Supabase SQL Editor to create tables.
2. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/supabase.js`.
3. Serve the root folder with any static server:

```
npx serve .
```

4. Open the served URL in a browser.

## Project Structure

```
├── index.html              # Home page
├── watch.html              # Video player
├── search.html             # Search & filter
├── tag.html                # Tag browsing
├── login.html              # Admin login
├── admin/                  # Admin panel
├── css/                    # Stylesheets
├── js/                     # JavaScript
│   ├── main.js             # Core: routing, theme, guards
│   ├── supabase.js         # Supabase client init
│   ├── supabase-api.js     # Supabase data API
│   ├── components.js       # UI components (navbar, footer, cards)
│   └── admin/              # Admin JS
├── components/             # HTML component templates
├── sw.js                   # Service worker
└── supabase-setup.sql      # Database schema
```
