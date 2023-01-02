const Version = '20230102';

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
  '/media/shortcut-related.png',
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
  '/files/Azure-AD-Premium.htm',
  '/files/CAL-All-Bridges.htm',
  '/files/CAL-Main-Bridges.htm',
  '/files/CAL-Other-Bridges.htm',
  '/files/CALs.htm',
  '/files/EMS-All.htm',
  '/files/EMS-E3.htm',
  '/files/EMS-E5.htm',
  '/files/EMS-Simple.htm',
  '/files/Microsoft-365-Apps-All.htm',
  '/files/Microsoft-365-Apps-Business.htm',
  '/files/Microsoft-365-Apps-Enterprise.htm',
  '/files/Microsoft-365-Business-All.htm',
  '/files/Microsoft-365-Business-Basic.htm',
  '/files/Microsoft-365-Business-Premium.htm',
  '/files/Microsoft-365-Business-Standard.htm',
  '/files/Microsoft-365-Consumer.htm',
  '/files/Microsoft-365-E3.htm',
  '/files/Microsoft-365-E5.htm',
  '/files/Microsoft-365-Education-A1-(Legacy).htm',
  '/files/Microsoft-365-Education-A1-for-Devices.htm',
  '/files/Microsoft-365-Education-A3.htm',
  '/files/Microsoft-365-Education-A5.htm',
  '/files/Microsoft-365-Education-All.htm',
  '/files/Microsoft-365-Education-Student-Use-Benefits-All.htm',
  '/files/Microsoft-365-Education-Student-Use-Benefits-Simple.htm',
  '/files/Microsoft-365-Enterprise-All.htm',
  '/files/Microsoft-365-Enterprise-Landscape.htm',
  '/files/Microsoft-365-Enterprise-Venn.htm',
  '/files/Microsoft-365-F1.htm',
  '/files/Microsoft-365-F3.htm',
  '/files/Microsoft-365-F5.htm',
  '/files/Microsoft-365-Frontline-All.htm',
  '/files/Microsoft-365-Personal-and-Family.htm',
  '/files/Microsoft-Defender-for-Business.htm',
  '/files/Microsoft-Defender-for-Endpoint.htm',
  '/files/Microsoft-Defender-for-Office-365.htm',
  '/files/Microsoft-Defender-Vulnerability-Management.htm',
  '/files/Microsoft-Project.htm',
  '/files/Microsoft-Teams-Premium.htm',
  '/files/Microsoft-Teams-Rooms.htm',
  '/files/Microsoft-Teams-Rooms-Basic.htm',
  '/files/Microsoft-Teams-Rooms-Old.htm',
  '/files/Microsoft-Teams-Rooms-Pro.htm',
  '/files/Microsoft-Visio.htm',
  '/files/Office-365-E1.htm',
  '/files/Office-365-E3.htm',
  '/files/Office-365-E5.htm',
  '/files/Office-365-Education-All.htm',
  '/files/Office-365-Education-Simple.htm',
  '/files/Office-365-Enterprise-All.htm',
  '/files/Office-365-Enterprise-Simple.htm',
  '/files/Office-365-F3.htm',
  '/files/Office-365-US-Government-All.htm',
  '/files/Office-365-US-Government-F3.htm',
  '/files/Office-365-US-Government-G1.htm',
  '/files/Office-Consumer.htm',
  '/files/Related-Services.htm',
  '/files/Windows-365.htm',
  '/files/Windows-365-Compare.htm',
  '/files/Windows-Enterprise.htm',
  '/files/Windows-Pro.htm',
  '/files/Windows-VL.htm',
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
