// ─── FORGOT PASSWORD PAGE LOGIC ───
// This IIFE handles the two-step password reset flow:
// 1. Identity verification via hashed security questions (full name + mother's name)
// 2. New password creation with validation, then redirect to login page.
(function() {
  // Use an IIFE to encapsulate all forgot-password logic and avoid polluting the global scope

  // ─── PRE-COMPUTED HASHES ───
  // Expected answer hashes: "aman sharma" and "asha sharma"
  // Computed at build time so plaintext answers never appear in source code
  const HASH_1 = 'h5a77adff';
  // First expected hash: corresponds to the full name answer
  const HASH_2 = 'h26b0ba6f';
  // Second expected hash: corresponds to the mother's name answer

  // ─── SIMPLE HASH FUNCTION ───
  /**
   * A simple (non-cryptographic) hash function for client-side answer verification.
   * Converts a string to a hexadecimal hash prefixed with 'h'.
   * @param {string} str - The string to hash
   * @returns {string} The hashed string (e.g., "h5a77adff")
   */
  function simpleHash(str) {
    // Define a function that produces a deterministic hash from an input string
    // Start with a zero hash value
    let hash = 0;
    // Initialize the accumulator to zero
    // Iterate over each character in the input string
    for (let i = 0; i < str.length; i++) {
      // Loop variable i goes from 0 to str.length - 1
      // Get the Unicode character code of the character at position i
      const char = str.charCodeAt(i);
      // Retrieve the numeric code point for the current character
      // Apply a simple polynomial hash: hash * 31 + charCode
      // Using bitwise operations: (hash << 5) - hash is equivalent to hash * 31
      hash = ((hash << 5) - hash) + char;
      // Shift hash left by 5 bits, subtract hash (multiply by 31), then add the character code
      // Keep the hash as a signed 32-bit integer (bitwise AND with itself truncates to Int32)
      hash = hash & hash;
      // Force the hash to stay within 32-bit integer range
    } // End for loop over characters
    // Return 'h' + the absolute value of the hash converted to a hexadecimal string
    return 'h' + Math.abs(hash).toString(16);
    // Concatenate 'h' prefix with the hex representation of the absolute hash value
  } // End simpleHash function

  // ─── STATE ──────────────────────────────────────────────
  // Number of failed verification attempts so far in the current session
  let attempts = 0;
  // Initialize attempt counter to zero
  // Maximum allowed attempts before the user is locked out temporarily
  const MAX_ATTEMPTS = 3;
  // Set the lockout threshold to 3 failed attempts
  // Timestamp (in milliseconds) until which the user is locked out from trying again
  let lockoutUntil = 0;
  // Initialize lockout expiration to zero (not locked out)
  // Whether the user has successfully passed identity verification
  let verified = false;
  // Start as not verified; set to true only after successful hash match

  // ─── DOM REFS ───────────────────────────────────────────
  // Get a reference to the identity verification form element by its ID
  const verifyForm = document.getElementById('fp-verify-form');
  // Reference to the first form (step 1: verify identity)
  const resetForm = document.getElementById('fp-reset-form');
  // Reference to the second form (step 2: reset password)
  const fullnameInput = document.getElementById('fp-fullname');
  // Reference to the full name text input field
  const mothernameInput = document.getElementById('fp-mothername');
  // Reference to the mother's name text input field
  const newPassInput = document.getElementById('fp-new-password');
  // Reference to the new password input field
  const confirmPassInput = document.getElementById('fp-confirm-password');
  // Reference to the confirm password input field
  const errorMsg = document.getElementById('fp-error-msg');
  // Reference to the error message display element
  const subtitle = document.getElementById('fp-subtitle');
  // Reference to the subtitle text element for status updates

  // ─── STEP 1: VERIFY IDENTITY ────────────────────────────
  // Handle the identity verification form submission
  if (verifyForm) {
    // Only proceed if the verify form exists in the DOM
    // Attach a submit event listener to the verification form
    verifyForm.addEventListener('submit', (e) => {
      // Callback fires when the user submits the verification form
      // Prevent the default form submission (which would reload the page)
      e.preventDefault();

      // Get the current timestamp in milliseconds
      const now = Date.now();
      // Capture the current time for lockout comparison
      // Check if the current time is before the lockout expiration time
      if (now < lockoutUntil) {
        // User is currently locked out
        // Calculate the remaining lockout duration in seconds
        const remaining = Math.ceil((lockoutUntil - now) / 1000);
        // Compute how many seconds are left before the user can try again
        // Display the lockout message with the remaining seconds
        errorMsg.innerText = 'Too many attempts. Try again in ' + remaining + ' seconds.';
        // Show the lockout warning text in the error element
        errorMsg.style.display = 'block';
        // Make the error message visible
        return;
        // Exit the handler early; do not process the verification
      } // End if currently locked out

      // Read the full name value, trim whitespace, and convert to lowercase for case-insensitive comparison
      const name = fullnameInput.value.trim().toLowerCase();
      // Normalize the full name answer
      // Read the mother's name value, trim whitespace, and convert to lowercase
      const mother = mothernameInput.value.trim().toLowerCase();
      // Normalize the mother's name answer

      // Validate that both input fields are filled in
      if (!name || !mother) {
        // At least one field is empty
        // Set the error message to indicate both fields are required
        errorMsg.innerText = 'Both fields are required.';
        // Show the error message
        errorMsg.style.display = 'block';
        // Exit the handler without processing
        return;
      } // End if either field is empty

      // Hash the provided full name answer using the simple hash function
      const nameHash = simpleHash(name);
      // Produce the hash for comparison with HASH_1
      // Hash the provided mother's name answer using the simple hash function
      const motherHash = simpleHash(mother);
      // Produce the hash for comparison with HASH_2

      // Compare both hashes against the pre-computed expected values
      if (nameHash === HASH_1 && motherHash === HASH_2) {
        // Both hashes match; identity verification succeeded
        // ─── VERIFICATION SUCCESS ───
        // Mark the user as verified for the password reset step
        verified = true;
        // Set the verified flag to true
        // Hide the verification form by setting its display to none
        verifyForm.style.display = 'none';
        // Remove the first form from view
        // Show the password reset form by setting its display to block
        resetForm.style.display = 'block';
        // Make the second form visible
        // Update the subtitle text to indicate the next step
        subtitle.innerText = 'Identity verified. Choose a new password.';
        // Change the instruction text below the heading
        // Hide any error messages
        errorMsg.style.display = 'none';
        // Ensure no error text is visible
        // Style the subtitle with the accent color for visual feedback
        if (subtitle) subtitle.style.color = 'var(--accent)';
        // Change the subtitle text color to the accent color
        // Show a success toast notification
        window.App.showToast('Identity verified successfully.', 'success');
        // Display a brief success toast at the top of the page
      } else {
        // At least one hash did not match; verification failed
        // ─── VERIFICATION FAILURE ───
        // Increment the failed attempt counter by one
        attempts++;
        // Track how many times the user has failed
        // Calculate how many attempts remain before lockout
        const remaining = MAX_ATTEMPTS - attempts;
        // remaining holds the number of tries left
        if (remaining <= 0) {
          // No more attempts remaining; trigger lockout
          // Set the lockout expiration to 30 seconds from now
          lockoutUntil = Date.now() + 30000;
          // The user cannot retry for 30 seconds
          // Display the lockout message
          errorMsg.innerText = 'Too many incorrect attempts. Locked for 30 seconds.';
          // Inform the user about the lockout duration
          // Reset the attempt counter back to zero for after the lockout
          attempts = 0;
          // Allow fresh attempts after lockout expires
        } else {
          // User still has attempts remaining
          // Display how many attempts are left with proper pluralization
          errorMsg.innerText = 'Answers do not match. ' + remaining + ' attempt' + (remaining > 1 ? 's' : '') + ' remaining.';
          // remaining > 1 adds an 's' for plural; otherwise singular
        } // End if remaining <= 0
        // Show the error message element
        errorMsg.style.display = 'block';
        // Make the error text visible to the user
        // Clear the full name input field for a fresh retry
        fullnameInput.value = '';
        // Reset the full name field to empty
        // Clear the mother's name input field for a fresh retry
        mothernameInput.value = '';
        // Reset the mother's name field to empty
        // Show an error toast notification
        window.App.showToast('Verification failed.', 'error');
        // Display a brief error toast
      } // End if/else for hash comparison
    }); // End verification form submit listener
  } // End if verifyForm exists

  // ─── STEP 2: RESET PASSWORD ────────────────────────────
  // Handle the password reset form submission
  if (resetForm) {
    // Only proceed if the reset form exists in the DOM
    // Attach a submit event listener to the password reset form
    resetForm.addEventListener('submit', (e) => {
      // Callback fires when the user submits the reset form
      // Prevent the default form submission behavior
      e.preventDefault();

      // Ensure the user has been verified in step 1 before allowing a password reset
      if (!verified) {
        // User has not passed identity verification
        // Show an error toast telling them to verify first
        window.App.showToast('Please verify your identity first.', 'error');
        // Exit the handler; do not process the reset
        return;
      } // End if not verified

      // Read the value from the new password input field
      const newPw = newPassInput.value;
      // Store the new password value
      // Read the value from the confirm password input field
      const confirmPw = confirmPassInput.value;
      // Store the confirmation password value

      // Validate that the new password meets the minimum length requirement (6 characters)
      if (newPw.length < 6) {
        // Password is too short
        // Show an error toast with the length requirement
        window.App.showToast('Password must be at least 6 characters.', 'error');
        // Exit the handler; password was not updated
        return;
      } // End if password too short
      // Validate that the new password and confirmation match exactly
      if (newPw !== confirmPw) {
        // Passwords do not match
        // Show an error toast informing the user
        window.App.showToast('Passwords do not match.', 'error');
        // Exit the handler; password was not updated
        return;
      } // End if passwords do not match

      // ─── UPDATE USER CREDENTIALS ───
      // Declare a variable to hold the users array
      let users;
      try {
        // Attempt to parse the 'mock-users' JSON string from localStorage
        users = JSON.parse(localStorage.getItem('mock-users'));
      } catch (_) {
        // Silently ignore JSON parse errors
      } // End try/catch for localStorage parsing
      // Fall back to the global mock data if localStorage has no valid users array
      if (!Array.isArray(users) || users.length === 0) {
        // Use the default MOCK_USERS array as the fallback
        users = window.MOCK_USERS;
      } // End if localStorage users are invalid

      // Update the password for the first user in the array
      if (users[0]) {
        // Ensure the first user entry exists
        // Set the user's password to the newly chosen password
        users[0].password = newPw;
        // Overwrite the old password with the new one
        // Also update the in-memory global mock data object to keep them in sync
        window.MOCK_USERS[0] = users[0];
        // Sync the global reference with the modified user object
        // Persist the updated users array back to localStorage as a JSON string
        try { localStorage.setItem('mock-users', JSON.stringify(users)); } catch (_) {}
        // Attempt to save; silently ignore storage errors
      } // End if users[0] exists

      // Display a success toast notification and prepare to redirect
      window.App.showToast('Password reset successful! Redirecting to login...', 'success');
      // Brief toast to confirm the password change
      // Redirect to the login page after a 1500ms delay so the toast is visible
      setTimeout(() => {
        // Callback fires after 1500ms
        // Navigate the browser to the login page
        window.location.href = './login.html';
      }, 1500); // End setTimeout
    }); // End reset form submit listener
  } // End if resetForm exists

  // ─── NAVBAR & FOOTER ──────────────────────────────────
  // Wait for DOMContentLoaded to inject shared UI components
  document.addEventListener('DOMContentLoaded', () => {
    // Callback fires when the DOM is fully parsed
    // Inject the public navbar with 'login' as the active page indicator
    window.Components.injectNavbar('login');
    // Add the navigation bar to the page
    // Inject the page footer into the footer container
    window.Components.injectFooter();
    // Add the footer to the page
    // Initialize scroll reveal animations for any reveal-on-scroll elements
    window.Animations.initScrollReveal();
    // Activate scroll-based entrance animations
  }); // End DOMContentLoaded event listener
})(); // End IIFE
