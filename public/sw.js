const SHELL_CACHE = 'fa-field-shell-v2'
const STUDIO_CACHE = 'fa-audit-studio-shell-v1'
const SHELL_RESOURCES = ['/offline', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']
const FIELD_DATABASE = 'footasylum-kss-field-data'
const QUEUE_STORE = 'sync-queue'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_RESOURCES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== STUDIO_CACHE).map((key) => caches.delete(key)))),
  ]))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (url.pathname.startsWith('/audit-studio') ? await caches.open(STUDIO_CACHE).then(c => c.match('/offline')) : null) || await caches.match('/offline')))
    return
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(fetch(request).then(async response => { if (response.ok) { const cache = await caches.open(STUDIO_CACHE); await cache.put(request, response.clone()) } return response }).catch(() => caches.match(request))); return
  }
  if (SHELL_RESOURCES.includes(url.pathname)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'fa-field-sync') event.waitUntil(flushQueue())
})

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FIELD_DATABASE, 1)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readQueue(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function deleteQueueItem(database, id) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(QUEUE_STORE, 'readwrite')
    transaction.objectStore(QUEUE_STORE).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

async function flushQueue() {
  const database = await openDatabase()
  const queue = await readQueue(database)
  for (const item of queue) {
    const response = await fetch(item.request.url, {
      method: item.request.method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': item.id },
      body: item.request.body === undefined || item.request.method === 'DELETE' ? undefined : JSON.stringify(item.request.body),
    })
    if (!response.ok) throw new Error(`Sync failed with ${response.status}`)
    await deleteQueueItem(database, item.id)
  }
  database.close()
}

// Cache a generic, non-personalised shell. Private audits and files only live in user-scoped IndexedDB.
self.addEventListener('message', event => {
 if(event.data?.type !== 'STUDIO_PREPARE') return
 event.waitUntil((async () => {
  try {
   const cache=await caches.open(STUDIO_CACHE)
   const response=await fetch('/offline', {cache:'reload'})
   if(!response.ok || response.redirected) throw new Error('Offline shell unavailable')
   const html=await response.clone().text()
   await cache.put('/offline', response)
   const discovered=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1])
   const assets=[...new Set([...(event.data.assets||[]),...discovered])].map(p=>new URL(p,self.location.origin)).filter(u=>u.origin===self.location.origin && (u.pathname.startsWith('/_next/static/') || /\.(woff2?|css)$/.test(u.pathname)))
   for(const asset of assets){const r=await fetch(asset.href,{cache:'reload'});if(!r.ok)throw new Error('Asset unavailable');await cache.put(asset.href,r)}
   event.ports[0]?.postMessage({ok:true})
  } catch {event.ports[0]?.postMessage({ok:false})}
 })())
})
