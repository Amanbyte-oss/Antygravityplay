// ─── LOGIN PAGE LOGIC ───
// Handles authentication: injects navbar/footer, checks for existing session,
// and validates login credentials against localStorage (falling back to MOCK_USERS).
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the DOM to be fully parsed before executing any logic
  // ─── 1. INJECT PUBLIC NAVBAR & FOOTER ───
  // Inject the public navbar with 'login' as the active page indicator
  window.Components.injectNavbar('login');
  // Inject the page footer into the footer container
  window.Components.injectFooter();

  // ─── REDIRECT IF ALREADY LOGGED IN ───
  // If an admin session already exists in localStorage, redirect to the admin dashboard
  if (localStorage.getItem('admin-session')) {
    // Session token exists; user is already authenticated
    // Redirect the browser to the admin dashboard page
    window.location.href = './admin/index.html';
    // Stop further execution since we are redirecting
    return;
  } // End if session exists

  // ─── 2. SETUP LOGIN FORM ───
  // Get a reference to the login form element by its ID
  const loginForm = document.getElementById('login-form');
  // Get a reference to the email input field by its ID
  const emailInput = document.getElementById('email-input');
  // Get a reference to the password input field by its ID
  const passwordInput = document.getElementById('password-input');
  // Get a reference to the error message display element by its ID
  const errorMsg = document.getElementById('login-error-msg');

  // Only bind the submit handler if the form element exists on this page
  if (loginForm) {
    // The login form was found in the DOM
    // Attach a submit event listener to the login form
    loginForm.addEventListener('submit', (e) => {
      // Callback fires when the user clicks the submit button or presses Enter
      // Prevent the default form submission behavior (which would reload the page)
      e.preventDefault();

      // Read the email value from the input field and trim surrounding whitespace
      const email = emailInput.value.trim();
      // Read the password value from the input field (preserving case)
      const password = passwordInput.value;

      // ─── RESET ERROR STATES ───
      // Hide any previously displayed error message by setting display to none
      errorMsg.style.display = 'none';
      // Reset the email input's border color to the default (empty string removes inline style)
      emailInput.style.borderColor = '';
      // Reset the password input's border color to the default
      passwordInput.style.borderColor = '';

      // ─── VALIDATE CREDENTIALS ───
      // Declare a variable to hold the users array
      let users;
      try {
        // Attempt to parse the 'mock-users' JSON string from localStorage
        users = JSON.parse(localStorage.getItem('mock-users'));
      } catch (_) {
        // Silently ignore JSON parse errors; users will remain undefined
      } // End try/catch for localStorage parsing
      // If localStorage has no valid users array or it is empty, fall back to the default mock data
      if (!Array.isArray(users) || users.length === 0) {
        // Use the global MOCK_USERS array as the fallback credential source
        users = window.MOCK_USERS;
      } // End if localStorage users are invalid
      // Find a user in the array whose email and password exactly match the input values
      const user = users.find(u => u.email === email && u.password === password);
      // user will be the matching object or undefined if no match is found

      // ─── AUTHENTICATION RESULT ───
      if (user) {
        // A matching user was found; authentication succeeded
        // ─── SUCCESS: Store session and redirect ───
        // Create a unique session token by concatenating 'session-active-' with the current timestamp
        localStorage.setItem('admin-session', 'session-active-' + Date.now());
        // Store the authenticated user's display name for UI use
        localStorage.setItem('admin-name', user.name);

        // Show a success toast notification informing the user of the redirect
        window.App.showToast('Login successful! Redirecting to Dashboard...', 'success');

        // Redirect to the admin dashboard after a short delay so the toast is visible
        setTimeout(() => {
          // Callback fires after 1200ms delay
          // Navigate the browser to the admin dashboard page
          window.location.href = './admin/index.html';
        }, 1200); // End setTimeout
      } else {
        // No matching user found; authentication failed
        // ─── FAILURE: Show error message ───
        // Set the error message element's text to inform the user
        errorMsg.innerText = 'Invalid email or password. Please try again.';
        // Make the error message visible by changing display to block
        errorMsg.style.display = 'block';
        // Highlight the email input border with the error CSS variable color
        emailInput.style.borderColor = 'var(--error)';
        // Highlight the password input border with the error CSS variable color
        passwordInput.style.borderColor = 'var(--error)';

        // Show an error toast notification for additional user feedback
        window.App.showToast('Login failed. Please check your credentials.', 'error');
      } // End if/else for authentication result
    }); // End submit event listener
  } // End if loginForm exists
}); // End DOMContentLoaded event listener
