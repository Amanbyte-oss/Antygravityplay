// ============================================================
// Settings.js - Admin settings panel: theme, font size, accent color,
// notifications, danger zone (clear data), import/export
// ============================================================

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Inject the admin sidebar, highlighting "settings" as active
  window.Components.injectAdminSidebar('settings');

  // Initialize tab switching
  initTabs();
  // Load all saved settings from localStorage and apply them
  loadSettings();
  // Bind event listeners to all settings controls
  bindSettingsEvents();
  // Bind the danger zone (clear all data) modal interactions
  bindDangerZone();
  // Bind the import/export buttons
  bindImportExport();
});

// ============================================================
// Set up tab switching between settings panels
// ============================================================
/**
 * Attaches click handlers to tab buttons that toggle active tab/panel.
 * Also reads the URL hash (#general, #appearance, etc.) to auto-select a tab.
 */
function initTabs() {
  const tabs = document.querySelectorAll('.tabs-tab');
  const panels = document.querySelectorAll('.tabs-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs and panels
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));

      // Activate the clicked tab and its corresponding panel
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const target = tab.dataset.tab;  // e.g., "general", "appearance"
      var panel = document.getElementById('panel-' + target); if (panel) panel.classList.add('active');
      // Update the URL hash so the tab can be bookmarked
      window.location.hash = '#' + target;
    });
  });

  // If the URL contains a hash, auto-click the matching tab
  const hash = window.location.hash.slice(1);
  if (hash) {
    const targetTab = document.querySelector(`.tabs-tab[data-tab="${hash}"]`);
    if (targetTab) targetTab.click();
  }
}

// ============================================================
// Load all saved settings from localStorage and apply to UI
// ============================================================
/**
 * Reads 'admin-settings', 'admin-profile', and 'site-theme' from localStorage
 * and applies the values to the corresponding form controls and CSS custom properties.
 */
function loadSettings() {
  // Load main settings object
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem('admin-settings') || '{}'); } catch (_) {}

  // -------- Theme selection --------
  // Get the current theme from localStorage, defaulting to 'dark'
  const currentTheme = localStorage.getItem('site-theme') || 'dark';
  const themeToShow = settings.theme || currentTheme;
  // Find the radio button matching the saved theme and select it
  const themeRadio = document.querySelector(`input[name="theme"][value="${themeToShow}"]`);
  if (themeRadio) {
    themeRadio.checked = true;
    // Update the visual radio card styling
    document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
    themeRadio.closest('.theme-radio-card').classList.add('selected');
  }

  // -------- Reduced motion --------
  // If reduced motion is enabled, set CSS transitions to 0s immediately
  if (settings.reducedMotion) {
    document.documentElement.style.setProperty('--transition-base', '0s');
    document.documentElement.style.setProperty('--transition-fast', '0s');
  }

  // -------- Accent color --------
  // Highlight the saved accent color swatch
  if (settings.accentColor) {
    document.querySelectorAll('.accent-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === settings.accentColor);
    });
  }

  // -------- Font size --------
  // Restore the font size slider position and preview
  if (settings.fontSize !== undefined) {
    // Map string names to slider values if needed
    const sizeMap = { small: '0', medium: '1', large: '2' };
    const val = sizeMap[settings.fontSize] !== undefined ? sizeMap[settings.fontSize] : String(settings.fontSize);
    var fontSizeSlider = document.getElementById('font-size-slider'); if (fontSizeSlider) fontSizeSlider.value = val;
    updateFontSizePreview(val);  // Apply the font size to CSS variables
  }

  // -------- Reduced motion toggle --------
  if (settings.reducedMotion !== undefined) {
    var reducedMotionToggle = document.getElementById('reduced-motion-toggle'); if (reducedMotionToggle) reducedMotionToggle.checked = settings.reducedMotion;
  }

  // -------- Maintenance mode --------
  try {
    var maintToggle = document.getElementById('maintenance-toggle');
    if (maintToggle) {
      var maintEnabled = localStorage.getItem('maintenance_mode') === 'true';
      maintToggle.checked = maintEnabled;
    }
  } catch(_) {}
  try {
    var etaEl = document.getElementById('maintenance-eta-input');
    if (etaEl) etaEl.value = localStorage.getItem('maintenance_eta') || '';
  } catch(_) {}
  // Also try loading from Supabase
  if (window.SupabaseSettings) {
    (async function() {
      try {
        var sbMaint = await window.SupabaseSettings.get('maintenance_mode');
        if (sbMaint !== null) {
          try { localStorage.setItem('maintenance_mode', sbMaint); } catch(_) {}
          var mt = document.getElementById('maintenance-toggle');
          if (mt) mt.checked = sbMaint === 'true';
        }
      } catch(_) {}
      try {
        var sbEta = await window.SupabaseSettings.get('maintenance_eta');
        if (sbEta !== null) {
          try { localStorage.setItem('maintenance_eta', sbEta); } catch(_) {}
          var ei = document.getElementById('maintenance-eta-input');
          if (ei) ei.value = sbEta;
        }
      } catch(_) {}
    })();
  }

}

// ============================================================
// Bind event listeners to all settings controls
// ============================================================
/**
 * Attaches change/click/input handlers for theme radios, accent swatches,
 * font size slider, reduced motion toggle, notification toggles,
 * and syncs with external theme changes.
 */
function bindSettingsEvents() {
  // -------- Theme radio buttons --------
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Update visual card selection
      document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.theme-radio-card').classList.add('selected');
      saveSetting('theme', radio.value);  // Persist the theme choice

      if (radio.value === 'system') {
        // "System" mode: detect the user's OS preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('site-theme', theme);
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
      } else {
        // Apply the selected theme directly
        document.documentElement.setAttribute('data-theme', radio.value);
        localStorage.setItem('site-theme', radio.value);
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: radio.value } }));
      }
    });
  });

  // -------- Accent color swatches --------
  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      // Deselect all swatches, then select the clicked one
      document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      saveSetting('accentColor', swatch.dataset.color);
      applyAccentColor(swatch.dataset.color);  // Apply to CSS variables
    });
  });

  // -------- Font size slider --------
  var fontSizeSlider = document.getElementById('font-size-slider');
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', function() {
      updateFontSizePreview(this.value);  // Update preview immediately
      saveSetting('fontSize', this.value);  // Persist
    });
  }

  // -------- Reduced motion toggle --------
  var reducedMotionToggle = document.getElementById('reduced-motion-toggle');
  if (reducedMotionToggle) {
    reducedMotionToggle.addEventListener('change', function() {
      saveSetting('reducedMotion', this.checked);
      // If enabled, set transitions to 0s instantly; otherwise reset to defaults
      document.documentElement.style.setProperty('--transition-base', this.checked ? '0s' : '');
      document.documentElement.style.setProperty('--transition-fast', this.checked ? '0s' : '');
    });
  }

  // -------- Maintenance mode save button --------
  var maintSaveBtn = document.getElementById('save-maintenance-btn');
  if (maintSaveBtn) {
    maintSaveBtn.addEventListener('click', async function() {
      var toggle = document.getElementById('maintenance-toggle');
      var etaInput = document.getElementById('maintenance-eta-input');
      var enabled = toggle ? toggle.checked : false;
      var eta = etaInput ? etaInput.value.trim() : '';
      try { localStorage.setItem('maintenance_mode', String(enabled)); } catch(_) {}
      try { localStorage.setItem('maintenance_eta', eta); } catch(_) {}
      if (window.SupabaseSettings) {
        await window.SupabaseSettings.set('maintenance_mode', String(enabled));
        await window.SupabaseSettings.set('maintenance_eta', eta);
      }
      window.App.showToast(enabled ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
    });
  }

  // -------- Sync theme radio cards when theme is changed externally (e.g., navbar toggle) --------
  window.addEventListener('themechanged', (e) => {
    const theme = e.detail && e.detail.theme;
    if (!theme) return;
    // Find and check the radio button matching the new theme
    const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (radio) {
      radio.checked = true;
      document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.theme-radio-card').classList.add('selected');
      saveSetting('theme', theme);
    }
  });
}

// ============================================================
// Update font size preview in real-time as the slider moves
// ============================================================
/**
 * Maps slider value (0, 1, 2) to a font size (14px, 16px, 18px) and
 * applies it via CSS custom properties across all text size tokens.
 * Also updates the label display.
 * @param {string} val - Slider value as a string ("0", "1", or "2")
 */
function updateFontSizePreview(val) {
  const sizes = ['14px', '16px', '18px'];
  const labels = ['Small', 'Medium', 'Large'];
  const idx = parseInt(val, 10);
  if (isNaN(idx) || idx < 0 || idx > 2) return;
  // Update all font-size CSS custom properties
  ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl'].forEach(prop => {
    document.documentElement.style.setProperty(prop, sizes[idx]);
  });
  var fontSizeLabel = document.getElementById('font-size-label'); if (fontSizeLabel) fontSizeLabel.textContent = labels[idx];
}

// ============================================================
// Apply accent color to CSS custom properties
// ============================================================
/**
 * Sets the --accent and --accent-hover CSS variables to the given color.
 * @param {string} color - Hex color string (e.g., "#0070f3")
 */
function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', color);
}

// ============================================================
// Save a single setting key/value to localStorage
// ============================================================
/**
 * Reads the current admin-settings object, updates the given key,
 * and writes it back to localStorage. Handles storage quota errors.
 * @param {string} key   - Setting key (e.g., "theme", "fontSize")
 * @param {*}      value - The value to save
 */
function saveSetting(key, value) {
  try {
    const settings = JSON.parse(localStorage.getItem('admin-settings') || '{}');
    settings[key] = value;
    localStorage.setItem('admin-settings', JSON.stringify(settings));
  } catch (e) {
    window.App.showToast('Unable to save setting. Storage may be full.', 'error');
  }
}

// ============================================================
// Danger Zone - "Clear All Data" modal with confirmation
// ============================================================
/**
 * Sets up the danger zone modal: show/hide, confirmation input
 * (user must type "DELETE" to enable the proceed button),
 * and the actual data clearing action.
 */
function bindDangerZone() {
  // "Clear All Data" button → show the confirmation modal
  var clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      const modal = document.getElementById('danger-modal-overlay');
      if (modal) modal.classList.add('active');
      var confirmInput = document.getElementById('danger-confirm-input'); if (confirmInput) confirmInput.value = '';  // Reset input
      var proceedBtn = document.getElementById('danger-proceed-btn'); if (proceedBtn) proceedBtn.disabled = true;  // Disable proceed
    });
  }

  // Confirmation input: enable proceed only when user types "DELETE"
  var dangerConfirmInput = document.getElementById('danger-confirm-input');
  if (dangerConfirmInput) {
    dangerConfirmInput.addEventListener('input', function() {
      var proceedBtn = document.getElementById('danger-proceed-btn'); if (proceedBtn) proceedBtn.disabled = this.value !== 'DELETE';
    });
  }

  // Cancel button → close modal
  var cancelDangerBtn = document.getElementById('cancel-danger-btn');
  if (cancelDangerBtn) {
    cancelDangerBtn.addEventListener('click', () => {
      var overlay = document.getElementById('danger-modal-overlay'); if (overlay) overlay.classList.remove('active');
    });
  }

  // Modal X close button → close modal
  var dangerModalOverlay = document.getElementById('danger-modal-overlay');
  if (dangerModalOverlay) {
    var modalClose = dangerModalOverlay.querySelector('.modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => {
        dangerModalOverlay.classList.remove('active');
      });
    }
  }

  // Click on backdrop (outside modal content) → close modal
  var dangerModalOverlay2 = document.getElementById('danger-modal-overlay');
  if (dangerModalOverlay2) {
    dangerModalOverlay2.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) dangerModalOverlay2.classList.remove('active');
    });
  }

  // Proceed button → clear all video and tag data, then reload
  var dangerProceedBtn = document.getElementById('danger-proceed-btn');
  if (dangerProceedBtn) {
    dangerProceedBtn.addEventListener('click', () => {
      localStorage.removeItem('db-videos');  // Remove all videos from localStorage
      localStorage.removeItem('db-tags');     // Remove all tags from localStorage
      window.App.showToast('All data cleared successfully. Refreshing...');
      var overlay = document.getElementById('danger-modal-overlay'); if (overlay) overlay.classList.remove('active');
      setTimeout(() => location.reload(), 1000);  // Reload the page after 1 second
    });
  }
}

// ============================================================
// Import/Export - download all data as JSON or upload to restore
// ============================================================
/**
 * Sets up the export button to download all admin data as a JSON file,
 * and the import file input to read and restore data from a JSON file.
 */
function bindImportExport() {
  // -------- Export All Data --------
  var exportAllBtn = document.getElementById('export-all-btn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
      // Collect all data into one object
      const data = {
        videos: window.App.getVideos(),
        tags: JSON.parse(localStorage.getItem('db-tags') || '[]'),
        settings: JSON.parse(localStorage.getItem('admin-settings') || '{}'),
        exportedAt: new Date().toISOString()  // Timestamp of export
      };
      // Create a downloadable Blob and trigger the download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'antigravity-export.json';
      a.click();
      URL.revokeObjectURL(url);  // Clean up the object URL
      window.App.showToast('All data exported.');
    });
  }

  // -------- Import Data --------
  var importFileInput = document.getElementById('import-file-input');
  if (importFileInput) {
    importFileInput.addEventListener('change', function() {
      if (this.files.length === 0) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);  // Parse the uploaded JSON
          // Validate the data structure
          if (!data || typeof data !== 'object') throw new Error('Invalid data');
          // Import videos array if present
          if (data.videos !== undefined) {
            if (!Array.isArray(data.videos)) throw new Error('videos must be an array');
            localStorage.setItem('db-videos', JSON.stringify(data.videos));
          }
          // Import tags array if present
          if (data.tags !== undefined) {
            if (!Array.isArray(data.tags)) throw new Error('tags must be an array');
            localStorage.setItem('db-tags', JSON.stringify(data.tags));
          }
          window.App.showToast('Data imported successfully. Refresh to see changes.');
        } catch (err) {
          // Show a user-friendly error message
          window.App.showToast(err.message === 'Invalid data' || err.message.includes('must be') ? err.message : 'Invalid JSON file.', 'error');
        }
      };
      reader.readAsText(this.files[0]);  // Read file as text
      this.value = '';  // Reset the file input so the same file can be re-selected
    });
  }
}
