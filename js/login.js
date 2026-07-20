// Login page logic
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Public Navbar & Footer (with inactive active indicator)
  window.Components.injectNavbar('login');
  window.Components.injectFooter();

  // Redirect if already logged in
  if (localStorage.getItem('admin-session')) {
    window.location.href = './admin/index.html';
    return;
  }

  // 2. Setup login form submit action
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const errorMsg = document.getElementById('login-error-msg');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      // Reset states
      errorMsg.style.display = 'none';
      emailInput.style.borderColor = '';
      passwordInput.style.borderColor = '';

      // Validate credentials
      const users = window.MOCK_USERS;
      const user = users.find(u => u.email === email && u.password === password);

      if (user) {
        // Authenticated! Store session
        localStorage.setItem('admin-session', 'session-active-' + Date.now());
        localStorage.setItem('admin-name', user.name);

        window.App.showToast('Login successful! Redirecting to Dashboard...', 'success');
        
        // Redirect to admin panel
        setTimeout(() => {
          window.location.href = './admin/index.html';
        }, 1200);
      } else {
        // Invalid credentials
        errorMsg.innerText = 'Invalid email or password. Hint: admin@videoshare.com / admin123';
        errorMsg.style.display = 'block';
        emailInput.style.borderColor = 'var(--error)';
        passwordInput.style.borderColor = 'var(--error)';
        
        window.App.showToast('Login failed. Please check your credentials.', 'error');
      }
    });
  }
});
