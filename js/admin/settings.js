document.addEventListener('DOMContentLoaded', () => {
  window.Components.injectAdminSidebar('settings');

  initTabs();
  loadSettings();
  bindSettingsEvents();
  bindDangerZone();
  bindImportExport();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tabs-tab');
  const panels = document.querySelectorAll('.tabs-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const target = tab.dataset.tab;
      document.getElementById('panel-' + target).classList.add('active');
      window.location.hash = '#' + target;
    });
  });

  const hash = window.location.hash.slice(1);
  if (hash) {
    const targetTab = document.querySelector(`.tabs-tab[data-tab="${hash}"]`);
    if (targetTab) targetTab.click();
  }
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('admin-settings') || '{}');

  const currentTheme = localStorage.getItem('site-theme') || 'dark';
  const themeToShow = settings.theme || currentTheme;
  const themeRadio = document.querySelector(`input[name="theme"][value="${themeToShow}"]`);
  if (themeRadio) {
    themeRadio.checked = true;
    document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
    themeRadio.closest('.theme-radio-card').classList.add('selected');
  }

  if (settings.reducedMotion) {
    document.documentElement.style.setProperty('--transition-base', '0s');
    document.documentElement.style.setProperty('--transition-fast', '0s');
  }

  if (settings.accentColor) {
    document.querySelectorAll('.accent-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === settings.accentColor);
    });
  }

  if (settings.fontSize !== undefined) {
    const sizeMap = { small: '0', medium: '1', large: '2' };
    const val = sizeMap[settings.fontSize] !== undefined ? sizeMap[settings.fontSize] : String(settings.fontSize);
    document.getElementById('font-size-slider').value = val;
    updateFontSizePreview(val);
  }

  if (settings.reducedMotion !== undefined) {
    document.getElementById('reduced-motion-toggle').checked = settings.reducedMotion;
  }

  const notifSettings = settings.notifications || {};
  document.querySelectorAll('.notif-toggle').forEach(toggle => {
    const key = toggle.dataset.key;
    if (notifSettings[key] !== undefined) {
      toggle.checked = notifSettings[key];
    }
  });

  const profile = JSON.parse(localStorage.getItem('admin-profile') || '{}');
  if (profile.name) document.getElementById('admin-name-input').value = profile.name;
  if (profile.email) document.getElementById('admin-email-input').value = profile.email;
  if (profile.bio) document.getElementById('admin-bio-input').value = profile.bio;
  if (profile.avatar) {
    document.getElementById('avatar-img').src = profile.avatar;
    document.getElementById('avatar-img').style.display = 'block';
    document.querySelector('.avatar-placeholder').style.display = 'none';
  }
}

function bindSettingsEvents() {
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.theme-radio-card').classList.add('selected');
      saveSetting('theme', radio.value);
      if (radio.value === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('site-theme', theme);
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme } }));
      } else {
        document.documentElement.setAttribute('data-theme', radio.value);
        localStorage.setItem('site-theme', radio.value);
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: radio.value } }));
      }
    });
  });

  document.querySelectorAll('.accent-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      saveSetting('accentColor', swatch.dataset.color);
      applyAccentColor(swatch.dataset.color);
    });
  });

  document.getElementById('font-size-slider').addEventListener('input', function() {
    updateFontSizePreview(this.value);
    saveSetting('fontSize', this.value);
  });

  document.getElementById('reduced-motion-toggle').addEventListener('change', function() {
    saveSetting('reducedMotion', this.checked);
    document.documentElement.style.setProperty('--transition-base', this.checked ? '0s' : '');
    document.documentElement.style.setProperty('--transition-fast', this.checked ? '0s' : '');
  });

  document.querySelectorAll('.notif-toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const settings = JSON.parse(localStorage.getItem('admin-settings') || '{}');
      if (!settings.notifications) settings.notifications = {};
      settings.notifications[toggle.dataset.key] = toggle.checked;
      localStorage.setItem('admin-settings', JSON.stringify(settings));
    });
  });

  document.getElementById('save-profile-btn').addEventListener('click', () => {
    const name = document.getElementById('admin-name-input').value.trim();
    const email = document.getElementById('admin-email-input').value.trim();
    const bio = document.getElementById('admin-bio-input').value.trim();
    if (!name) {
      window.App.showToast('Admin name is required.', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      window.App.showToast('A valid email is required.', 'error');
      return;
    }
    const profile = JSON.parse(localStorage.getItem('admin-profile') || '{}');
    profile.name = name;
    profile.email = email;
    profile.bio = bio;
    try {
      localStorage.setItem('admin-profile', JSON.stringify(profile));
      localStorage.setItem('admin-name', name);
      const users = window.MOCK_USERS;
      users[0].email = email;
      localStorage.setItem('mock-users', JSON.stringify(users));
    } catch (e) {
      window.App.showToast('Unable to save profile. Storage may be full.', 'error');
      return;
    }
    window.App.showToast('Profile saved successfully.');
  });

  document.getElementById('avatar-file-input').addEventListener('change', function() {
    if (this.files.length > 0) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('avatar-img').src = e.target.result;
        document.getElementById('avatar-img').style.display = 'block';
        document.querySelector('.avatar-placeholder').style.display = 'none';
        const profile = JSON.parse(localStorage.getItem('admin-profile') || '{}');
        profile.avatar = e.target.result;
        try {
          localStorage.setItem('admin-profile', JSON.stringify(profile));
        } catch (e) {
          window.App.showToast('Avatar too large to save.', 'error');
          return;
        }
        window.App.showToast('Avatar updated.');
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  document.getElementById('save-security-btn').addEventListener('click', () => {
    const current = document.getElementById('current-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;

    if (!current || !newPw || !confirmPw) {
      window.App.showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (newPw.length < 6) {
      window.App.showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      window.App.showToast('Passwords do not match.', 'error');
      return;
    }
    const users = window.MOCK_USERS;
    if (current !== users[0].password) {
      window.App.showToast('Current password is incorrect.', 'error');
      return;
    }
    users[0].password = newPw;
    window.MOCK_USERS[0] = users[0];
    try { localStorage.setItem('mock-users', JSON.stringify(users)); } catch(e) {}
    window.App.showToast('Password updated successfully.');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    updatePasswordStrength('');
  });

  document.getElementById('new-password').addEventListener('input', function() {
    updatePasswordStrength(this.value);
  });

  // Sync settings radio cards when theme is changed via navbar toggle
  window.addEventListener('themechanged', (e) => {
    const theme = e.detail && e.detail.theme;
    if (!theme) return;
    const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (radio) {
      radio.checked = true;
      document.querySelectorAll('.theme-radio-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.theme-radio-card').classList.add('selected');
      saveSetting('theme', theme);
    }
  });
}

function updatePasswordStrength(password) {
  const bar = document.getElementById('strength-bar-fill');
  const label = document.getElementById('strength-label');

  if (!password) {
    bar.style.width = '0';
    bar.className = 'strength-bar-fill';
    label.textContent = '';
    return;
  }

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    bar.className = 'strength-bar-fill weak';
    label.textContent = 'Weak';
    label.className = 'strength-label weak';
  } else if (score <= 3) {
    bar.className = 'strength-bar-fill medium';
    label.textContent = 'Medium';
    label.className = 'strength-label medium';
  } else {
    bar.className = 'strength-bar-fill strong';
    label.textContent = 'Strong';
    label.className = 'strength-label strong';
  }
}

function updateFontSizePreview(val) {
  const sizes = ['14px', '16px', '18px'];
  const labels = ['Small', 'Medium', 'Large'];
  const idx = parseInt(val, 10);
  if (isNaN(idx) || idx < 0 || idx > 2) return;
  ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl'].forEach(prop => {
    document.documentElement.style.setProperty(prop, sizes[idx]);
  });
  document.getElementById('font-size-label').textContent = labels[idx];
}

function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', color);
}

function saveSetting(key, value) {
  try {
    const settings = JSON.parse(localStorage.getItem('admin-settings') || '{}');
    settings[key] = value;
    localStorage.setItem('admin-settings', JSON.stringify(settings));
  } catch (e) {
    window.App.showToast('Unable to save setting. Storage may be full.', 'error');
  }
}

function bindDangerZone() {
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    const modal = document.getElementById('danger-modal-overlay');
    modal.classList.add('active');
    document.getElementById('danger-confirm-input').value = '';
    document.getElementById('danger-proceed-btn').disabled = true;
  });

  document.getElementById('danger-confirm-input').addEventListener('input', function() {
    document.getElementById('danger-proceed-btn').disabled = this.value !== 'DELETE';
  });

  document.getElementById('cancel-danger-btn').addEventListener('click', () => {
    document.getElementById('danger-modal-overlay').classList.remove('active');
  });

  document.getElementById('danger-modal-overlay').querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('danger-modal-overlay').classList.remove('active');
  });

  document.getElementById('danger-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('danger-modal-overlay').classList.remove('active');
  });

  document.getElementById('danger-proceed-btn').addEventListener('click', () => {
    localStorage.removeItem('db-videos');
    localStorage.removeItem('db-tags');
    window.App.showToast('All data cleared successfully. Refreshing...');
    document.getElementById('danger-modal-overlay').classList.remove('active');
    setTimeout(() => location.reload(), 1000);
  });
}

function bindImportExport() {
  document.getElementById('export-all-btn').addEventListener('click', () => {
    const data = {
      videos: window.App.getVideos(),
      tags: JSON.parse(localStorage.getItem('db-tags') || '[]'),
      settings: JSON.parse(localStorage.getItem('admin-settings') || '{}'),
      profile: JSON.parse(localStorage.getItem('admin-profile') || '{}'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'antigravity-export.json';
    a.click();
    URL.revokeObjectURL(url);
    window.App.showToast('All data exported.');
  });

  document.getElementById('import-file-input').addEventListener('change', function() {
    if (this.files.length === 0) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== 'object') throw new Error('Invalid data');
        if (data.videos !== undefined) {
          if (!Array.isArray(data.videos)) throw new Error('videos must be an array');
          localStorage.setItem('db-videos', JSON.stringify(data.videos));
        }
        if (data.tags !== undefined) {
          if (!Array.isArray(data.tags)) throw new Error('tags must be an array');
          localStorage.setItem('db-tags', JSON.stringify(data.tags));
        }
        window.App.showToast('Data imported successfully. Refresh to see changes.');
      } catch (err) {
        window.App.showToast(err.message === 'Invalid data' || err.message.includes('must be') ? err.message : 'Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(this.files[0]);
    this.value = '';
  });
}
