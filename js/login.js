// ─── LOGIN PAGE LOGIC ───
// Handles authentication: injects navbar/footer, checks for existing session,
// and validates login credentials against localStorage.
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the DOM to be fully parsed before executing any logic
  // ─── 1. INJECT PUBLIC NAVBAR & FOOTER ───
  // Inject the public navbar with 'login' as the active page indicator
  window.Components.injectNavbar('login');
  // Inject the page footer into the footer container
  window.Components.injectFooter();

  // ─── REDIRECT IF ALREADY LOGGED IN ───
  if (localStorage.getItem('admin-session')) {
    window.location.href = './admin/index.html';
    return;
  }

  // ─── 2. SETUP LOGIN FORM ───
  // Get a reference to the login form element by its ID
    const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const errorMsg = document.getElementById('login-error-msg');

  if (!loginForm || !emailInput || !passwordInput || !errorMsg) return;

  async function handleLogin(email, password) {
    errorMsg.style.display = 'none';
    emailInput.style.borderColor = '';
    passwordInput.style.borderColor = '';

    if (window.SupabaseAuth) {
      try {
        const { user, error } = await window.SupabaseAuth.login(email, password);
        if (user) {
          localStorage.setItem('admin-session', 'session-active-' + Date.now());
          window.App.showToast('Login successful! Redirecting to Dashboard...', 'success');
          setTimeout(() => { window.location.href = './admin/index.html'; }, 1200);
          return;
        }
        if (error && error.message !== 'Invalid login credentials') {
          errorMsg.innerText = error.message;
          errorMsg.style.display = 'block';
          emailInput.style.borderColor = 'var(--error)';
          passwordInput.style.borderColor = 'var(--error)';
          window.App.showToast('Login failed: ' + error.message, 'error');
          return;
        }
      } catch (e) {
        errorMsg.innerText = 'Connection error. Trying local login...';
        errorMsg.style.display = 'block';
      }
    }

    // ─── FALLBACK: localStorage users ───
    let users;
    try { users = JSON.parse(localStorage.getItem('mock-users')); } catch (_) {}
    if (!Array.isArray(users) || users.length === 0) {
      errorMsg.innerText = 'No admin account found. Please contact the administrator.';
      errorMsg.style.display = 'block';
      return;
    }
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem('admin-session', 'session-active-' + Date.now());
      localStorage.setItem('admin-name', user.name);
      window.App.showToast('Login successful! Redirecting to Dashboard...', 'success');
      setTimeout(() => { window.location.href = './admin/index.html'; }, 1200);
    } else {
      errorMsg.innerText = 'Invalid email or password. Please try again.';
      errorMsg.style.display = 'block';
      emailInput.style.borderColor = 'var(--error)';
      passwordInput.style.borderColor = 'var(--error)';
      window.App.showToast('Login failed. Please check your credentials.', 'error');
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin(emailInput.value.trim(), passwordInput.value);
  });
}); // End DOMContentLoaded event listener
