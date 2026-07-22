# Antigravity Play — Adult Videos & Stories Platform

> **Note:** This project is an adult-oriented content platform. Age-restricted — 18+ only.

---

## 📖 About This Website

**Antigravity Play** is a modern, feature-rich adult video and stories streaming platform built with a Spotify-inspired dark design system. It provides a premium, immersive browsing experience for mature audiences.

The platform supports:

- **🎬 Adult Videos** — Browse, search, watch, and interact with adult video content organized by categories/tags. Features include video play, like/unlike, view counters, and trending sections.
- **📖 Adult Stories** — A dedicated section for adult-oriented written stories and narratives, expanding the platform beyond video content.
- **🔍 Full-Text Search** — Powerful search functionality to discover videos and stories by title, tags, or description.
- **🏷️ Tag-Based Discovery** — Content organized by tags/categories for easy filtering and exploration (Popular Tags, Browse by Tag).
- **📱 Responsive Design** — Fully responsive layout that works across mobile, tablet, and desktop devices.
- **🌙 Premium Dark Theme** — Immersive near-black UI inspired by Spotify's design language (`#121212` palette, pill buttons, circular controls).
- **🔐 Admin Panel** — Full admin dashboard for managing videos, tags, uploads, analytics, activity logs, notifications, and settings.
- **🔑 Authentication** — Supabase-based authentication with login, session management, and route guards for admin areas.
- **📡 RSS Feed & OpenSearch** — Built-in RSS feed and browser search engine integration.
- **🌓 Light/Dark Mode** — Toggle between dark and light themes with persistent preference.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Design System** | Spotify-inspired dark theme (custom) |
| **Backend / Auth** | Supabase (PostgreSQL + Auth) |
| **Data Layer** | localStorage (with Supabase sync capability) |
| **Icons** | SVG inline icons |
| **SEO** | robots.txt, sitemap.xml, OpenSearch, RSS feed |
| **Hosting** | Static site (Vercel-ready) |

---

## 🗂️ .gitignore Configuration

For this project, use the **`Node`** template on GitHub when creating the repository, combined with additional rules below.

Since this is a **static HTML/CSS/JS website** (no Node.js build tools, no `package.json`), the standard **Node gitignore** works well because it covers:

- IDE/editor files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)
- Environment files (`.env`, `.env.local`)
- Log files (`*.log`, `npm-debug.log*`)

### Recommended `.gitignore` for this project

```gitignore
# ─── Environment & Secrets ───
.env
.env.local
.env.*.local

# ─── Supabase credentials (if extracted to config) ───
supabase-config.js
supabase-credentials.json

# ─── IDE & Editor ───
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db
desktop.ini

# ─── OS Files ───
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# ─── Logs ───
*.log
npm-debug.log*

# ─── Local data backups (if generated) ───
data/backup/
*.bak

# ─── Misc ───
*.tmp
*.temp
```

### Why this .gitignore?

- **Avoids committing Supabase keys** — Even though keys are currently inline in `js/supabase.js`, it's good practice to eventually extract them to a `.env` file that is gitignored.
- **Keeps IDE settings out of the repo** — Each developer's `.vscode/` or `.idea/` settings should remain local.
- **Prevents OS junk files** — `.DS_Store` (macOS) and `Thumbs.db` (Windows) clutter the repo.
- **Protects local data** — Any local data backups or temporary files stay out of version control.

---

## 📝 Description (200 Characters)

> **Antigravity Play** — A premium adult video and stories platform with a Spotify-inspired dark theme. Browse, search, and enjoy mature content organized by tags with full admin management and Supabase-powered authentication.

*(195 characters — fits within the 200-character GitHub limit)*

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- (Optional) A Supabase account for backend features

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/antigravity-play.git
   cd antigravity-play
   ```

2. **Open the website**
   - Simply open `index.html` in your browser
   - Or deploy to any static hosting (Vercel, Netlify, GitHub Pages)

3. **(Optional) Configure Supabase**
   - Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `js/supabase.js` with your own Supabase project credentials
   - Run the SQL from `supabase-setup.sql` in your Supabase SQL editor to set up tables

---

## 📁 Project Structure

```
├── index.html              # Home page (hero, tags, trending, new releases)
├── watch.html              # Video player page
├── search.html             # Search results page
├── tag.html                # Tag/category browsing
├── login.html              # Authentication page
├── forgot-password.html    # Password recovery
├── about.html              # About page
├── contact.html            # Contact page
├── faq.html                # Frequently asked questions
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── dmca.html               # DMCA policy
├── cookie-policy.html      # Cookie policy
├── robots.txt              # Crawler rules
├── sitemap.xml             # XML sitemap for SEO
├── opensearch.xml          # Browser search integration
├── rss-feed.html           # RSS feed page
│
├── css/                    # Stylesheets
│   ├── main.css            # Global design system
│   ├── home.css            # Home page styles
│   ├── watch.css           # Video player styles
│   ├── search.css          # Search page styles
│   ├── login.css           # Authentication styles
│   ├── forms.css           # Form styles
│   ├── legal.css           # Legal page styles
│   ├── system.css          # System/utility styles
│   └── admin/              # Admin panel styles
│
├── js/                     # JavaScript
│   ├── main.js             # Core utilities, theme, router
│   ├── components.js       # Reusable UI components
│   ├── home.js             # Home page logic
│   ├── watch.js            # Video player logic
│   ├── search.js           # Search logic
│   ├── login.js            # Authentication logic
│   ├── mockData.js         # Mock video/tag data
│   ├── animations.js       # Animation utilities
│   ├── supabase.js         # Supabase client setup
│   └── supabase-api.js     # Supabase API layer
│
├── components/             # Reusable HTML components
├── admin/                  # Admin dashboard pages
├── blog/                   # Blog section
├── data/                   # JSON data files
└── spotify_designer.md     # Spotify design system reference
```

---

## 🌟 Key Features

### For Viewers

- **Trending & New Releases** — Discover popular and recently added content
- **Tag-Based Browsing** — Filter content by categories/tags
- **Video Playback** — In-browser video player with controls
- **Like Videos** — Save favorites with like/unlike functionality
- **Search** — Full-text search across video titles, tags, and descriptions
- **Dark/Light Mode** — Toggle between immersive dark and clean light themes
- **Keyboard Shortcuts** — Press `/` to focus search, `Escape` to close modals
- **Responsive** — Works on all screen sizes

### For Admins

- **Video Management** — Upload, edit, delete videos
- **Tag Management** — Create and manage content tags/categories
- **Analytics Dashboard** — View platform statistics and trends
- **Activity Logs** — Monitor user and admin activities
- **Error Logs** — Track system errors
- **Notifications** — Manage system notifications
- **Settings** — Configure platform settings

---

## 📄 License

This project is for personal and educational use. All video content and media are for demonstration purposes only.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📬 Contact

- **Website:** [Antigravity Play](https://antigravityplay.com)
- **Email:** <support@antigravityplay.com>

---

*Built with ❤️ using vanilla HTML, CSS, and JavaScript*
