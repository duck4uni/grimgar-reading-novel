const CACHE_VERSION = "v5";
const APP_SHELL_CACHE = `grimgar-app-shell-${CACHE_VERSION}`;
const PDF_CACHE = `grimgar-pdf-${CACHE_VERSION}`;
const RUNTIME_CACHE = `grimgar-runtime-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
  "/",
  "/pdf.worker.min.mjs",
  "/manifest.json",
  "/novels-list.json",
];

let precacheInProgress = false;
let precacheStatus = { total: 0, cached: 0, failed: 0, done: false, quotaExceeded: false };

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn("[SW] Some app shell assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

// Helper: post message to all clients
async function postToAllClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

// Pre-cache all PDFs in background, posting progress to clients
async function precacheAllPdfs() {
  if (precacheInProgress) return;
  precacheInProgress = true;

  try {
    const listResponse = await fetch("/novels-list.json");
    if (!listResponse.ok) {
      console.warn("[SW] Failed to fetch novels-list.json");
      precacheInProgress = false;
      return;
    }
    const filenames = await listResponse.json();
    const cache = await caches.open(PDF_CACHE);

    let cached = 0;
    let failed = 0;
    let quotaExceeded = false;
    const total = filenames.length;

    await postToAllClients({ type: "PRECACHE_START", total, cached: 0 });

    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i];
      // Use encodeURIComponent to match client-side encodeURIComponent requests
      const pdfUrl = `/novels/${encodeURIComponent(filename)}`;

      // Skip if already cached (ignoreSearch for consistency with fetch handler)
      const existing = await cache.match(pdfUrl, { ignoreSearch: true });
      if (existing) {
        cached++;
        await postToAllClients({ type: "PRECACHE_PROGRESS", total, cached, failed, current: filename });
        continue;
      }

      // Stop if quota was already exceeded
      if (quotaExceeded) {
        failed++;
        await postToAllClients({ type: "PRECACHE_PROGRESS", total, cached, failed, current: filename });
        continue;
      }

      try {
        const response = await fetch(pdfUrl);
        if (response && response.status === 200) {
          try {
            await cache.put(pdfUrl, response.clone());
            cached++;
          } catch (putErr) {
            // QuotaExceededError - iOS storage limit hit
            if (putErr.name === "QuotaExceededError" || putErr.name === "NS_ERROR_DOM_QUOTA_REACHED") {
              console.warn("[SW] Storage quota exceeded, stopping precache");
              quotaExceeded = true;
              failed++;
              await postToAllClients({ type: "PRECACHE_QUOTA_EXCEEDED", total, cached, failed });
            } else {
              throw putErr;
            }
          }
        } else {
          failed++;
          console.warn(`[SW] Failed to cache: ${filename} (status ${response.status})`);
        }
      } catch (err) {
        failed++;
        console.warn(`[SW] Error caching: ${filename}`, err);
      }

      await postToAllClients({ type: "PRECACHE_PROGRESS", total, cached, failed, current: filename });
    }

    precacheStatus = { total, cached, failed, done: true, quotaExceeded };
    await postToAllClients({ type: "PRECACHE_DONE", total, cached, failed, quotaExceeded });
    console.log(`[SW] Pre-cache complete: ${cached}/${total} cached, ${failed} failed${quotaExceeded ? " (quota exceeded)" : ""}`);
  } catch (err) {
    console.error("[SW] Pre-cache error:", err);
    await postToAllClients({ type: "PRECACHE_ERROR", error: err.message });
  } finally {
    precacheInProgress = false;
  }
}

// Activate: clean up old caches, claim clients, then pre-cache all PDFs
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith("grimgar-") &&
              name !== APP_SHELL_CACHE &&
              name !== PDF_CACHE &&
              name !== RUNTIME_CACHE
            );
          })
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();

      // Start pre-caching all PDFs in background (non-blocking)
      precacheAllPdfs();
    })()
  );
});

// Helper: check if URL is a PDF
function isPdfRequest(url) {
  return (
    url.pathname.startsWith("/novels/") &&
    url.pathname.endsWith(".pdf")
  );
}

// Helper: check if URL is a static asset (JS, CSS, fonts, images, worker)
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".mjs") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  );
}

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js HMR and dev requests
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // 1. PDF files: Cache-first with ignoreSearch (to match ?v=2 queries)
  if (isPdfRequest(url)) {
    event.respondWith(
      caches.open(PDF_CACHE).then(async (cache) => {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) {
          return cached;
        }
        // Not in cache: fetch from network, cache it
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            // Store with normalized URL (without query string) matching precache format
            const normalizedUrl = new URL(request.url);
            normalizedUrl.search = "";
            cache.put(normalizedUrl.toString(), response.clone());
          }
          return response;
        } catch (err) {
          // Offline and not cached
          return new Response("PDF not available offline.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })
    );
    return;
  }

  // 2. Static assets (_next/static, fonts, images): Cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 3. Navigation requests (HTML pages): Network-first, fallback to cache
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (err) {
          // Offline: try cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback to cached root
          const rootCache = await caches.match("/");
          if (rootCache) return rootCache;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>Không có kết nối mạng</h1><p>Trang này chưa được cache. Hãy mở trang khi có mạng để đọc offline.</p></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // 4. Other GET requests: Stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Message handler: allow manual cache cleanup
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_PDF_CACHE") {
    event.waitUntil(
      caches.delete(PDF_CACHE).then(() => {
        event.source && event.source.postMessage({ type: "PDF_CACHE_CLEARED" });
      })
    );
  }
  if (event.data && event.data.type === "START_PRECACHE") {
    // If already done, send the cached status back
    if (precacheStatus.done && !precacheInProgress) {
      event.source && event.source.postMessage({
        type: "PRECACHE_DONE",
        total: precacheStatus.total,
        cached: precacheStatus.cached,
        failed: precacheStatus.failed,
        quotaExceeded: precacheStatus.quotaExceeded,
      });
    } else {
      precacheAllPdfs();
    }
  }
});
