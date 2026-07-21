// ─── Animation Utilities & Transitions ───
// This IIFE provides scroll-reveal, like-animation, and staggered-entrance utilities.
// It auto-initializes scroll reveal on DOMContentLoaded.
(function() {
  // Declare the Animations API object that will hold all public methods
  // ─── ANIMATIONS API ───
  const Animations = {
    // Create the Animations object with methods for scroll reveal, like animation, and staggered entrance
    // ─── SCROLL REVEAL ───
    /**
     * Initializes IntersectionObserver-based scroll reveal animations.
     * Elements with the 'reveal-on-scroll' class fade/translate in when they enter the viewport.
     * Falls back to immediately showing all elements if IntersectionObserver is unsupported.
     */
    initScrollReveal() {
      // Check if the browser supports IntersectionObserver
      if (!('IntersectionObserver' in window)) {
        // Browser does not support IntersectionObserver; fallback to immediate reveal
        // Fallback: make all reveal elements visible immediately
        document.querySelectorAll('.reveal-on-scroll').forEach(el => {
          // Iterate over every element with the 'reveal-on-scroll' class
          // Set final opacity to fully visible
          el.style.opacity = '1';
          // Set final transform to no vertical offset
          el.style.transform = 'translateY(0)';
        }); // End forEach over all reveal elements
        // Exit the function early since we cannot observe anything
        return;
      } // End if IntersectionObserver not supported

      // Create an observer that triggers reveal when elements enter the viewport
      const revealObserver = new IntersectionObserver((entries, observer) => {
        // Callback fires whenever observed elements intersect the viewport
        // Process each observed entry
        entries.forEach(entry => {
          // Loop through each entry that changed intersection state
          // Only reveal when the element becomes visible
          if (entry.isIntersecting) {
            // Element has entered the viewport
            // Add the 'revealed' class to trigger CSS animation
            entry.target.classList.add('revealed');
            // Stop observing once revealed to avoid redundant triggers
            revealObserver.unobserve(entry.target);
          } // End if element is intersecting
        }); // End forEach over entries
      }, {
        // Configuration options for the observer
        // Threshold: 8% of the element must be visible before triggering
        threshold: 0.08,
        // Slight bottom offset to trigger slightly before the element is fully in view
        rootMargin: '0px 0px -30px 0px'
      }); // End IntersectionObserver constructor

      // Start observing all elements with the 'reveal-on-scroll' class
      document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        // Loop through each element that should animate on scroll
        revealObserver.observe(el);
      }); // End forEach over all reveal-on-scroll elements
    }, // End initScrollReveal method

    // ─── LIKE ANIMATION ───
    /**
     * Triggers a heart-beat animation on the SVG icon within the given button element.
     * Restarts the animation by removing/re-adding the CSS class.
     * @param {HTMLElement} buttonEl - The button element containing the heart SVG
     */
    animateLike(buttonEl) {
      // Exit if no button element is provided
      if (!buttonEl) return;
      // Find the SVG icon element nested inside the button
      const svg = buttonEl.querySelector('svg');
      // Check if the SVG element was found
      if (svg) {
        // SVG element exists inside the button
        // Remove the class to reset any running animation
        svg.classList.remove('heart-beat');
        // Force a reflow by accessing offsetWidth to restart the CSS animation
        void svg.offsetWidth;
        // Add the class to start the heart-beat animation
        svg.classList.add('heart-beat');
        // Clean up: remove the class once the animation ends
        svg.addEventListener('animationend', () => {
          // Callback fires when the heart-beat CSS animation completes
          svg.classList.remove('heart-beat');
        }, { once: true }); // Use once:true so the listener auto-removes after first fire
      } // End if SVG element exists
    }, // End animateLike method

    // ─── STAGGERED ENTRANCE ───
    /**
     * Applies staggered animation delays to child elements within a container.
     * Useful for creating cascading entrance effects for grid items.
     * @param {string} containerSelector - CSS selector for the parent container
     * @param {string} itemSelector - CSS selector for child items
     * @param {number} [baseDelay=0.05] - Delay increment in seconds between each item
     */
    staggerEntrance(containerSelector, itemSelector, baseDelay = 0.05) {
      // Find the container element using the provided CSS selector
      const container = document.querySelector(containerSelector);
      // Exit if the container element doesn't exist in the DOM
      if (!container) return;
      // Get all child items matching itemSelector within the container
      const items = container.querySelectorAll(itemSelector);
      // Loop through each matched item with its index for staggered delay calculation
      items.forEach((el, i) => {
        // Set the CSS animation-delay property: index * baseDelay seconds
        el.style.animationDelay = `${i * baseDelay}s`;
      }); // End forEach over items
    } // End staggerEntrance method
  }; // End Animations object

  // ─── EXPORT ───
  // Expose the Animations API globally on the window object for use across pages
  window.Animations = Animations;

  // ─── AUTO-INITIALIZE ───
  // Automatically run scroll reveal when the DOM is fully parsed and ready
  document.addEventListener('DOMContentLoaded', () => {
    // Call the scroll reveal initializer once the DOM is ready
    Animations.initScrollReveal();
  }); // End DOMContentLoaded event listener
})(); // End IIFE
