// App-shell worker: hashed /assets and index.html only. Never API, /auth or /media responses (ADR-0072).
// No skipWaiting: a new worker activates the next time the app is opened, never mid-session.
const CACHE = 'wz-shell-v1'
const SHELL = '/index.html'

// 'nav' = network-first page load, 'asset' = cache-first hashed file, null = leave to the network.
function route(url, mode, method, origin) {
  if (method !== 'GET') return null
  const u = new URL(url)
  if (u.origin !== origin) return null
  if (u.pathname.startsWith('/assets/')) return 'asset'
  if (mode === 'navigate' && !u.pathname.startsWith('/auth/') && !u.pathname.startsWith('/media/')) return 'nav'
  return null
}

if (typeof module !== 'undefined') module.exports = { route }

if (typeof self !== 'undefined' && self.addEventListener) {
  // Precache so a first visit works offline. No clients.claim: the next navigation is controlled by the
  // activated worker anyway, and claiming would take over a page mid-session.
  self.addEventListener('install', (event) => {
    event.waitUntil(
      (async () => {
        const res = await fetch(SHELL, { cache: 'reload' })
        if (!res.ok) throw new Error('shell fetch failed')
        const html = await res.clone().text()
        const urls = new Set((html.match(/\/?assets\/[^"'\s)]+/g) || []).map((u) => '/' + u.replace(/^\//, '')))
        const cache = await caches.open(CACHE)
        await cache.put(SHELL, res)
        await Promise.all(
          [...urls].map(async (u) => {
            const r = await fetch(u)
            if (r.ok && new URL(r.url).origin === self.location.origin) await cache.put(u, r)
          }),
        )
      })(),
    )
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    )
  })

  self.addEventListener('fetch', (event) => {
    const { request } = event
    const kind = route(request.url, request.mode, request.method, self.location.origin)
    if (kind === 'nav') {
      // Network first: Caddy serves index.html no-cache, so an online open always gets the newest shell.
      event.respondWith(
        fetch(request).then(
          (res) => {
            if (res.ok) {
              const copy = res.clone()
              event.waitUntil(caches.open(CACHE).then((c) => c.put(SHELL, copy)))
            }
            return res
          },
          () => caches.match(SHELL).then((hit) => hit || Response.error()),
        ),
      )
    } else if (kind === 'asset') {
      // ponytail: old deploys' hashed files linger until the cache name is bumped; add pruning if it ever matters.
      event.respondWith(
        caches.match(request, { ignoreVary: true }).then(
          (hit) =>
            hit ||
            fetch(request).then((res) => {
              if (res.ok) {
                const copy = res.clone()
                event.waitUntil(caches.open(CACHE).then((c) => c.put(request, copy)))
              }
              return res
            }),
        ),
      )
    }
  })
}
