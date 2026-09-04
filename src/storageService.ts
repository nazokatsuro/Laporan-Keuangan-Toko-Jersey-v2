/**
 * storageService.ts
 * Robust dual-tier storage engine (IndexedDB + localStorage fallback).
 * 
 * Why IndexedDB?
 * localStorage has a strict ~5MB quota. Orders with base64 mockup images,
 * collar designs, size charts, or long historical records easily exceed 5MB,
 * throwing "QuotaExceededError: Setting the value of 'laporan_jersey_data' exceeded the quota".
 * IndexedDB provides hundreds of megabytes of reliable, persistent storage.
 */

import { Pesanan, ShopSettings } from './types';

const DB_NAME = 'LaporanJerseyDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';

const KEY_ORDERS = 'laporan_jersey_data';
const KEY_SETTINGS = 'laporan_jersey_settings';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        request.onsuccess = (event) => {
          resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
          console.warn('IndexedDB failed to open, using memory/localStorage fallback:', event);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization error:', err);
        resolve(null);
      }
    });
  }

  return dbPromise;
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result !== undefined ? req.result : null);
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.warn(`Error reading ${key} from IndexedDB:`, err);
        resolve(null);
      }
    });
  } catch (err) {
    console.warn(`IndexedDB get error for ${key}:`, err);
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);

        req.onsuccess = () => {
          resolve(true);
        };

        req.onerror = (err) => {
          console.warn(`IndexedDB error saving ${key}:`, err);
          resolve(false);
        };
      } catch (err) {
        console.warn(`IndexedDB transaction error for ${key}:`, err);
        resolve(false);
      }
    });
  } catch (err) {
    console.warn(`idbSet failed for ${key}:`, err);
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  } catch (err) {
    return false;
  }
}

/**
 * Safely writes to localStorage without throwing QuotaExceededError.
 * If quota is exceeded, handles it gracefully and logs an informative note.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    const isQuota = e?.name === 'QuotaExceededError' || 
                    e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'));
    
    if (isQuota) {
      console.warn(`[Storage] localStorage quota exceeded for key "${key}". Data is safely persisted in IndexedDB.`);
      // If setting orders failed because localStorage is full, remove the old bulky key
      // so other lightweight keys (preferences, filters, tokens) can continue to save.
      if (key === KEY_ORDERS) {
        try {
          localStorage.removeItem(KEY_ORDERS);
        } catch {}
      }
    } else {
      console.warn(`[Storage] Failed to write to localStorage for key "${key}":`, e);
    }
    return false;
  }
}

/**
 * Persists the entire order list into IndexedDB (primary high-quota storage)
 * and attempts saving to localStorage as a fast synchronous cache.
 */
export async function persistOrders(orders: Pesanan[]): Promise<void> {
  // 1. Always save full payload to IndexedDB (virtually unlimited quota)
  await idbSet(KEY_ORDERS, orders);

  // 2. Try to sync to localStorage for fast sync-first boot
  try {
    const serialized = JSON.stringify(orders);
    safeLocalStorageSet(KEY_ORDERS, serialized);
  } catch (e) {
    console.warn('[Storage] Serialization or storage notice for orders:', e);
  }
}

/**
 * Persists shop settings into IndexedDB and localStorage.
 */
export async function persistSettings(settings: ShopSettings): Promise<void> {
  await idbSet(KEY_SETTINGS, settings);
  try {
    const serialized = JSON.stringify({ ...settings, darkMode: true });
    safeLocalStorageSet(KEY_SETTINGS, serialized);
  } catch (e) {
    console.warn('[Storage] Serialization notice for settings:', e);
  }
}

/**
 * Loads the orders list from IndexedDB, falling back to localStorage.
 */
export async function loadOrdersFromStorage(): Promise<Pesanan[] | null> {
  // Try IndexedDB first (most complete, can hold unlimited orders + images)
  const idbOrders = await idbGet<Pesanan[]>(KEY_ORDERS);
  if (Array.isArray(idbOrders) && idbOrders.length > 0) {
    return idbOrders;
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY_ORDERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Asynchronously migrate to IndexedDB
          idbSet(KEY_ORDERS, parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to read orders from localStorage:', e);
    }
  }

  return null;
}

/**
 * Loads shop settings from IndexedDB, falling back to localStorage.
 */
export async function loadSettingsFromStorage(): Promise<ShopSettings | null> {
  const idbSettings = await idbGet<ShopSettings>(KEY_SETTINGS);
  if (idbSettings && typeof idbSettings === 'object') {
    return idbSettings;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          idbSet(KEY_SETTINGS, parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to read settings from localStorage:', e);
    }
  }

  return null;
}
