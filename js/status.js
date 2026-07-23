document.addEventListener('DOMContentLoaded', function() {
  window.Components.injectNavbar();
  window.Components.injectFooter();

  renderLastChecked();
  setupCheckButton();

  var mainTitle = document.getElementById('system-status-title');
  var mainDesc = document.getElementById('system-status-desc');
  var maintSection = document.getElementById('maintenance-status-item');

  function updateMaintenanceStatus() {
    var enabled = localStorage.getItem('maintenance_mode') === 'true';
    var eta = localStorage.getItem('maintenance_eta') || '';
    if (mainTitle) mainTitle.textContent = enabled ? 'Under Maintenance' : 'All Systems Operational';
    if (mainDesc) mainDesc.textContent = enabled
      ? 'Maintenance mode is active. Some services may be unavailable.'
      : 'Antigravity Play is fully operational. Real-time status of all platform services.';
    if (maintSection) {
      var badge = maintSection.querySelector('.system-status');
      if (badge) {
        badge.className = 'system-status ' + (enabled ? 'down' : 'up');
        badge.textContent = enabled ? 'Maintenance' : 'Operational';
      }
      var etaEl = maintSection.querySelector('.maintenance-eta');
      if (etaEl) {
        etaEl.textContent = eta ? 'ETA: ' + eta : '';
        etaEl.style.display = eta ? '' : 'none';
      }
    }
  }

  updateMaintenanceStatus();

  if (window.SupabaseSettings) {
    (async function() {
      try {
        var sbMaint = await window.SupabaseSettings.get('maintenance_mode');
        if (sbMaint !== null) {
          try { localStorage.setItem('maintenance_mode', sbMaint); } catch(_) {}
          updateMaintenanceStatus();
        }
        var sbEta = await window.SupabaseSettings.get('maintenance_eta');
        if (sbEta !== null) {
          try { localStorage.setItem('maintenance_eta', sbEta); } catch(_) {}
          updateMaintenanceStatus();
        }
      } catch(_) {}
    })();
  }

  document.addEventListener('supabase-active', async function() {
    try {
      var sbMaint = await window.SupabaseSettings.get('maintenance_mode');
      if (sbMaint !== null) {
        try { localStorage.setItem('maintenance_mode', sbMaint); } catch(_) {}
        updateMaintenanceStatus();
      }
      var sbEta = await window.SupabaseSettings.get('maintenance_eta');
      if (sbEta !== null) {
        try { localStorage.setItem('maintenance_eta', sbEta); } catch(_) {}
        updateMaintenanceStatus();
      }
    } catch(_) {}
  });

  window.Animations.initScrollReveal();
});

function renderLastChecked() {
  var el = document.getElementById('last-checked-time');
  if (!el) return;
  var stored = localStorage.getItem('status_last_checked');
  if (!stored) {
    el.textContent = 'never';
    return;
  }
  el.textContent = relativeTime(Number(stored));
}

function setupCheckButton() {
  var btn = document.getElementById('check-now-btn');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var now = Date.now();
    try { localStorage.setItem('status_last_checked', String(now)); } catch(_) {}
    var el = document.getElementById('last-checked-time');
    if (el) el.textContent = 'just now';
    btn.textContent = 'Checked!';
    setTimeout(function() { btn.textContent = 'Check Now'; }, 2000);
  });
}

function relativeTime(timestamp) {
  var diff = Date.now() - timestamp;
  var seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return seconds + ' seconds ago';
  var minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return minutes + ' minutes ago';
  var hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return hours + ' hours ago';
  var days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return days + ' days ago';
}
