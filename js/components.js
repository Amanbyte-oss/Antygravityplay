// ─── Reusable UI Components Injection Layer ───
// This IIFE provides a set of functions to inject HTML components (navbar, footer,
// sidebar, video cards, skeleton loaders, empty/error states) into the DOM.
// It also exports an escapeHtml utility and an updateThemeIcons helper.
(function() {

  // ─── PREFIX DETECTION ───
  // Determine if we are inside the admin directory to set correct relative paths
  const isInsideAdmin = window.location.pathname.replace(/\\/g, '/').includes('/admin/');
  // Root-relative prefix for linking back to public pages
  const rootPrefix = isInsideAdmin ? '../' : './';
  // Admin-relative prefix for linking to admin pages
  const adminPrefix = isInsideAdmin ? './' : './admin/';

  // ─── HTML ESCAPE UTILITY ───
  /**
   * Escapes special HTML characters to prevent XSS attacks.
   * @param {*} str - The string to escape
   * @returns {string} The escaped string safe for innerHTML
   */
  function escapeHtml(str) {
    // Convert non-strings to their string representation
    if (typeof str !== 'string') return String(str || '');
    // Mapping of unsafe characters to their HTML entities
    const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    // Replace each unsafe character using the map
    return str.replace(/[&<>"']/g, ch => map[ch]);
  }

  // ─── COMPONENTS API ───
  const Components = {

    // ─── 1. PUBLIC NAVBAR ───
    /**
     * Injects the public-facing navigation bar into #navbar-container.
     * Includes the logo, nav links, search form, theme toggle, and hamburger menu.
     * Also injects dropdown styles once and binds mobile hamburger toggle.
     * @param {string} [activePage=''] - The active page identifier for highlighting nav links
     */
    injectNavbar(activePage = '') {
      // Find the container element where the navbar will be placed
      const container = document.getElementById('navbar-container');
      // Exit if the container doesn't exist on this page
      if (!container) return;

      // Fetch the current list of tags for the dropdown menu
      const tags = window.App.getTags();

      // ─── Generate Tags Dropdown items ───
      // Map each tag to a list item with a colored dot and name
      const tagDropdownItems = tags.map(tag => 
        `<li><a href="${rootPrefix}tag.html?tag=${encodeURIComponent(tag.name)}"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${this._tagColor(tag.name)}; margin-right:6px;"></span>${tag.name}</a></li>`
      ).join('');

      // ─── Inject Navbar HTML ───
      container.innerHTML = `
        <div class="navbar">
          <!-- Left section: Logo + Navigation links -->
          <div class="nav-left">
            <a href="${rootPrefix}index.html" class="logo" aria-label="Go to Home">
              <!-- Play icon SVG logo -->
              <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
              </svg>
              <span>Antigravity Play</span>
            </a>
            <!-- Main navigation menu -->
            <nav class="nav-menu" aria-label="Main Navigation">
              <a href="${rootPrefix}search.html" class="nav-link ${activePage === 'search' ? 'active' : ''}">Browse</a>
              <!-- Tags dropdown trigger -->
              <div class="nav-link dropdown-container" style="position:relative; cursor:pointer;">
                Tags ▾
                <ul class="dropdown-menu">
                  ${tagDropdownItems}
                </ul>
              </div>
            </nav>
          </div>
          
          <!-- Center section: Search bar -->
          <div class="nav-center">
            <form action="${rootPrefix}search.html" method="GET">
              <div class="search-bar-container">
                <button type="submit" class="search-icon-btn" aria-label="Submit Search">
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <input type="text" name="q" placeholder="Search videos, creators, tags... (Press / to focus)" aria-label="Search inputs" id="global-search-input">
              </div>
            </form>
          </div>

          <!-- Right section: Advanced Search link, Theme Toggle, Hamburger -->
          <div class="nav-right">
            <a href="${rootPrefix}search.html" class="nav-link ${activePage === 'search' ? 'active' : ''}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Advanced Search
            </a>
            <!-- Theme toggle button (sun/moon icons) -->
            <button class="theme-toggle" aria-label="Toggle theme">
              <svg class="theme-icon-sun" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:none;">
                <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg class="theme-icon-moon" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
            <!-- Mobile hamburger menu button -->
            <button class="hamburger" aria-label="Open mobile menu" aria-expanded="false">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      `;

      // ─── INLINE STYLES FOR DROPDOWN ───
      // Only inject the style element once to avoid duplicates
      if (!document.getElementById('navbar-dropdown-style')) {
        const style = document.createElement('style');
        style.id = 'navbar-dropdown-style';
        // CSS for the dropdown hover behavior and menu styling
        style.innerHTML = `
          .dropdown-container:hover .dropdown-menu { display: block; }
          .dropdown-container::before {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            right: 0;
            height: 8px;
          }
          .dropdown-menu {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            min-width: 180px;
            list-style: none;
            padding: var(--space-sm) 0;
            box-shadow: var(--shadow-lg);
            z-index: 200;
          }
          .dropdown-menu li a {
            display: block;
            padding: var(--space-sm) var(--space-lg);
            font-size: var(--text-sm);
            color: var(--text-secondary);
            transition: background-color var(--transition-fast), color var(--transition-fast);
          }
          .dropdown-menu li a:hover {
            background-color: var(--bg-elevated);
            color: var(--text-primary);
          }
        `;
        // Append the style element to the document head
        document.head.appendChild(style);
      }

      // ─── THEME ICON SYNC ───
      // Adjust the visibility of sun/moon icons based on current theme
      updateThemeIcons();
      // Listen for theme change events to keep icons in sync
      window.addEventListener('themechanged', updateThemeIcons);

      // ─── MOBILE HAMBURGER TOGGLE ───
      // Get references to the hamburger button and the nav menu
      const hamburger = container.querySelector('.hamburger');
      const navMenu = container.querySelector('.nav-menu');
      // Only bind if both elements exist
      if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
          // Toggle the 'active' class on the nav menu and get the new state
          const isOpen = navMenu.classList.toggle('active');
          // Sync the hamburger button style
          hamburger.classList.toggle('active');
          // Update aria-expanded for accessibility
          hamburger.setAttribute('aria-expanded', isOpen);
          // Prevent body scrolling when the mobile menu is open
          document.body.style.overflow = isOpen ? 'hidden' : '';
        });
      }

      // ─── SUPABASE TAGS REFRESH ───
      // Re-render the tags dropdown when Supabase data arrives
      var self = this;
      document.addEventListener('supabase-active', function() {
        var tags = window.App.getTags();
        var dropdown = container.querySelector('.dropdown-menu');
        if (!dropdown) return;
        dropdown.innerHTML = tags.map(function(tag) {
          return '<li><a href="' + rootPrefix + 'tag.html?tag=' + encodeURIComponent(tag.name) + '"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:' + self._tagColor(tag.name) + '; margin-right:6px;"></span>' + tag.name + '</a></li>';
        }).join('');
      });
    },

    // ─── 2. ADMIN SIDEBAR ───
    /**
     * Injects the admin sidebar navigation into #sidebar-container.
     * Includes logo, nav links with active highlighting, user info, and logout button.
     * @param {string} [activePage=''] - The active admin page identifier for highlighting
     */
    injectAdminSidebar(activePage = '') {
      // Find the container element for the sidebar
      const container = document.getElementById('sidebar-container');
      // Exit if the container doesn't exist on this page
      if (!container) return;

      // Retrieve the admin's name from localStorage, falling back to a default
      const userName = localStorage.getItem('admin-name') || 'Administrator';

      // ─── Inject Sidebar HTML ───
      container.innerHTML = `
        <div class="admin-sidebar" aria-label="Admin Navigation">
          <!-- Sidebar header with logo and close button -->
          <div class="sidebar-header">
            <a href="${rootPrefix}index.html" class="logo">
              <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
              </svg>
              <span>Antigravity Play</span>
            </a>
            <button class="sidebar-close-btn" aria-label="Close sidebar">&times;</button>
          </div>
          <!-- Sidebar navigation menu items -->
          <ul class="sidebar-menu">
            <li>
              <a href="${adminPrefix}index.html" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect>
                  <rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <a href="${adminPrefix}videos.html" class="sidebar-link ${activePage === 'videos' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 7a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7z"></path>
                  <polygon points="10 11 10 15 14 13 10 11"></polygon>
                </svg>
                Videos
              </a>
            </li>
            <li>
              <a href="${adminPrefix}upload.html" class="sidebar-link ${activePage === 'upload' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Video
              </a>
            </li>
            <li>
              <a href="${adminPrefix}tags.html" class="sidebar-link ${activePage === 'tags' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                Tags
              </a>
            </li>
            <li>
              <a href="${adminPrefix}analytics.html" class="sidebar-link ${activePage === 'analytics' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Analytics
              </a>
            </li>
            <li>
              <a href="${adminPrefix}settings.html" class="sidebar-link ${activePage === 'settings' ? 'active' : ''}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Settings
              </a>
            </li>
          </ul>
          
          <!-- Sidebar footer with user info and logout button -->
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <!-- User avatar showing initials -->
              <div class="sidebar-user-avatar">
                ${userName.split(' ').map(n=>n[0]).join('').toUpperCase()}
              </div>
              <div class="sidebar-user-info">
                <span class="sidebar-user-name">${userName}</span>
                <span class="sidebar-user-role">Administrator</span>
              </div>
            </div>
            <!-- Logout button -->
            <button id="logout-btn" class="btn btn-secondary" style="width: 100%; border-radius: var(--radius-sm); padding: var(--space-sm) var(--space-md); text-align: center;">
              Log Out
            </button>
          </div>
        </div>
      `;

      // ─── LOGOUT LOGIC ───
      var logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('admin-session');
          localStorage.removeItem('admin-name');
          if (window.SupabaseAuth && window.SupabaseAuth.logout) window.SupabaseAuth.logout();
          window.location.href = rootPrefix + 'index.html';
        });
      }
    },

    // ─── 3. FOOTER ───
    /**
     * Injects the page footer into #footer-container.
     * Includes branding, navigation columns (Browse, Resources, Support, Legal),
     * and a bottom bar with copyright and tech credit.
     */
    injectFooter() {
      // Find the footer container element
      const container = document.getElementById('footer-container');
      // Exit if the container doesn't exist
      if (!container) return;

      // ─── Inject Footer HTML ───
      container.innerHTML = `
        <div class="footer-wrapper">
          <div class="container footer">
            <!-- Brand column -->
            <div class="footer-col footer-brand">
              <div class="logo">
                <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                  <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
                </svg>
                <span>Antigravity Play</span>
              </div>
              <p>Experience books, Reddit stories, and real-life narratives through crystal-clear, emotionally engaging human voice narration in English.</p>
            </div>
            <!-- Browse links column -->
            <div class="footer-col">
              <h4>Browse</h4>
              <ul>
                <li><a href="${rootPrefix}index.html">Trending</a></li>
                <li><a href="${rootPrefix}search.html">Search</a></li>
                <li><a href="${rootPrefix}tag.html">Tags</a></li>
                <li><a href="${rootPrefix}about.html">About</a></li>
                <li><a href="${rootPrefix}blog/index.html">Blog</a></li>
              </ul>
            </div>
            <!-- Resources links column -->
            <div class="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="${rootPrefix}sitemap.html" target="_blank" rel="noopener">Sitemap</a></li>
                <li><a href="${rootPrefix}rss-feed.html" target="_blank" rel="noopener">RSS Feed</a></li>
                <li><a href="${rootPrefix}changelog.html" target="_blank" rel="noopener">Changelog</a></li>
                <li><a href="${rootPrefix}release-notes.html" target="_blank" rel="noopener">Release Notes</a></li>
                <li><a href="${rootPrefix}announcements.html" target="_blank" rel="noopener">Announcements</a></li>
                <li><a href="${rootPrefix}tutorial.html" target="_blank" rel="noopener">Tutorial</a></li>
                <li><a href="${rootPrefix}status.html" target="_blank" rel="noopener">Status</a></li>
              </ul>
            </div>
            <!-- Support links column -->
            <div class="footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="${rootPrefix}help-centre.html" target="_blank" rel="noopener">Help Centre</a></li>
                <li><a href="${rootPrefix}contact.html" target="_blank" rel="noopener">Contact</a></li>
                <li><a href="${rootPrefix}faq.html" target="_blank" rel="noopener">FAQ</a></li>
                <li><a href="${rootPrefix}feedback.html" target="_blank" rel="noopener">Feedback</a></li>
                <li><a href="${rootPrefix}report-bug.html" target="_blank" rel="noopener">Report a Bug</a></li>
                <li><a href="${rootPrefix}feature-request.html" target="_blank" rel="noopener">Feature Request</a></li>
                <li><a href="${rootPrefix}login.html" target="_blank" rel="noopener">Admin Portal</a></li>
              </ul>
            </div>
            <!-- Legal links column -->
            <div class="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="${rootPrefix}privacy.html" target="_blank" rel="noopener">Privacy Policy</a></li>
                <li><a href="${rootPrefix}terms.html" target="_blank" rel="noopener">Terms of Use</a></li>
                <li><a href="${rootPrefix}dmca.html" target="_blank" rel="noopener">DMCA</a></li>
                <li><a href="${rootPrefix}copyright.html" target="_blank" rel="noopener">Copyright</a></li>
                <li><a href="${rootPrefix}cookie-policy.html" target="_blank" rel="noopener">Cookie Policy</a></li>
                <li><a href="${rootPrefix}community-guidelines.html" target="_blank" rel="noopener">Guidelines</a></li>
              </ul>
            </div>
          </div>
          <!-- Bottom bar with copyright and tech credit -->
          <div class="container footer-bottom">
            <span>&copy; 2026 Antigravity Play. All rights reserved.</span>
            <span>Handcrafted in India with Vanilla JS</span>
          </div>
        </div>
      `;

      // ─── RELATIVE LINK FIX ───
      // Remove target="_blank" for links that point to the current page
      // This prevents opening the same page in a new tab
      var currentFile = window.location.pathname.split('/').pop() || 'index.html';
      // Iterate over all footer links that have target="_blank"
      container.querySelectorAll('a[target="_blank"]').forEach(function(link) {
        var href = link.getAttribute('href');
        // Extract the filename from the href (strip path and query string)
        var linkFile = href.split('/').pop().split('?')[0];
        // If the link points to the current page, remove target and rel attributes
        if (currentFile === linkFile || (currentFile === '' && linkFile === 'index.html')) {
          link.removeAttribute('target');
          link.removeAttribute('rel');
        }
      });
    },

    // ─── TAG COLOR HELPER ───
    _tagColor(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = ['#0070f3','#7928ca','#ff0080','#ffa42b','#50e3c2','#539df5','#1db954','#f3727f','#e91e63','#ff5722','#9c27b0','#00bcd4','#ff9800','#4caf50','#f44336','#3f51b5'];
      return colors[Math.abs(hash) % colors.length];
    },

    // ─── 4. VIDEO CARD ───
    /**
     * Renders an HTML string for a video card (thumbnail, title, meta, tags).
     * Includes lazy loading, duration badge, and click-to-navigate via data-href.
     * @param {Object} video - A video object from the database
     * @returns {string} HTML string for the video card
     */
    renderVideoCard(video) {
      // Limit to first 3 tag strings for display
      const videoTags = (video.tags || []).slice(0, 3);
      // Count how many tags are hidden beyond the first 3
      const extraCount = (video.tags || []).length - 3;
      // Generate HTML for each visible tag pill
      const tagPillsHtml = videoTags.map(t => {
        const color = Components._tagColor(t);
        return '<a href="' + rootPrefix + 'tag.html?tag=' + encodeURIComponent(t) + '" class="tag-pill" style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; font-size:11px; border-radius:12px; border-left:4px solid ' + color + '; background:' + color + '18; color:var(--text-secondary); text-decoration:none; margin-right:4px; margin-bottom:4px;">' + escapeHtml(t) + '</a>';
      }).join('');
      // Show "+N" indicator if there are more tags beyond the visible ones
      const moreHtml = extraCount > 0 ? `<span style="font-size:11px; color:var(--text-muted); margin-left:2px;">+${extraCount}</span>` : '';
      // Only render the tags section if there are any pills or the "+N" indicator
      const tagsSection = (tagPillsHtml || moreHtml) ? `<div class="video-tag-pills" style="margin-top:6px;">${tagPillsHtml}${moreHtml}</div>` : '';

      // Build the watch page URL for this video
      const href = `${rootPrefix}watch.html?id=${encodeURIComponent(video.id)}`;
      // Escape all user-facing strings for safe HTML insertion
      const safeTitle = escapeHtml(video.title);
      const safeCreator = escapeHtml(video.creator);
      const safeDuration = escapeHtml(video.duration);
      const safePubDate = escapeHtml(video.publishDate);
      var fmt = window.Engagement ? window.Engagement.formatNum : function(n){ return Number(n).toLocaleString(); };
      var viewsStr = fmt(video.views || 0);
      var likesStr = fmt(video.likes || 0);
      var reactsStr = fmt(video.reactions || 0);
      var vs = video.video_source || '';
      var platIcon = vs === 'youtube' ? '▶' : vs === 'vimeo' ? '▽' : vs === 'dailymotion' ? '◆' : vs === 'streamable' ? '▶' : vs === 'cloudflare' ? '◎' : vs === 'peertube' ? '◉' : vs === 'wistia' ? '◈' : vs === 'abyss' ? '⬡' : vs === 'pornhub' ? '🔥' : vs === 'googledrive' ? '▣' : vs === 'screenpal' ? '●' : vs === 'dropbox' ? '◆' : vs === 'onedrive' ? '☁' : vs === 'embed' ? '</>' : vs === 'upload' ? '📁' : '';
      var platBadge = platIcon ? '<span class="platform-badge" title="' + escapeHtml(vs) + '">' + platIcon + '</span>' : '';
      return `
        <article class="video-card" data-video-id="${video.id}" data-href="${href}">
          <div class="thumbnail-container">
            <img class="lazy" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%231f1f1f'/%3E%3C/svg%3E" data-src="${video.thumbnail}" alt="${safeTitle} Preview">
            <span class="duration-badge">${safeDuration}</span>
            ${platBadge}
            <button class="play-hover-btn" data-href="${href}" aria-label="Play video">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="8,5 19,12 8,19"></polygon>
              </svg>
            </button>
            <button class="live-link-btn" onclick="event.stopPropagation();window.open('${href}','_blank')" aria-label="Open video in new tab" title="Open in new tab">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>
            <div class="engagement-stats">
              <span class="eng-stat"><span class="eng-icon">👁️</span><span class="eng-count eng-views">${viewsStr}</span></span>
              <span class="eng-stat"><span class="eng-icon">❤️</span><span class="eng-count eng-likes">${likesStr}</span></span>
              <span class="eng-stat"><span class="eng-icon">🔥</span><span class="eng-count eng-reacts">${reactsStr}</span></span>
            </div>
          </div>
          <div class="video-info">
            <h3 class="video-title">${safeTitle}</h3>
            <div class="video-meta">
              <div class="video-creator">${safeCreator}</div>
              <div>${safePubDate}</div>
            </div>
            ${tagsSection}
          </div>
        </article>
      `;
    },

    // ─── 5. TAG CARD ───
    /**
     * Renders a small tag badge link for inline display (e.g., in tag rows).
     * @param {Object} tag - A tag object with id, name, color
     * @returns {string} HTML string for the tag badge
     */
    renderTagCard(tag) {
      return `
        <a href="${rootPrefix}tag.html?tag=${encodeURIComponent(tag.name)}" class="tag-badge" style="border-left:4px solid ${tag.color}; background:${tag.color}18;">
          ${tag.name}
        </a>
      `;
    },

    // ─── 6. SKELETON LOADER ───
    /**
     * Renders 6 placeholder skeleton cards for loading states.
     * @returns {string} HTML string with 6 skeleton video cards
     */
    renderSkeletonLoader() {
      // Create an array of 6 skeleton cards
      return Array(6).fill(0).map(() => `
        <div class="video-card">
          <!-- Skeleton thumbnail placeholder -->
          <div class="thumbnail-container skeleton" style="aspect-ratio: 16/9; margin-bottom: var(--space-md);"></div>
          <!-- Skeleton text lines -->
          <div style="display:flex; flex-direction:column; gap: var(--space-sm);">
            <div class="skeleton" style="height: 16px; width: 85%;"></div>
            <div class="skeleton" style="height: 12px; width: 60%;"></div>
            <div class="skeleton" style="height: 10px; width: 40%; margin-top: 4px;"></div>
          </div>
        </div>
      `).join('');
    },

    // ─── 7. EMPTY STATE ───
    /**
     * Renders a centered empty-state placeholder for no-results scenarios.
     * @param {string} [message] - Primary message text
     * @param {string} [subtitle] - Secondary helper text
     * @returns {string} HTML string for the empty state
     */
    renderEmptyState(message = 'No videos found matching your filters.', subtitle = '') {
      // Fallback subtitle if not provided
      const sub = subtitle || 'Try adjusting your keywords, duration, or date queries.';
      return `
        <div class="empty-state-container" style="grid-column: 1 / -1; text-align: center; padding: var(--space-4xl) var(--space-xl); border: 1px dashed var(--border); border-radius: var(--radius-lg); background-color: var(--bg-secondary); margin: var(--space-xl) 0;">
          <!-- Minus/minimize icon -->
          <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto var(--space-md) auto; display:block;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h3 style="font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-xs);">${escapeHtml(message)}</h3>
          <p style="font-size: var(--text-sm); color: var(--text-muted);">${escapeHtml(sub)}</p>
        </div>
      `;
    },

    // ─── 8. ERROR STATE ───
    /**
     * Renders a centered error-state placeholder for failure scenarios.
     * @param {string} [message] - The error message to display
     * @returns {string} HTML string for the error state
     */
    renderErrorState(message = 'Failed to load videos.') {
      return `
        <div class="error-state-container" style="grid-column: 1 / -1; text-align: center; padding: var(--space-4xl) var(--space-xl); border: 1px solid var(--error); border-radius: var(--radius-lg); background-color: rgba(238, 0, 0, 0.05); margin: var(--space-xl) 0; color: var(--error);">
          <!-- Warning triangle icon -->
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto var(--space-md) auto; display:block;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h3 style="font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-xs);">${message}</h3>
          <p style="font-size: var(--text-sm); opacity: 0.8;">Check your connection and try refreshing the browser.</p>
        </div>
      `;
    }
  };

  // ─── THEME ICON SYNC HELPER ───
  /**
   * Updates the visibility of sun/moon theme icons based on the current theme.
   * Shows the sun icon in light mode and the moon icon in dark mode.
   */
  function updateThemeIcons() {
    // Check if the current theme is light
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    // Get all sun and moon icon elements in the DOM
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    
    // Show sun and hide moon in light mode; reverse in dark mode
    sunIcons.forEach(icon => icon.style.display = isLight ? 'block' : 'none');
    moonIcons.forEach(icon => icon.style.display = isLight ? 'none' : 'block');
  }

  // ─── EXPORT ───
  // Expose the Components API globally so any page can use it
  window.Components = Components;
})();
