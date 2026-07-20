// Animation utilities & transitions
(function() {
  const Animations = {
    initScrollReveal() {
      if (!('IntersectionObserver' in window)) {
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
        rootMargin: '0px 0px -50px 0px'
      });

      document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        revealObserver.observe(el);
      });
    },

    animateLike(buttonEl) {
      if (!buttonEl) return;
      const svg = buttonEl.querySelector('svg');
      if (svg) {
        svg.classList.add('heart-beat');
        svg.addEventListener('animationend', () => {
          svg.classList.remove('heart-beat');
        }, { once: true });
      }
    }
  };

  window.Animations = Animations;

  document.addEventListener('DOMContentLoaded', () => {
    Animations.initScrollReveal();
  });
})();