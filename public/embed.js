/**
 * Quiz OS embed loader.
 * Usage on a third-party site:
 *   <div data-quiz="clientSlug/quizSlug"></div>
 *   <script src="https://embed.hivesocial.agency/embed.js" defer></script>
 *
 * - Auto-resizes to fit content (no scrollbars, no fixed height guessing)
 * - Full-width, mobile responsive by default
 * - Forwards any query params on the HOST page's URL (utm_source, lead_source, etc.) into the
 *   quiz iframe automatically, so ad-platform tracking params land in the webhook even when
 *   the ad points at the client's own landing page rather than the quiz URL directly.
 */
(function () {
  function getEmbedOrigin() {
    // document.currentScript is reliable here even with `defer`, since it's read synchronously
    // during this script's own execution.
    var script = document.currentScript;
    if (script && script.src) {
      try {
        return new URL(script.src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    return '';
  }

  function buildSrc(origin, quizPath) {
    var parentParams = window.location.search; // e.g. "?utm_source=facebook&campaign=..."
    var cleanPath = quizPath.replace(/^\/+|\/+$/g, ''); // trim slashes
    return origin + '/q/' + cleanPath + parentParams;
  }

  function addPreconnect(origin) {
    // Warms up DNS + TLS to the quiz origin before the iframe even mounts, shaving real time off
    // first paint. Harmless if called more than once — just skip if already present.
    if (document.querySelector('link[data-quizos-preconnect]')) return;
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.setAttribute('data-quizos-preconnect', 'true');
    document.head.appendChild(link);
  }

  function mountEmbed(container, origin) {
    var quizPath = container.getAttribute('data-quiz');
    if (!quizPath) return;

    var iframe = document.createElement('iframe');
    iframe.src = buildSrc(origin, quizPath);
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.minHeight = '480px'; // sensible fallback before the first resize message arrives
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('title', 'Quiz');
    // Lead forms are almost always placed above the fold and need to be ready immediately —
    // no lazy-loading delay waiting for the iframe to scroll into view.
    iframe.setAttribute('fetchpriority', 'high');

    container.appendChild(iframe);
    container.dataset.quizosIframe = 'true';

    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.type !== 'quizos:resize') return;
      if (event.source !== iframe.contentWindow) return; // ignore messages from other embeds/iframes on the page
      iframe.style.height = data.height + 'px';
    });
  }

  function init() {
    var origin = getEmbedOrigin();
    if (!origin) {
      console.error('Quiz OS embed: could not determine script origin — check the <script src> tag.');
      return;
    }
    addPreconnect(origin);
    var containers = document.querySelectorAll('[data-quiz]:not([data-quizos-iframe])');
    containers.forEach(function (el) {
      mountEmbed(el, origin);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
