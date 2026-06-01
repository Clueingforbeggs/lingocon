import type { CacheEntry, ScriptCacheEntry, LanguageMeta } from "./types"

const DB_NAME = "lingocon-translate"
const DB_VERSION = 1

const STORE_DICTIONARY = "dictionary_cache"
const STORE_SCRIPT = "script_cache"
const STORE_META = "language_meta_cache"
const STORE_FONT = "font_cache"

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_DICTIONARY)) db.createObjectStore(STORE_DICTIONARY)
      if (!db.objectStoreNames.contains(STORE_SCRIPT)) db.createObjectStore(STORE_SCRIPT)
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META)
      if (!db.objectStoreNames.contains(STORE_FONT)) db.createObjectStore(STORE_FONT)
    }
    req.onsuccess = () => { _db = req.result; resolve(req.result) }
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly")
        const req = tx.objectStore(store).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      })
  )
}

function idbSet(store: string, key: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite")
        tx.objectStore(store).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
  )
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite")
        tx.objectStore(store).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
  )
}

// Dictionary cache
export const dictionaryCache = {
  get: (languageId: string) => idbGet<CacheEntry>(STORE_DICTIONARY, languageId),
  set: (languageId: string, entry: CacheEntry) => idbSet(STORE_DICTIONARY, languageId, entry),
  delete: (languageId: string) => idbDelete(STORE_DICTIONARY, languageId),
}

// Script cache
export const scriptCache = {
  get: (languageId: string) => idbGet<ScriptCacheEntry>(STORE_SCRIPT, languageId),
  set: (languageId: string, entry: ScriptCacheEntry) => idbSet(STORE_SCRIPT, languageId, entry),
}

// Language metadata cache
export const metaCache = {
  get: (languageId: string) => idbGet<LanguageMeta>(STORE_META, languageId),
  set: (languageId: string, meta: LanguageMeta) => idbSet(STORE_META, languageId, meta),
}

// Font binary cache
export const fontCache = {
  get: (languageId: string) => idbGet<ArrayBuffer>(STORE_FONT, languageId),
  set: (languageId: string, buf: ArrayBuffer) => idbSet(STORE_FONT, languageId, buf),
}

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_DICTIONARY, STORE_SCRIPT, STORE_META, STORE_FONT], "readwrite")
    tx.objectStore(STORE_DICTIONARY).clear()
    tx.objectStore(STORE_SCRIPT).clear()
    tx.objectStore(STORE_META).clear()
    tx.objectStore(STORE_FONT).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
