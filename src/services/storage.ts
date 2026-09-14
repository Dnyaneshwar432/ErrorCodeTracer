import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DatasetMetadata, ErrorRecord, SearchHistoryItem } from '../types/errorCode';

interface MSErrorCodeDBSchema extends DBSchema {
  datasets: {
    key: string;
    value: {
      meta: DatasetMetadata;
      records: ErrorRecord[];
    };
  };
}

const DB_NAME = 'MSErrorCodeDB';
const DB_VERSION = 1;
const DATASET_KEY = 'active_dataset';
const HISTORY_KEY = 'ms_search_history_v1';
const THEME_KEY = 'ms_theme_preference';

let dbPromise: Promise<IDBPDatabase<MSErrorCodeDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<MSErrorCodeDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<MSErrorCodeDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets');
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Persists the entire dataset and its records into IndexedDB
 */
export async function saveDataset(meta: DatasetMetadata, records: ErrorRecord[]): Promise<void> {
  const db = await getDB();
  await db.put('datasets', { meta, records }, DATASET_KEY);
}

/**
 * Loads the active dataset from IndexedDB on startup or refresh
 */
export async function loadDataset(): Promise<{ meta: DatasetMetadata; records: ErrorRecord[] } | null> {
  try {
    const db = await getDB();
    const data = await db.get('datasets', DATASET_KEY);
    return data || null;
  } catch (err) {
    console.error('Failed to load dataset from IndexedDB', err);
    return null;
  }
}

/**
 * Clears the active dataset from IndexedDB
 */
export async function clearDataset(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('datasets', DATASET_KEY);
  } catch (err) {
    console.error('Failed to clear dataset from IndexedDB', err);
  }
}

/**
 * Search history stored in localStorage
 */
export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string, matchedCount: number, sampleMicroservice?: string): SearchHistoryItem[] {
  const clean = query.trim();
  if (!clean) return getSearchHistory();

  try {
    const current = getSearchHistory();
    // Remove if already exists to bump to top
    const filtered = current.filter((item) => item.query.toLowerCase() !== clean.toLowerCase());

    const newItem: SearchHistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      query: clean,
      timestamp: Date.now(),
      matchedCount,
      sampleMicroservice
    };

    const updated = [newItem, ...filtered].slice(0, 15); // keep top 15
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function getStoredTheme(): 'dark' | 'light' {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
    return 'dark'; // default developer dark mode
  } catch {
    return 'dark';
  }
}

export function setStoredTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}
