// Global Utilities, Theme Controller, Router guards and Session Helpers
(function() {
  // 1. Initial Theme setup (checking localStorage or defaults)
  const currentTheme = localStorage.getItem('site-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  // 2. Authentication Check / Route Guard
  const path = window.location.pathname.replace(/\\/g, '/');
  const isAdminPage = path.includes('/admin/');
  const isLoggedIn = localStorage.getItem('admin-session') !== null;

  if (isAdminPage && !isLoggedIn) {
    const redirectPath = '../login.html';
    window.location.href = redirectPath;
  }

  // 3. Document Ready listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Setup Theme togglers on page
    setupThemeToggle();

    // Setup Keyboard Shortcuts
    // '/' key focuses search bar, 'ESC' closes active modals
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        const searchInput = document.querySelector('#global-search-input, .search-bar-container input, #search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
        }
      }
    });

    // Lazy load image implementation
    setupLazyLoading();

    // Global click delegation for video card / data-href navigation
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-href]');
      if (card && !e.target.closest('a')) {
        e.preventDefault();
        window.location.href = card.dataset.href;
      }
    });

    // Admin Sidebar Toggle (Mobile)
    function toggleAdminSidebar(open) {
      const sidebar = document.querySelector('.admin-sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (!sidebar) return;
      if (open) {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    const adminMenuBtn = document.querySelector('.admin-menu-btn');
    if (adminMenuBtn) {
      adminMenuBtn.addEventListener('click', () => toggleAdminSidebar(true));
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.sidebar-overlay') || e.target.closest('.sidebar-close-btn')) {
        toggleAdminSidebar(false);
      }
    });
  });

  // Theme toggle utility (uses event delegation for dynamically injected navbar)
  function setupThemeToggle() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-toggle');
      if (!btn) return;
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('site-theme', nextTheme);
      window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: nextTheme } }));
    });
  }

  let lazyImageObserver = null;

  function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      lazyImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const lazyImage = entry.target;
            if (lazyImage.dataset.src) {
              lazyImage.src = lazyImage.dataset.src;
            }
            lazyImageObserver.unobserve(lazyImage);
          }
        });
      });
    }
    observeLazyImages();
  }

  function observeLazyImages() {
    const images = document.querySelectorAll('img.lazy');
    if (lazyImageObserver) {
      images.forEach(img => lazyImageObserver.observe(img));
    } else {
      images.forEach(img => {
        if (img.dataset.src) img.src = img.dataset.src;
      });
    }
  }

  // Expose so dynamic content can re-trigger lazy observation
  window.refreshLazyLoading = observeLazyImages;

  // Global exports
  window.App = {
    // Parse query params (compatibility with file://)
    getQueryParams() {
      const raw = window.location.search || window.location.hash.split('?')[1] || '';
      if (!raw || raw.length < 2) return {};
      const search = raw.charAt(0) === '?' ? raw : '?' + raw;
      const params = {};
      const pairs = search.substring(1).split('&');
      for (let i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        const pair = pairs[i].split('=');
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
      }
      return params;
    },

    // Check if video is liked
    isVideoLiked(videoId) {
      const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
      return likedVideos.includes(videoId);
    },

    // Toggle video liked state in localStorage
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

    // Get reactive video database (combines memory modifications on top of MockData)
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
        // Corruption – re-seed from MOCK and warn
        console.warn('Video database corrupted, re-seeding from defaults.');
        this.showToast('Video data was corrupted. Default data restored.', 'warning');
        const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
        localStorage.setItem('db-videos', JSON.stringify(mockCopy));
        return mockCopy;
      } catch (e) {
        console.warn('Video database parse error, re-seeding from defaults.');
        this.showToast('Video data was corrupted. Default data restored.', 'warning');
        const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
        localStorage.setItem('db-videos', JSON.stringify(mockCopy));
        return mockCopy;
      }
    },

    // Save video database
    saveVideos(videosList) {
      localStorage.setItem('db-videos', JSON.stringify(videosList));
    },

    // Get tags (merges MOCK_TAGS with localStorage custom tags)
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

    // Save tags
    saveTags(tagsList) {
      localStorage.setItem('db-tags', JSON.stringify(tagsList));
    },

    // Toast notification manager
    showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      const icon = type === 'error' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : type === 'warning'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        : type === 'info'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

      toast.innerHTML = `
        ${icon}
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close message">&times;</button>
      `;

      container.appendChild(toast);

      // Bind close action
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
      });

      // Auto dismiss
      setTimeout(() => {
        toast.style.animation = 'fadeIn 0.2s';
        toast.style.animationDirection = 'reverse';
        setTimeout(() => toast.remove(), 200);
      }, 3500);
    },

    // Modal Confirmation Wrapper
    showConfirmModal(title, body, onConfirm) {
      const overlay = document.getElementById('confirm-modal-overlay');
      if (!overlay) return;

      // Clone all interactive elements to wipe previous listeners
      const footer = overlay.querySelector('.modal-footer');
      const header = overlay.querySelector('.modal-header');
      if (footer) {
        const newFooter = footer.cloneNode(true);
        footer.parentNode.replaceChild(newFooter, footer);
      }
      if (header) {
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);
      }

      const titleEl = overlay.querySelector('.modal-title');
      const bodyEl = overlay.querySelector('.modal-body');
      const confirmBtn = overlay.querySelector('.confirm-modal-btn');
      const cancelBtn = overlay.querySelector('.cancel-modal-btn');
      const closeBtn = overlay.querySelector('.modal-close');

      titleEl.innerText = title;
      bodyEl.innerText = body;

      const cleanUp = () => {
        overlay.classList.remove('active');
      };

      confirmBtn.addEventListener('click', () => {
        onConfirm();
        cleanUp();
      });

      if (cancelBtn) cancelBtn.addEventListener('click', cleanUp);
      if (closeBtn) closeBtn.addEventListener('click', cleanUp);

      overlay.classList.add('active');
    }
  };
})();
