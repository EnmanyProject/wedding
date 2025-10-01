// A&B Meeting App Service Worker
const CACHE_NAME = 'ab-meeting-app-v1.0.6-dev-cache-bypass';

// 개발 환경 감지
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/styles/responsive-improvements.css',
  '/styles/accessibility-improvements.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/api.js',
  '/js/quiz.js',
  '/js/photos.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Cache opened, adding resources...');
        // Simple addAll without complex mapping to avoid duplicates
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('SW: All resources cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Cache installation failed:', error);
        // Continue installation even if caching fails
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 개발 환경에서는 모든 요청을 네트워크에서 직접 가져오기 (캐시 완전 비활성화)
  if (isDevelopment) {
    console.log('SW: Development mode - bypassing cache for URL:', url);
    // 개발 환경에서는 캐시를 완전히 건너뛰고 네트워크에서 직접 가져오기
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.log('SW: Network fetch failed in dev mode:', error);
        // 네트워크 실패 시에만 캐시 확인
        return caches.match(event.request);
      })
    );
    return;
  }

  // Skip service worker entirely for admin pages, API calls, favicon, and external resources
  if (url.includes('/admin') ||
      url.includes('/api/admin-auth') ||
      url.includes('/api/admin') ||
      url.includes('admin-login.html') ||
      url.includes('favicon.ico') ||
      url.includes('favicon') ||
      url.match(/\/api\/admin/) ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('cdn.socket.io')) {
    console.log('SW: Completely bypassing for URL:', url);
    // Don't call event.respondWith at all for these requests
    return;
  }

  // 프로덕션 환경에서만 캐시 우선 전략 사용
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch((error) => {
        console.log('Fetch failed:', error);
        // For navigation requests, return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw error;
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Claiming clients...');
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('SW: Activation failed:', error);
      })
  );
});