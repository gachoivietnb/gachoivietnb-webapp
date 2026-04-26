'use client'

const DB_NAME = 'gcvnb-offline'
const DB_VERSION = 1
const STORE = 'request_queue'

export type QueuedRequest = {
  id?: number
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
  created_at: number
  label?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function queueRequest(entry: Omit<QueuedRequest, 'id' | 'created_at'>): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.add({ ...entry, created_at: Date.now() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function getQueueCount(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAll(): Promise<QueuedRequest[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as QueuedRequest[])
    req.onerror = () => reject(req.error)
  })
}

async function remove(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export type ProcessResult = { processed: number; failed: number; remaining: number }

export async function processQueue(): Promise<ProcessResult> {
  if (typeof indexedDB === 'undefined' || !navigator.onLine) {
    return { processed: 0, failed: 0, remaining: await getQueueCount().catch(() => 0) }
  }

  const items = await getAll()
  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ?? undefined,
      })
      if (res.ok) {
        if (item.id !== undefined) await remove(item.id)
        processed++
      } else if (res.status >= 400 && res.status < 500) {
        // Client error — drop it so we don't loop forever
        if (item.id !== undefined) await remove(item.id)
        failed++
      } else {
        failed++
      }
    } catch {
      failed++
      break
    }
  }

  return { processed, failed, remaining: await getQueueCount() }
}

export async function fetchOrQueue(
  url: string,
  init: RequestInit & { label?: string } = {}
): Promise<Response> {
  if (navigator.onLine) {
    try {
      return await fetch(url, init)
    } catch (err) {
      if (init.method && init.method !== 'GET') {
        await enqueueFromInit(url, init)
        return new Response(
          JSON.stringify({ queued: true, message: 'Đã thêm vào hàng đợi offline' }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw err
    }
  }

  if (init.method && init.method !== 'GET') {
    await enqueueFromInit(url, init)
    return new Response(
      JSON.stringify({ queued: true, message: 'Offline — đã thêm vào hàng đợi' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    )
  }
  throw new Error('Offline — không thể tải dữ liệu')
}

async function enqueueFromInit(url: string, init: RequestInit & { label?: string }): Promise<void> {
  const headers: Record<string, string> = {}
  if (init.headers) {
    const h = new Headers(init.headers)
    h.forEach((v, k) => {
      headers[k] = v
    })
  }
  let body: string | null = null
  if (init.body) {
    body = typeof init.body === 'string' ? init.body : JSON.stringify(init.body)
  }
  await queueRequest({
    url,
    method: init.method ?? 'POST',
    headers,
    body,
    label: init.label,
  })
}
