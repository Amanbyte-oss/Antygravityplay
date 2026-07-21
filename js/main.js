// ─── Global Utilities, Theme Controller, Router guards and Session Helpers ───
// This IIFE (Immediately Invoked Function Expression) runs on load to initialize
// theme, guard admin routes, set up keyboard shortcuts, lazy loading, theme toggling,
// click delegation, admin sidebar controls, and export the global App object.
(function() {

  // ─── THEME SETUP ───
  // Read the saved theme preference from localStorage, defaulting to 'dark'
  const currentTheme = localStorage.getItem('site-theme') || 'dark';
  // Apply the theme to the root <html> element so CSS variables cascade
  document.documentElement.setAttribute('data-theme', currentTheme);

  // ─── ROUTE GUARD ───
  // Get the current URL path and normalize backslashes to forward slashes
  const path = window.location.pathname.replace(/\\/g, '/');
  // Check if the current page is inside the /admin/ directory
  const isAdminPage = path.includes('/admin/');
  // Check if an admin session token exists in localStorage
  const isLoggedIn = localStorage.getItem('admin-session') !== null;

  // If this is an admin page and no session is found, redirect to login
  if (isAdminPage && !isLoggedIn) {
    // Path to the login page relative to the admin directory
    const redirectPath = '../login.html';
    // Perform the redirect
    window.location.href = redirectPath;
  }

  // ─── DOM CONTENT LOADED ───
  // Wait for the DOM to be fully parsed before attaching event listeners
  document.addEventListener('DOMContentLoaded', () => {

    // Attach the theme toggle handler (uses event delegation)
    setupThemeToggle();

    // ─── KEYBOARD SHORTCUTS ───
    // Pressing '/' focuses the search bar; pressing 'Escape' closes modals
    document.addEventListener('keydown', (e) => {
      // Check if '/' was pressed and the active element is not an input field
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        // Select the search input using multiple possible selectors
        const searchInput = document.querySelector('#global-search-input, .search-bar-container input, #search-input');
        if (searchInput) {
          // Prevent the '/' character from being typed
          e.preventDefault();
          // Move focus to the search input
          searchInput.focus();
        }
      }
      // Check if Escape was pressed
      if (e.key === 'Escape') {
        // Find any currently active modal overlay
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          // Deactivate the modal by removing the 'active' class
          activeModal.classList.remove('active');
        }
      }
    });

    // ─── LAZY LOADING ───
    // Initialize the IntersectionObserver-based lazy loading for images
    setupLazyLoading();

    // ─── GLOBAL CLICK DELEGATION ───
    // Listen for any click on the document and navigate to data-href targets
    document.addEventListener('click', (e) => {
      // Find the closest ancestor with a data-href attribute
      const card = e.target.closest('[data-href]');
      // Only navigate if click is not inside an <a> tag (to avoid double navigation)
      if (card && !e.target.closest('a')) {
        // Prevent any default behavior
        e.preventDefault();
        // Navigate to the URL stored in data-href
        window.location.href = card.dataset.href;
      }
    });

    // ─── ADMIN SIDEBAR TOGGLE (Mobile) ───
    /**
     * Opens or closes the admin sidebar and its overlay backdrop.
     * @param {boolean} open - true to open, false to close
     */
    function toggleAdminSidebar(open) {
      // Get the sidebar element
      const sidebar = document.querySelector('.admin-sidebar');
      // Get the overlay backdrop element
      const overlay = document.querySelector('.sidebar-overlay');
      // Exit if sidebar doesn't exist
      if (!sidebar) return;
      if (open) {
        // Show the sidebar and overlay
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        // Prevent body scrolling while sidebar is open
        document.body.style.overflow = 'hidden';
      } else {
        // Hide the sidebar and overlay
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        // Restore body scrolling
        document.body.style.overflow = '';
      }
    }

    // Find the admin menu button (hamburger) in the DOM
    const adminMenuBtn = document.querySelector('.admin-menu-btn');
    // If the button exists, bind it to open the sidebar
    if (adminMenuBtn) {
      adminMenuBtn.addEventListener('click', () => toggleAdminSidebar(true));
    }

    // Global click listener to close sidebar when clicking overlay or close button
    document.addEventListener('click', (e) => {
      // Check if the click target is the overlay or the close button
      if (e.target.closest('.sidebar-overlay') || e.target.closest('.sidebar-close-btn')) {
        // Close the sidebar
        toggleAdminSidebar(false);
      }
    });
  });

  // ─── THEME TOGGLE UTILITY ───
  // Uses event delegation to handle theme toggle clicks even on dynamically injected elements
  function setupThemeToggle() {
    document.addEventListener('click', (e) => {
      // Find the closest theme-toggle button ancestor of the click target
      const btn = e.target.closest('.theme-toggle');
      // Ignore clicks that don't originate from a theme toggle button
      if (!btn) return;
      // Read the current theme; default to 'dark' if not set
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      // Toggle between dark and light
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      // Apply the new theme to the root element
      document.documentElement.setAttribute('data-theme', nextTheme);
      // Persist the preference in localStorage
      localStorage.setItem('site-theme', nextTheme);
      // Dispatch a custom event so other components can react to the theme change
      window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: nextTheme } }));
    });
  }

  // ─── LAZY LOADING SETUP ───
  // Holds the IntersectionObserver instance for lazy-loading images
  let lazyImageObserver = null;

  /**
   * Initializes the lazy loading system using IntersectionObserver.
   * Falls back to immediately loading images if the API is unavailable.
   */
  function setupLazyLoading() {
    // Check if the browser supports IntersectionObserver
    if ('IntersectionObserver' in window) {
      // Create an observer that triggers when images enter the viewport
      lazyImageObserver = new IntersectionObserver((entries, observer) => {
        // Process each observed entry
        entries.forEach(entry => {
          // Only act when the image becomes visible
          if (entry.isIntersecting) {
            // Get the image element
            const lazyImage = entry.target;
            // If there's a data-src attribute, swap it to the real src
            if (lazyImage.dataset.src) {
              lazyImage.src = lazyImage.dataset.src;
            }
            // Stop observing this image once it's loaded
            lazyImageObserver.unobserve(lazyImage);
          }
        });
      });
    }
    // Start observing any existing lazy images in the DOM
    observeLazyImages();
  }

  /**
   * Finds all images with the 'lazy' class and starts observing them,
   * or loads them immediately if IntersectionObserver is not supported.
   */
  function observeLazyImages() {
    // Select all images with the 'lazy' CSS class
    const images = document.querySelectorAll('img.lazy');
    if (lazyImageObserver) {
      // Observer exists: start observing each image
      images.forEach(img => lazyImageObserver.observe(img));
    } else {
      // Fallback: immediately load images by copying data-src to src
      images.forEach(img => {
        if (img.dataset.src) img.src = img.dataset.src;
      });
    }
  }

  // Expose the observe function globally so dynamic content can re-trigger lazy observation
  window.refreshLazyLoading = observeLazyImages;

  // ─── GLOBAL APP API EXPORTS ───
  // The `window.App` object provides shared utilities for all pages
  window.App = {

    // ─── QUERY PARAM PARSER ───
    /**
     * Parses URL query parameters into a key-value object.
     * Supports both standard ?query and hash-based ?query for file:// protocol compatibility.
     * @returns {Object} Key-value pairs of query parameters
     */
    getQueryParams() {
      // Try to get query string from search or from hash (for file:// support)
      const raw = window.location.search || window.location.hash.split('?')[1] || '';
      // Return empty object if nothing is found or string is too short
      if (!raw || raw.length < 2) return {};
      // Ensure the string starts with '?'
      const search = raw.charAt(0) === '?' ? raw : '?' + raw;
      // Object to hold parsed key-value pairs
      const params = {};
      // Split by '&' to get individual parameter pairs
      const pairs = search.substring(1).split('&');
      // Iterate over each pair
      for (let i = 0; i < pairs.length; i++) {
        // Skip empty strings
        if (!pairs[i]) continue;
        // Split on '=' to separate key and value
        const pair = pairs[i].split('=');
        // Decode URI components and store in the params object
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
      }
      return params;
    },

    // ─── LIKED VIDEO CHECK ───
    /**
     * Checks if a video has been liked by the user.
     * @param {string} videoId - The ID of the video to check
     * @returns {boolean} True if the video is liked, false otherwise
     */
    isVideoLiked(videoId) {
      // Retrieve the liked videos array from localStorage, default to empty array
      const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
      // Return whether the video ID exists in the array
      return likedVideos.includes(videoId);
    },

    // ─── LIKE TOGGLE ───
    /**
     * Toggles the liked state of a video in localStorage.
     * @param {string} videoId - The ID of the video to toggle
     * @returns {boolean} The new liked state (true = liked, false = unliked)
     */
    toggleLikeVideo(videoId) {
      // Load existing liked videos from localStorage
      let likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]');
      // Flag to track the new state
      let isLikedNow = false;
      // Check if the video is already liked
      if (likedVideos.includes(videoId)) {
        // Remove from liked list (unlike)
        likedVideos = likedVideos.filter(id => id !== videoId);
      } else {
        // Add to liked list (like)
        likedVideos.push(videoId);
        isLikedNow = true;
      }
      // Persist the updated array back to localStorage
      localStorage.setItem('liked-videos', JSON.stringify(likedVideos));
      // Return the new state
      return isLikedNow;
    },

    // ─── VIDEO DATABASE ACCESS ───
    /**
     * Retrieves the video database from localStorage.
     * On first access or corruption, seeds from window.MOCK_VIDEOS.
     * @returns {Array} Array of video objects
     */
    getVideos() {
      // Read raw video data from localStorage
      let raw = localStorage.getItem('db-videos');
      // If no data exists yet, seed from mock data
      if (!raw) {
        // Deep clone the mock videos to avoid mutating the original
        const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
        // Store the clone in localStorage
        localStorage.setItem('db-videos', JSON.stringify(mockCopy));
        return mockCopy;
      }
      try {
        // Attempt to parse the stored JSON
        let parsed = JSON.parse(raw);
        // If it's a valid non-empty array, return it
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        // If it's an empty array, return it as-is
        if (Array.isArray(parsed)) return [];
        // Data is corrupted (not an array) - re-seed from defaults
        // Notify the user with a warning toast
        this.showToast('Video data was corrupted. Default data restored.', 'warning');
        const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
        localStorage.setItem('db-videos', JSON.stringify(mockCopy));
        return mockCopy;
      } catch (e) {
        // JSON parse error - re-seed from defaults
        this.showToast('Video data was corrupted. Default data restored.', 'warning');
        const mockCopy = JSON.parse(JSON.stringify(window.MOCK_VIDEOS));
        localStorage.setItem('db-videos', JSON.stringify(mockCopy));
        return mockCopy;
      }
    },

    // ─── VIDEO DATABASE SAVE ───
    /**
     * Persists the video array to localStorage and dispatches an update event.
     * @param {Array} videosList - Array of video objects to save
     */
    saveVideos(videosList) {
      // Stringify and store the full video list
      localStorage.setItem('db-videos', JSON.stringify(videosList));
      // Dispatch a custom event to notify other components of the update
      window.dispatchEvent(new CustomEvent('videosupdated'));
    },

    // ─── TAGS ACCESS ───
    /**
     * Retrieves the tags array from localStorage, seeding from MOCK_TAGS if needed.
     * @returns {Array} Array of tag objects
     */
    getTags() {
      // Read raw tags from localStorage
      let raw = localStorage.getItem('db-tags');
      // If no tags exist yet, seed from mock data
      if (!raw) {
        localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
        return window.MOCK_TAGS;
      }
      try {
        // Attempt to parse stored JSON
        let parsed = JSON.parse(raw);
        // If valid non-empty array, return it
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        // Invalid data - re-seed
        localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
        return window.MOCK_TAGS;
      } catch (e) {
        // Parse error - re-seed
        localStorage.setItem('db-tags', JSON.stringify(window.MOCK_TAGS));
        return window.MOCK_TAGS;
      }
    },

    // ─── TAGS SAVE ───
    /**
     * Persists the tags array to localStorage.
     * @param {Array} tagsList - Array of tag objects to save
     */
    saveTags(tagsList) {
      localStorage.setItem('db-tags', JSON.stringify(tagsList));
    },

    // ─── TOAST NOTIFICATION MANAGER ───
    /**
     * Displays a dismissible toast notification at the top of the page.
     * @param {string} message - The text message to display
     * @param {string} type - The toast type: 'success', 'error', 'warning', or 'info'
     */
    showToast(message, type = 'success') {
      // Find the toast container element in the DOM
      const container = document.getElementById('toast-container');
      // Exit silently if the container doesn't exist
      if (!container) return;

      // Create the toast div element
      const toast = document.createElement('div');
      // Set the class based on type for styling
      toast.className = `toast toast-${type}`;
      
      // Choose an SVG icon based on the toast type
      const icon = type === 'error' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : type === 'warning'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        : type === 'info'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

      // Build the toast HTML with icon, message, and close button
      toast.innerHTML = `
        ${icon}
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close message">&times;</button>
      `;

      // Append the toast to the container
      container.appendChild(toast);

      // ─── BIND CLOSE ACTION ───
      // When the close button is clicked, immediately remove the toast
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
      });

      // ─── AUTO DISMISS ───
      // After 3.5 seconds, animate the toast out and then remove it
      setTimeout(() => {
        // Set animation to reverse (fade out)
        toast.style.animation = 'fadeIn 0.2s';
        toast.style.animationDirection = 'reverse';
        // Wait for the animation to finish, then remove the element
        setTimeout(() => toast.remove(), 200);
      }, 3500);
    },

    // ─── CONFIRMATION MODAL ───
    /**
     * Shows a modal confirmation dialog with a customizable title, body, and callback.
     * Clones header/footer to wipe any previous event listeners.
     * @param {string} title - The modal title text
     * @param {string} body - The modal body text
     * @param {function} onConfirm - Callback function executed when confirmed
     */
    showConfirmModal(title, body, onConfirm) {
      // Find the confirmation modal overlay in the DOM
      const overlay = document.getElementById('confirm-modal-overlay');
      // Exit if the modal element doesn't exist
      if (!overlay) return;

      // ─── CLONE INTERACTIVE ELEMENTS ───
      // Clone footer and header to remove any previously attached event listeners
      const footer = overlay.querySelector('.modal-footer');
      const header = overlay.querySelector('.modal-header');
      if (footer) {
        // Deep clone the footer
        const newFooter = footer.cloneNode(true);
        // Replace the original with the clone (orphans old listeners)
        footer.parentNode.replaceChild(newFooter, footer);
      }
      if (header) {
        // Deep clone the header
        const newHeader = header.cloneNode(true);
        // Replace the original with the clone
        header.parentNode.replaceChild(newHeader, header);
      }

      // Get references to modal elements (these refer to the newly cloned ones)
      const titleEl = overlay.querySelector('.modal-title');
      const bodyEl = overlay.querySelector('.modal-body');
      const confirmBtn = overlay.querySelector('.confirm-modal-btn');
      const cancelBtn = overlay.querySelector('.cancel-modal-btn');
      const closeBtn = overlay.querySelector('.modal-close');

      // Set the title and body text
      titleEl.innerText = title;
      bodyEl.innerText = body;

      // Helper function to close the modal
      const cleanUp = () => {
        overlay.classList.remove('active');
      };

      // Bind the confirm button to execute the callback then close
      confirmBtn.addEventListener('click', () => {
        onConfirm();
        cleanUp();
      });

      // Bind cancel and close buttons to simply close the modal
      if (cancelBtn) cancelBtn.addEventListener('click', cleanUp);
      if (closeBtn) closeBtn.addEventListener('click', cleanUp);

      // Show the modal by adding the 'active' class
      overlay.classList.add('active');
    }
  };
})();
