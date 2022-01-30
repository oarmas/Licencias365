const Version = '20220130';

const CacheContent = [
  // Pages
  '/',
  '/changes.htm',
  '/compare.htm',
  '/comparing.htm',
  '/downloads.htm',
  '/guide.htm',
  '/matrix.htm',
  '/renames.htm',
  '/saved.htm',
  '/settings.htm',
  '/viewsvg.htm',
  // Misc
  '/favicon.ico',
  '/manifest.json',
  // '/robots.txt',
  // '/sitemap.xml',
  // Styles
  '/css/changes.min.css',
  '/css/common.min.css',
  '/css/compare.min.css',
  '/css/comparing.min.css',
  '/css/downloads.min.css',
  '/css/guide.min.css',
  '/css/index.min.css',
  '/css/matrix.min.css',
  '/css/renames.min.css',
  '/css/saved.min.css',
  '/css/settings.min.css',
  '/css/viewsvg.min.css',
  // Javascript
  '/js/changes.min.js',
  '/js/common.min.js',
  '/js/compare.min.js',
  '/js/comparing.min.js',
  '/js/downloads.min.js',
  '/js/guide.min.js',
  '/js/index.min.js',
  '/js/matrix.min.js',
  '/js/renames.min.js',
  '/js/saved.min.js',
  '/js/settings.min.js',
  '/js/viewsvg.min.js',
  // SVG
  '/media/favicon.svg',
  '/media/sprites.svg',
  // Static Images
  '/media/apple-touch-icon.png',
  '/media/favicon-192.png',
  '/media/favicon-192-mask.png',
  '/media/favicon-512.png',
  '/media/favicon-512-mask.png',
  '/media/page-compare.png',
  '/media/page-home1.png',
  '/media/page-home2.png',
  '/media/page-saved.png',
  '/media/page-settings.png',
  '/media/page-viewsvg.png',
  // '/media/screenshot-1-desktop.png',
  // '/media/screenshot-1-mobile.png',
  // '/media/screenshot-2-desktop.png',
  // '/media/screenshot-2-mobile.png',
  // '/media/screenshot-3-desktop.png',
  // '/media/screenshot-3-mobile.png',
  '/media/shortcut-changes.png',
  '/media/shortcut-cog.png',
  '/media/shortcut-compare.png',
  '/media/shortcut-downloads.png',
  '/media/shortcut-guide.png',
  '/media/shortcut-home.png',
  '/media/shortcut-matrix.png',
  '/media/shortcut-renames.png',
  '/media/shortcut-save.png',
  // '/media/summary.png',
  // '/media/summary_large_image.png',
  // '/media/summary_wide.png',
  '/media/teams-add.png',
  '/media/teams-app.png',
  '/media/teams-manage.png',
  '/media/teams-pin.png',
  '/media/teams-upload.png',
  // Animated Images
  '/media/edit-modes.png',
  '/media/image-controls.png',
  '/media/page-comparing.png',
  '/media/page-matrix.png',
  // Diagram Pages
  '/Azure-AD-Premium.htm',
  '/CALs.htm',
  '/CAL-Main-Bridges.htm',
  '/CAL-Other-Bridges.htm',
  '/CAL-All-Bridges.htm',
  '/EMS Enterprise - Simple.htm',
  '/EMS Enterprise.htm',
  '/EMS-Enterprise-E3.htm',
  '/EMS-Enterprise-E5.htm',
  '/Microsoft 365 Apps for Business.htm',
  '/Microsoft 365 Apps for Enterprise.htm',
  '/Microsoft 365 Apps.htm',
  '/Microsoft 365 Business Basic.htm',
  '/Microsoft 365 Business Premium.htm',
  '/Microsoft 365 Business Standard.htm',
  '/Microsoft 365 Business.htm',
  '/Microsoft 365 Consumer.htm',
  '/Microsoft 365 Education Student Use Benefits - Simple.htm',
  '/Microsoft 365 Education Student Use Benefits.htm',
  '/Microsoft 365 Education.htm',
  '/Microsoft-365-Education-A1-(Legacy).htm',
  '/Microsoft-365-Education-A1-for-Devices.htm',
  '/Microsoft-365-Education-A3.htm',
  '/Microsoft-365-Education-A5.htm',
  '/Microsoft 365 Enterprise - E3.htm',
  '/Microsoft 365 Enterprise - E5.htm',
  '/Microsoft 365 Enterprise - F1.htm',
  '/Microsoft 365 Enterprise - F3.htm',
  '/Microsoft 365 Enterprise - F5.htm',
  '/Microsoft 365 Enterprise - Frontline.htm',
  '/Microsoft 365 Enterprise - Landscape.htm',
  '/Microsoft 365 Enterprise - Venn.htm',
  '/Microsoft 365 Enterprise.htm',
  '/Microsoft 365 Personal and Family.htm',
  '/Microsoft-Defender-for-Business.htm',
  '/Microsoft-Defender-for-Endpoint.htm',
  '/Microsoft-Defender-for-Office-365.htm',
  '/Microsoft Project.htm',
  '/Microsoft Teams Rooms.htm',
  '/Microsoft Teams Rooms - Premium.htm',
  '/Microsoft-Visio.htm',
  '/Office 365 Education - Simple.htm',
  '/Office 365 Education.htm',
  '/Office 365 Enterprise - E1.htm',
  '/Office 365 Enterprise - F3.htm',
  '/Office 365 Enterprise - Simple.htm',
  '/Office 365 Enterprise.htm',
  '/Office-365-E3.htm',
  '/Office-365-E5.htm',
  '/Office Consumer.htm',
  '/Windows 10 - Enterprise.htm',
  '/Windows 10 - Pro.htm',
  '/Windows 10 - VL.htm',
  '/Windows-365.htm',
];

/** Service Worker Install caches core app components and diagrams. */
function swInstall(event) {
  console.log('[Service Worker] Install', Version);

  self.skipWaiting();

  event.waitUntil(caches.has(Version).then(
    function hasCache(has) {
      if (!has) {
        caches.open(Version).then(
          function cacheAddAll(cache) {
            cache.addAll(CacheContent.map(
              function cacheMap(url) {
                return new Request(url, { cache: 'no-cache' });
              }
            ));
          }
        );
      }
    }
  ));
}

/** Service Worker Activate deletes old caches. */
function swActivate(event) {
  console.log('[Service Worker] Activate', Version);
  event.waitUntil(caches.keys().then(
    function forEachKey(keys) {
      keys.forEach(
        function cachesDelete(key) {
          if (key !== Version) {
            caches.delete(key);
          }
        }
      );
    }
  ));
}

/** Service Worker Fetch goes to cache-first then network (no updates). */
function swFetch(event) {
  event.respondWith(caches.match(event.request).then(
    function cachesMatch(cachedResponse) {
      if (cachedResponse) {
        const newHeaders = new Headers(cachedResponse.headers);
        newHeaders.set('cache-control', 'no-cache');

        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: newHeaders,
        });
      }

      console.log('[Service Worker] Fallback (Fetch)', event.request.url);
      return fetch(event.request.clone());
    }
  ));
}

self.addEventListener('install', swInstall);
self.addEventListener('activate', swActivate);
self.addEventListener('fetch', swFetch);
