// ============================================================
// WeatherNext Service Worker
// Version 1.0.307 — COMBINE confidence into the storm line (Version A). Builds on
// 1.0.306's contradiction fix: the confident storm line now carries a bracketed
// confidence tag — zh '时段内可能有雷阵雨（较确定）' / en '...likely in the window
// (fairly sure)' / ms '...(agak pasti)' — matching the existing '（不确定）' on the
// uncertain line so every storm line ends with a confidence word. The now-redundant
// standalone '~ 模型一致' line is suppressed ONLY on storm days where that storm line
// fires (storm window + no measurable rain hour); it's KEPT on actual-rain days
// (where the hourly list shows real rain and no storm-maybe line exists) so no farm
// loses its confidence cue. bump CACHE_VERSION on each release
//
// Version 1.0.306 — FIX broadcast contradiction: on a high-confidence storm day the message printed '~ 模型一致 / models agree' AND '时段内或有零星雷阵雨（不确定） / scattered storms (uncertain)' for the same farm — 'agree' vs 'uncertain' collide. The two come from separate systems (ensemble confidence marker vs CAPE-based storm-maybe line). Added a stormMaybeConfident variant per language (zh '时段内可能有雷阵雨' / en 'Scattered storms likely in the window' / ms 'Ribut berselerak mungkin dalam masa ini') and made the storm line read the same window.confidenceCache[lid][dayIdx]: when confidence==='high', drop the '(uncertain)' qualifier so both lines align. Otherwise unchanged. bump CACHE_VERSION on each release
// ============================================================

const CACHE_VERSION = 'wnext-weathernextforcameron-202606031620';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const WEATHER_CACHE = `${CACHE_VERSION}-weather`;

// Files that make up the app shell (offline-ready core)
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  // External CDN assets — cache so app loads fully offline after first visit.
  // (Tailwind is no longer here — it's now pre-built and inlined in index.html.)
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// ============================================================
// INSTALL — pre-cache the app shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version', CACHE_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => {
        // Use addAll with a fallback per-item to survive a single failure.
        // Cross-origin CDN assets (cdn.tailwindcss.com, cdnjs) often lack CORS headers
        // for fetch() pre-caching. Use 'no-cors' mode for them — produces an opaque
        // response which is cacheable but not introspectable (fine for static assets).
        return Promise.allSettled(
          SHELL_ASSETS.map((url) => {
            const isCrossOrigin = url.startsWith('http') && !url.startsWith(self.location.origin);
            const reqInit = isCrossOrigin
              ? { cache: 'reload', mode: 'no-cors', credentials: 'omit' }
              : { cache: 'reload' };
            return cache.add(new Request(url, reqInit)).catch((err) => {
              // Quiet failure — pre-cache is opportunistic, runtime fetch will still work
              console.warn('[SW] Pre-cache skipped for', url, '(will fetch on demand)');
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — clean up old cache versions
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — routing strategy per request type
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // 1. Firebase, Gemini, Google APIs — do NOT intercept at all.
  //
  // This rule used to do event.respondWith(fetch(request).catch(... JSON 503 ...)).
  // That was a bug: it also caught the Firebase SDK JavaScript module requests
  // (gstatic.com/firebasejs/...). When such a request failed, the SW handed the
  // browser a JSON body; the browser then tried to execute JSON as an ES module,
  // which throws and kills the entire type="module" script — a fully blank page,
  // repeated on every load because the installed SW kept doing it.
  //
  // Fix: don't substitute anything for these requests. Returning here (with no
  // event.respondWith) lets the browser fetch them natively. A real network
  // failure becomes a normal rejected fetch, which the app already handles —
  // never a poisoned JSON module.
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('gstatic.com') && url.pathname.includes('firebasejs')
  ) {
    return;
  }

  // 2. Open-Meteo weather API — network-first with cache fallback (stale weather > no weather)
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful weather responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(WEATHER_CACHE).then((cache) => {
              cache.put(request, clone);
              // Trim cache to prevent unbounded growth (keep ~30 most recent)
              trimCache(WEATHER_CACHE, 30);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response(
              JSON.stringify({ error: 'offline', hourly: null }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // 3. Navigation (HTML) — network-first with offline fallback to cached shell
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update the shell cache with fresh HTML
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => cached || caches.match('./index.html'))
            .then((fallback) => fallback || caches.match('./'));
        })
    );
    return;
  }

  // 4. CDN scripts (Tailwind, html2canvas) — cache-first (rarely changes).
  // Cross-origin CDNs without CORS headers need no-cors mode to be cacheable.
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.tailwindcss.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Refresh in background (no-cors to handle CORS-restricted CDNs)
          fetch(request, { mode: 'no-cors' }).then((response) => {
            // Opaque responses have status 0 but are still cacheable
            if (response && (response.ok || response.type === 'opaque')) {
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, response));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request, { mode: 'no-cors' }).then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. Everything else (same-origin assets) — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ============================================================
// HELPER — trim cache to max size (LRU-ish)
// ============================================================
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries (keys() returns insertion order)
    await Promise.all(
      keys.slice(0, keys.length - maxItems).map((key) => cache.delete(key))
    );
  }
}

// ============================================================
// MESSAGE — allow the app to trigger SW updates
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});
