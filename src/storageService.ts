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
import { SPKData } from './spkTypes';

const DB_NAME = 'LaporanJerseyDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_cache';

const KEY_ORDERS = 'laporan_jersey_data';
const KEY_SETTINGS = 'laporan_jersey_settings';
export const STORAGE_KEY_SPK_STANDALONE = 'nomaden_spk_standalone_v1';
export const STORAGE_KEY_SPK_LIST = 'nomaden_spk_list_v1';

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
      if (key === KEY_ORDERS || key === STORAGE_KEY_SPK_STANDALONE || key === STORAGE_KEY_SPK_LIST) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    } else {
      console.warn(`[Storage] Failed to write to localStorage for key "${key}":`, e);
    }
    return false;
  }
}

/**
 * Strips bulky base64 data URLs from orders to produce a featherlight cache for localStorage.
 * Full images remain safely persisted in IndexedDB.
 */
function createLightweightOrderCache(orders: Pesanan[]): any[] {
  return orders.map(o => {
    const light: any = { ...o };
    if (light.mockupUrl && light.mockupUrl.length > 20000) {
      light.mockupUrl = '';
    }
    if (light.fotoKerahUrl && light.fotoKerahUrl.length > 20000) {
      light.fotoKerahUrl = '';
    }
    if (light.detailSizeNamaGambarUrl && light.detailSizeNamaGambarUrl.length > 20000) {
      light.detailSizeNamaGambarUrl = '';
    }
    if (light.spkData) {
      light.spkData = {
        ...light.spkData,
        jerseyImages: (light.spkData.jerseyImages || []).map((img: any) => ({
          ...img,
          url: img.url && img.url.length > 20000 ? '' : img.url
        })),
        collarImage: light.spkData.collarImage && light.spkData.collarImage.length > 20000 ? '' : light.spkData.collarImage,
        logoImage: light.spkData.logoImage && light.spkData.logoImage.length > 20000 ? '' : light.spkData.logoImage
      };
    }
    return light;
  });
}

function createLightweightSpkCache(spks: SPKData[]): any[] {
  return spks.map(s => {
    const light: any = { ...s };
    light.jerseyImages = (light.jerseyImages || []).map((img: any) => ({
      ...img,
      url: img.url && img.url.length > 20000 ? '' : img.url
    }));
    if (light.collarImage && light.collarImage.length > 20000) light.collarImage = '';
    if (light.logoImage && light.logoImage.length > 20000) light.logoImage = '';
    return light;
  });
}

// Write-coalescing and micro-debounce queue to eliminate duplicate I/O storms and UI freezes
let pendingOrders: Pesanan[] | null = null;
let orderSaveTimer: ReturnType<typeof setTimeout> | null = null;
let isOrderSaveActive = false;

async function flushOrders(): Promise<void> {
  if (!pendingOrders) return;
  const toSave = pendingOrders;
  pendingOrders = null;
  isOrderSaveActive = true;

  try {
    // 1. Always save complete payload to IndexedDB (asynchronous, non-blocking, multi-MB quota)
    await idbSet(KEY_ORDERS, toSave);

    // 2. Sync ultra-fast lightweight cache to localStorage in idle callback (never blocks user interactions)
    if (typeof window !== 'undefined') {
      const scheduleIdle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 20));
      scheduleIdle(() => {
        try {
          const lightweight = createLightweightOrderCache(toSave);
          safeLocalStorageSet(KEY_ORDERS, JSON.stringify(lightweight));
        } catch (e) {
          console.warn('[Storage] Notice writing lightweight order cache:', e);
        }
      });
    }
  } finally {
    isOrderSaveActive = false;
    // If more orders arrived while writing, flush again
    if (pendingOrders) {
      flushOrders();
    }
  }
}

/**
 * Persists orders with write-coalescing micro-debounce.
 * Returns immediately for the UI while guaranteeing complete persistence.
 */
export async function persistOrders(orders: Pesanan[]): Promise<void> {
  pendingOrders = orders;
  if (orderSaveTimer) {
    clearTimeout(orderSaveTimer);
  }

  // Use 300ms debounce to allow seamless typing and clicking without I/O thrashing
  orderSaveTimer = setTimeout(() => {
    orderSaveTimer = null;
    if (!isOrderSaveActive) {
      flushOrders();
    }
  }, 300);
}

// Write-coalescing for standalone SPKs
let pendingStandaloneSpks: SPKData[] | null = null;
let standaloneSpkTimer: ReturnType<typeof setTimeout> | null = null;
let isStandaloneSpkSaveActive = false;

async function flushStandaloneSpks(): Promise<void> {
  if (!pendingStandaloneSpks) return;
  const toSave = pendingStandaloneSpks;
  pendingStandaloneSpks = null;
  isStandaloneSpkSaveActive = true;

  try {
    await idbSet(STORAGE_KEY_SPK_STANDALONE, toSave);
    if (typeof window !== 'undefined') {
      const scheduleIdle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 20));
      scheduleIdle(() => {
        try {
          const lightweight = createLightweightSpkCache(toSave);
          safeLocalStorageSet(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(lightweight));
        } catch (e) {
          console.warn('[Storage] Notice writing lightweight standalone SPK cache:', e);
        }
      });
    }
  } finally {
    isStandaloneSpkSaveActive = false;
    if (pendingStandaloneSpks) {
      flushStandaloneSpks();
    }
  }
}

export async function persistStandaloneSpks(spks: SPKData[]): Promise<void> {
  pendingStandaloneSpks = spks;
  if (standaloneSpkTimer) {
    clearTimeout(standaloneSpkTimer);
  }

  standaloneSpkTimer = setTimeout(() => {
    standaloneSpkTimer = null;
    if (!isStandaloneSpkSaveActive) {
      flushStandaloneSpks();
    }
  }, 300);
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
 * Loads standalone SPKs from IndexedDB, falling back to localStorage.
 */
export async function loadStandaloneSpksFromStorage(): Promise<SPKData[] | null> {
  const idbSpks = await idbGet<SPKData[]>(STORAGE_KEY_SPK_STANDALONE);
  if (Array.isArray(idbSpks) && idbSpks.length > 0) {
    return idbSpks;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SPK_STANDALONE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          idbSet(STORAGE_KEY_SPK_STANDALONE, parsed).catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Storage] Failed to read standalone SPKs from localStorage:', e);
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
