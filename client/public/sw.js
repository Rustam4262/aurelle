// Service Worker — AURELLE
// Version: 3.0.0
// Caching strategy:
//   - index.html        → network-first (never serve stale HTML)
//   - /assets/*         → cache-first   (content-hashed, immutable)
//   - /icons/*, /images → cache-first   (static assets)
//   - /api/*            → stale-while-revalidate (fresh data, fast response)
//   - push notifications → always handled

const VERSION = '3.0.0';
const CACHE_STATIC = `aurelle-static-v${VERSION}`;
const CACHE_DYNAMIC = `aurelle-dynamic-v${VERSION}`;

const PRECACHE_ASSETS = [
  '/offline.html',
  '/icons/icon-192.webp',
  '/icons/icon-512.webp',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except fonts/cdn)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // 1. API: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
    return;
  }

  // 2. Hashed assets (/assets/*): cache-first, immutable
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 3. Icons and images: cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 4. HTML / navigation: network-first with offline fallback
  if (request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 5. Everything else: network-first
  event.respondWith(networkFirst(request));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || offlineFallback(request);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    // Never cache HTML — always serve fresh
    return response;
  } catch {
    // Offline: try cache, then offline.html
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline.html');
    return offline || new Response('Нет подключения к интернету', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

function offlineFallback(request) {
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'offline', message: 'No internet connection' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return caches.match('/offline.html').then(
    (r) => r || new Response('Offline', { status: 503 })
  );
}

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Aurelle',
    body: 'У вас новое уведомление',
    icon: '/icons/icon-192.webp',
    badge: '/icons/icon-72.webp',
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // keep defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [],
      tag: data.tag || 'aurelle-notification',
      requireInteraction: data.requireInteraction || false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const routes = {
    new_booking: '/salon/bookings',
    booking_reminder: '/client/bookings',
    review_response: '/client/reviews',
  };
  const url = routes[event.notification.data?.type] || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

self.addEventListener('notificationclose', () => {});
self.addEventListener('sync', () => {});
