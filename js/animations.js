// Animation utilities & transitions
(function() {
  const Animations = {
    // 1. Initialize Scroll reveals using IntersectionObserver
    initScrollReveal() {
      if (!('IntersectionObserver' in window)) {
        // Fallback for older browsers
        document.querySelectorAll('.reveal-on-scroll').forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
        return;
      }

      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before element enters view
      });

      // Hook up all matching elements
      document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        revealObserver.observe(el);
      });
    },

    // 2. Animate Like Toggle (Heart pop effect)
    animateLike(buttonEl) {
      if (!buttonEl) return;
      const svg = buttonEl.querySelector('svg');
      if (svg) {
        svg.classList.add('heart-beat');
        svg.addEventListener('animationend', () => {
          svg.classList.remove('heart-beat');
        }, { once: true });
      }
    },

    // 3. Page transition helpers (Simulated fade-in overlay)
    fadeInPage() {
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity var(--transition-base)';
      requestAnimationFrame(() => {
        document.body.style.opacity = '1';
      });
    }
  };

  // Export
  window.Animations = Animations;

  // Auto trigger reveal monitoring on load
  document.addEventListener('DOMContentLoaded', () => {
    Animations.initScrollReveal();
  });
})();
