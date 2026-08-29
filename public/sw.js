// Hand-written rather than Workbox-generated: vite-plugin-pwa's build step
// doesn't run under TanStack Start's multi-environment production build
// (https://github.com/TanStack/router/issues/4988), so there's no reliable
// way to get it to emit a service worker here. This app's pages are
// server-rendered from live data (Firestore, TMDB) anyway, so there's no
// single static shell worth precaching for offline use — this worker's job
// is just PWA installability plus faster repeat loads of the built JS/CSS.
const CACHE_NAME = "tvtime-static-v1";

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Cache-first for hashed build assets under /assets/ (safe: Vite content-hashes
// these filenames, so a cached response is never stale). Everything else —
// navigations, TMDB/Firestore-backed data — goes straight to the network.
self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/")) {
		return;
	}

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			const cached = await cache.match(request);
			if (cached) return cached;
			const response = await fetch(request);
			if (response.ok) cache.put(request, response.clone());
			return response;
		}),
	);
});
