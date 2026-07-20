// Reusable UI components injection layer
(function() {
  const isInsideAdmin = window.location.pathname.includes('/admin/');
  const rootPrefix = isInsideAdmin ? '../' : './';
  const adminPrefix = isInsideAdmin ? './' : './admin/';

  const Components = {
    // 1. PUBLIC NAVBAR
    injectNavbar(activePage = '') {
      const container = document.getElementById('navbar-container');
      if (!container) return;

      const categories = window.App.getCategories();
      const tags = window.App.getTags();

      // Generate Categories Dropdown items
      const catDropdownItems = categories.map(cat => 
        `<li><a href="${rootPrefix}category.html?id=${cat.id}">${cat.name}</a></li>`
      ).join('');

      // Generate Tags Dropdown items
      const tagDropdownItems = tags.slice(0, 10).map(tag => 
        `<li><a href="${rootPrefix}tag.html?id=${tag.id}">#${tag.name}</a></li>`
      ).join('');

      const isLoggedIn = localStorage.getItem('admin-session') !== null;
      const adminLink = isLoggedIn 
        ? `<a href="${adminPrefix}index.html" class="nav-link ${activePage === 'admin' ? 'active' : ''}">Dashboard</a>`
        : `<a href="${rootPrefix}login.html" class="nav-link ${activePage === 'login' ? 'active' : ''}">Admin Login</a>`;

      container.innerHTML = `
        <div class="navbar">
          <div class="nav-left">
            <a href="${rootPrefix}index.html" class="logo" aria-label="Go to Home">
              <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
              </svg>
              <span>Antigravity Play</span>
            </a>
            <nav class="nav-menu" aria-label="Main Navigation">
              <a href="${rootPrefix}index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Browse</a>
              <div class="nav-link dropdown-container" style="position:relative; cursor:pointer;">
                Categories ▾
                <ul class="dropdown-menu">
                  ${catDropdownItems}
                </ul>
              </div>
              <div class="nav-link dropdown-container" style="position:relative; cursor:pointer;">
                Tags ▾
                <ul class="dropdown-menu">
                  ${tagDropdownItems}
                </ul>
              </div>
            </nav>
          </div>
          
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

          <div class="nav-right">
            ${adminLink}
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
            <button class="hamburger" aria-label="Open mobile menu" aria-expanded="false">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      `;

      // Inline styles for dropdown menus
      const style = document.createElement('style');
      style.innerHTML = `
        .dropdown-container:hover .dropdown-menu { display: block; }
        .dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          min-width: 180px;
          list-style: none;
          padding: var(--space-sm) 0;
          margin-top: var(--space-xs);
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
      document.head.appendChild(style);

      // Adjust theme icons on load
      updateThemeIcons();
      window.addEventListener('themechanged', updateThemeIcons);
    },

    // 2. ADMIN SIDEBAR
    injectAdminSidebar(activePage = '') {
      const container = document.getElementById('sidebar-container');
      if (!container) return;

      const userName = localStorage.getItem('admin-name') || 'Administrator';

      container.innerHTML = `
        <div class="admin-sidebar" aria-label="Admin Navigation">
          <div class="sidebar-header">
            <a href="${rootPrefix}index.html" class="logo">
              <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
              </svg>
              <span>Antigravity Play</span>
            </a>
          </div>
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
          </ul>
          
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div class="sidebar-user-avatar">
                ${userName.split(' ').map(n=>n[0]).join('').toUpperCase()}
              </div>
              <div class="sidebar-user-info">
                <span class="sidebar-user-name">${userName}</span>
                <span class="sidebar-user-role">Administrator</span>
              </div>
            </div>
            <button id="logout-btn" class="btn btn-secondary" style="width: 100%; border-radius: var(--radius-sm); padding: var(--space-sm) var(--space-md); text-align: center;">
              Log Out
            </button>
          </div>
        </div>
      `;

      // Log out logic
      document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('admin-session');
        localStorage.removeItem('admin-name');
        window.location.href = `${rootPrefix}index.html`;
      });
    },

    // 3. FOOTER
    injectFooter() {
      const container = document.getElementById('footer-container');
      if (!container) return;

      container.innerHTML = `
        <div class="footer-wrapper">
          <div class="container footer">
            <div class="footer-col footer-brand">
              <div class="logo">
                <svg class="logo-icon" width="28" height="28" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="currentColor"></circle>
                  <polygon points="10,8 16,12 10,16" fill="#000"></polygon>
                </svg>
                <span>Antigravity Play</span>
              </div>
              <p>A high-performance cinematic video sharing network built entirely on design systems from Spotify and Vercel.</p>
            </div>
            <div class="footer-col">
              <h4>Browse</h4>
              <ul>
                <li><a href="${rootPrefix}index.html">Trending</a></li>
                <li><a href="${rootPrefix}search.html">Search</a></li>
                <li><a href="${rootPrefix}index.html">Categories</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>System</h4>
              <ul>
                <li><a href="${rootPrefix}login.html">Admin Portal</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener">Source Code</a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Use</a></li>
              </ul>
            </div>
          </div>
          <div class="container footer-bottom">
            <span>&copy; 2026 Antigravity. All rights reserved.</span>
            <span>Handcrafted in India with Vanilla JS</span>
          </div>
        </div>
      `;
    },

    // 4. VIDEO CARD
    renderVideoCard(video) {
      const isLiked = window.App.isVideoLiked(video.id);
      return `
        <article class="video-card reveal-on-scroll" data-video-id="${video.id}" onclick="window.location.href='${rootPrefix}watch.html?id=${video.id}'">
          <div class="thumbnail-container">
            <img class="lazy" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect width='100%25' height='100%25' fill='%231f1f1f'/%3E%3C/svg%3E" data-src="${video.thumbnail}" alt="${video.title} Preview">
            <span class="duration-badge">${video.duration}</span>
            <button class="play-hover-btn" aria-label="Play video" onclick="event.stopPropagation(); window.location.href='${rootPrefix}watch.html?id=${video.id}'">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="8,5 19,12 8,19"></polygon>
              </svg>
            </button>
          </div>
          <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <div class="video-meta">
              <div class="video-creator">${video.creator}</div>
              <div>${Number(video.views).toLocaleString()} views &bull; ${video.publishDate}</div>
            </div>
          </div>
        </article>
      `;
    },

    // 5. CATEGORY CARD (Spotify Style Pill card)
    renderCategoryCard(cat) {
      return `
        <a href="${rootPrefix}category.html?id=${cat.id}" class="category-pill" style="border-left: 4px solid ${cat.color};">
          ${cat.name}
        </a>
      `;
    },

    // 6. TAG CARD
    renderTagCard(tag) {
      return `
        <a href="${rootPrefix}tag.html?id=${tag.id}" class="tag-badge">
          #${tag.name}
        </a>
      `;
    },

    // 7. SKELETON LOADER
    renderSkeletonLoader() {
      return Array(6).fill(0).map(() => `
        <div class="video-card">
          <div class="thumbnail-container skeleton" style="aspect-ratio: 16/9; margin-bottom: var(--space-md);"></div>
          <div style="display:flex; flex-direction:column; gap: var(--space-sm);">
            <div class="skeleton" style="height: 16px; width: 85%;"></div>
            <div class="skeleton" style="height: 12px; width: 60%;"></div>
            <div class="skeleton" style="height: 10px; width: 40%; margin-top: 4px;"></div>
          </div>
        </div>
      `).join('');
    },

    // 8. EMPTY STATE
    renderEmptyState(message = 'No videos found matching your filters.') {
      return `
        <div class="empty-state-container" style="grid-column: 1 / -1; text-align: center; padding: var(--space-4xl) var(--space-xl); border: 1px dashed var(--border); border-radius: var(--radius-lg); background-color: var(--bg-secondary); margin: var(--space-xl) 0;">
          <svg width="48" height="48" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24" style="margin: 0 auto var(--space-md) auto; display:block;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <h3 style="font-size: var(--text-lg); font-weight: 600; margin-bottom: var(--space-xs);">${message}</h3>
          <p style="font-size: var(--text-sm); color: var(--text-muted);">Try adjusting your keywords, duration, or date queries.</p>
        </div>
      `;
    },

    // 9. ERROR STATE
    renderErrorState(message = 'Failed to load videos.') {
      return `
        <div class="error-state-container" style="grid-column: 1 / -1; text-align: center; padding: var(--space-4xl) var(--space-xl); border: 1px solid var(--error); border-radius: var(--radius-lg); background-color: rgba(238, 0, 0, 0.05); margin: var(--space-xl) 0; color: var(--error);">
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

  // Internal theme toggle visual sync helper
  function updateThemeIcons() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');
    
    sunIcons.forEach(icon => icon.style.display = isLight ? 'block' : 'none');
    moonIcons.forEach(icon => icon.style.display = isLight ? 'none' : 'block');
  }

  // Export Components
  window.Components = Components;
})();
