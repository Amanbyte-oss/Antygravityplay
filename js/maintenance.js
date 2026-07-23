document.addEventListener('DOMContentLoaded', function() {
  window.Components.injectNavbar();
  window.Components.injectFooter();

  var etaEl = document.getElementById('maintenance-eta-display');
  if (!etaEl) return;

  var eta = localStorage.getItem('maintenance_eta');
  if (eta) {
    etaEl.textContent = eta;
  }

  if (window.SupabaseSettings) {
    (async function() {
      try {
        var sbEta = await window.SupabaseSettings.get('maintenance_eta');
        if (sbEta) {
          try { localStorage.setItem('maintenance_eta', sbEta); } catch(_) {}
          etaEl.textContent = sbEta;
        }
      } catch(_) {}
    })();
  }

  document.addEventListener('supabase-active', async function() {
    try {
      var sbEta = await window.SupabaseSettings.get('maintenance_eta');
      if (sbEta) {
        etaEl.textContent = sbEta;
      }
    } catch(_) {}
  });

  window.Animations.initScrollReveal();
});
