/* Forseti service worker: network first for pages and news, cached copy when offline. */
const CACHE = "forseti-v1";
const SHELL = ["./", "index.html", "news.json", "details.json", "favicon.svg", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !fonts) return;            // counters, widgets, sources: never cached
  if (fonts) {                                                       // fonts: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })));
    return;
  }
  const key = (url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname);   // ignore ?v= and cache-busting queries
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(key, c)); }
    return r;
  }).catch(() => caches.match(key).then(hit => hit || caches.match("index.html"))));
});
