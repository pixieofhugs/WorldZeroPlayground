// App-shell worker: hashed /assets and index.html only. Never API, /auth or /media responses (ADR-0072).
// No skipWaiting: a new worker activates the next time the app is opened, never mid-session.
const CACHE = 'wz-shell-v1'
const SHELL = '/index.html'
// vite.config.ts swaps this null for src/locales/en/push.json at build (ADR-0031: one source for the wording).
const PUSH_STRINGS = null

// 'nav' = network-first page load, 'asset' = cache-first hashed file, null = leave to the network.
function route(url, mode, method, origin) {
  if (method !== 'GET') return null
  const u = new URL(url)
  if (u.origin !== origin) return null
  if (u.pathname.startsWith('/assets/')) return 'asset'
  if (mode === 'navigate' && !u.pathname.startsWith('/auth/') && !u.pathname.startsWith('/media/')) return 'nav'
  return null
}

// Real files (manifest, icons, marks) are navigable too; only HTML may stand in as the offline shell.
const isShell = (res) => res.ok && (res.headers.get('content-type') || '').startsWith('text/html')

function shellUrls(html) {
  return [...new Set((html.match(/\/?assets\/[^"'\s)]+/g) || []).map((u) => '/' + u.replace(/^\//, '')))]
}

const fill = (tpl, v) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k])

// Pure: payload + strings -> showNotification args. count > 1 collapses under the one tag as "N new ...".
function pushMessage(p, S) {
  const k = (S.kinds && (S.kinds[p.kind] || S.kinds.default)) || { title: '', body: '' }
  const many = p.count > 1 && k.titleMany
  const v = { actor: p.actor || S.someone, task: p.task || S.aTask, count: p.count, others: p.count - 1 }
  const board = `${fill(many ? k.titleMany : k.title, v)}\n${fill(many ? k.bodyMany : k.body, v)}`
  return {
    title: p.character ? fill(S.heading, { character: p.character }) : S.headingAnon,
    options: { body: board, tag: p.tag || p.kind, data: { url: safeUrl(p.url, S.origin) }, icon: '/icon-192.png' },
  }
}

// Chrome on Android drops a push that shows nothing, so a throw while building the text still shows a line.
function pushMessageSafe(p, S) {
  try {
    return pushMessage(p, S)
  } catch {
    return { title: 'World Zero', options: { tag: 'wz', data: { url: '/' }, icon: '/icon-192.png' } }
  }
}

// The payload is a trust boundary: only a same-origin path may become a navigation target.
function safeUrl(url, origin) {
  try {
    const u = new URL(url || '/', origin)
    return u.origin === origin ? u.pathname + u.search + u.hash : '/'
  } catch {
    return '/'
  }
}

async function focusOrOpen(clients, url) {
  const open = (await clients.matchAll({ type: 'window', includeUncontrolled: true })).find((c) => 'focus' in c)
  if (open) {
    try {
      await open.focus()
      await open.navigate(url)
      return
    } catch {
      // navigate refused (uncontrolled client): fall through to a new window
    }
  }
  await clients.openWindow(url)
}

if (typeof module !== 'undefined') module.exports = { route, isShell, shellUrls, pushMessage, pushMessageSafe, safeUrl, focusOrOpen }

if (typeof self !== 'undefined' && self.addEventListener) {
  // Precache so a first visit works offline. No clients.claim: the next navigation is controlled by the
  // activated worker anyway, and claiming would take over a page mid-session.
  self.addEventListener('install', (event) => {
    event.waitUntil(
      (async () => {
        const res = await fetch(SHELL, { cache: 'reload' })
        if (!res.ok) throw new Error('shell fetch failed')
        const html = await res.clone().text()
        const urls = shellUrls(html)
        const cache = await caches.open(CACHE)
        await cache.put(SHELL, res)
        await Promise.all(
          urls.map(async (u) => {
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

  self.addEventListener('push', (event) => {
    let p = {}
    try {
      p = event.data.json()
    } catch {
      // A push must still show something: the default kind is the generic line.
    }
    const m = pushMessageSafe(p, { ...PUSH_STRINGS, origin: self.location.origin })
    event.waitUntil(self.registration.showNotification(m.title, m.options))
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(focusOrOpen(self.clients, event.notification.data.url))
  })

  self.addEventListener('fetch', (event) => {
    const { request } = event
    const kind = route(request.url, request.mode, request.method, self.location.origin)
    if (kind === 'nav') {
      // Network first: Caddy serves index.html no-cache, so an online open always gets the newest shell.
      event.respondWith(
        fetch(request).then(
          (res) => {
            if (isShell(res)) {
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
