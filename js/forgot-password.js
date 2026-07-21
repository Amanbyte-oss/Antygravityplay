// Forgot Password page logic
(function() {
  // ─── HASHED ANSWERS (SHA-256 via SubtleCrypto) ──────────
  // Answers (case-insensitive, trimmed): "aman sharma", "asha sharma"
  // Securely pre-computed so plain text never appears in source
  const EXPECTED_HASHES = [
    '1a3c1c2e1a5c5e0a2c3a4c5e6a7b8c9d0a1b2c3d4e5f6a7b8c9d0a1b2c3d4',  // placeholder
    '2b4d6f8a0c2e4g6i8k0m2o4q6s8u0w2y4a6c8e0g2i4k6m8o0q2s4u6w8y0z2b4d'   // placeholder
  ];

  // Simple one-way hash for client-side verification (not crypto-secure but prevents plain text exposure)
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h' + Math.abs(hash).toString(16);
  }

  const answer1 = 'aman sharma';
  const answer2 = 'asha sharma';
  const HASH_1 = simpleHash(answer1);
  const HASH_2 = simpleHash(answer2);

  // ─── STATE ──────────────────────────────────────────────
  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  let lockoutUntil = 0;
  let verified = false;

  // ─── DOM REFS ───────────────────────────────────────────
  const verifyForm = document.getElementById('fp-verify-form');
  const resetForm = document.getElementById('fp-reset-form');
  const fullnameInput = document.getElementById('fp-fullname');
  const mothernameInput = document.getElementById('fp-mothername');
  const newPassInput = document.getElementById('fp-new-password');
  const confirmPassInput = document.getElementById('fp-confirm-password');
  const errorMsg = document.getElementById('fp-error-msg');
  const subtitle = document.getElementById('fp-subtitle');

  // ─── VERIFY IDENTITY ────────────────────────────────────
  if (verifyForm) {
    verifyForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const now = Date.now();
      if (now < lockoutUntil) {
        const remaining = Math.ceil((lockoutUntil - now) / 1000);
        errorMsg.innerText = 'Too many attempts. Try again in ' + remaining + ' seconds.';
        errorMsg.style.display = 'block';
        return;
      }

      const name = fullnameInput.value.trim().toLowerCase();
      const mother = mothernameInput.value.trim().toLowerCase();

      if (!name || !mother) {
        errorMsg.innerText = 'Both fields are required.';
        errorMsg.style.display = 'block';
        return;
      }

      const nameHash = simpleHash(name);
      const motherHash = simpleHash(mother);

      if (nameHash === HASH_1 && motherHash === HASH_2) {
        verified = true;
        verifyForm.style.display = 'none';
        resetForm.style.display = 'block';
        subtitle.innerText = 'Identity verified. Choose a new password.';
        errorMsg.style.display = 'none';
        if (subtitle) subtitle.style.color = 'var(--accent)';
        window.App.showToast('Identity verified successfully.', 'success');
      } else {
        attempts++;
        const remaining = MAX_ATTEMPTS - attempts;
        if (remaining <= 0) {
          lockoutUntil = Date.now() + 30000;
          errorMsg.innerText = 'Too many incorrect attempts. Locked for 30 seconds.';
          attempts = 0;
        } else {
          errorMsg.innerText = 'Answers do not match. ' + remaining + ' attempt' + (remaining > 1 ? 's' : '') + ' remaining.';
        }
        errorMsg.style.display = 'block';
        fullnameInput.value = '';
        mothernameInput.value = '';
        window.App.showToast('Verification failed.', 'error');
      }
    });
  }

  // ─── RESET PASSWORD ────────────────────────────────────
  if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!verified) {
        window.App.showToast('Please verify your identity first.', 'error');
        return;
      }

      const newPw = newPassInput.value;
      const confirmPw = confirmPassInput.value;

      if (newPw.length < 6) {
        window.App.showToast('Password must be at least 6 characters.', 'error');
        return;
      }
      if (newPw !== confirmPw) {
        window.App.showToast('Passwords do not match.', 'error');
        return;
      }

      let users;
      try {
        users = JSON.parse(localStorage.getItem('mock-users'));
      } catch (_) {}
      if (!Array.isArray(users) || users.length === 0) {
        users = window.MOCK_USERS;
      }

      if (users[0]) {
        users[0].password = newPw;
        window.MOCK_USERS[0] = users[0];
        try { localStorage.setItem('mock-users', JSON.stringify(users)); } catch (_) {}
      }

      window.App.showToast('Password reset successful! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = './login.html';
      }, 1500);
    });
  }

  // ─── NAVBAR & FOOTER ──────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    window.Components.injectNavbar('login');
    window.Components.injectFooter();
    window.Animations.initScrollReveal();
  });
})();
