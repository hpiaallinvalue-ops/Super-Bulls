interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const DB_NAME = 'super-bulls-cache';
const STORE_NAME = 'api-cache';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

class CacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch {
        reject(new Error('IndexedDB not available'));
      }
    });

    return this.dbPromise;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private storageKey(key: string): string {
    return `sb_cache_${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;
          if (!entry || this.isExpired(entry)) {
            resolve(null);
            return;
          }
          resolve(entry.data);
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      // Fallback to localStorage
      return this.getLocal<T>(key);
    }
  }

  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
        store.put(entry, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          // Fallback to localStorage
          this.setLocal(key, data, ttl);
          resolve();
        };
      });
    } catch {
      await this.setLocal(key, data, ttl);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // Clear localStorage cache entries
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb_cache_'));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }

  // History management
  async getHistory(): Promise<unknown[]> {
    try {
      const data = await this.get<unknown[]>('video_history');
      return data || [];
    } catch {
      return [];
    }
  }

  async addToHistory(video: unknown): Promise<void> {
    try {
      const history = await this.getHistory();
      // Deduplicate by videoId
      const filtered = history.filter(
        (v: Record<string, string>) => v.videoId !== (video as Record<string, string>).videoId
      );
      filtered.unshift(video);
      // Keep last 100 entries
      const trimmed = filtered.slice(0, 100);
      await this.set('video_history', trimmed, 24 * 60 * 60 * 1000); // 24 hour TTL for history
    } catch {
      // Silently fail
    }
  }

  async getHistoryVideoIds(): Promise<string[]> {
    const history = await this.getHistory();
    return (history as Record<string, string>[]).map(v => v.videoId);
  }

  // localStorage fallback
  private getLocal<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.storageKey(key));
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (this.isExpired(entry)) {
        localStorage.removeItem(this.storageKey(key));
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  private setLocal<T>(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      // Silently fail
    }
  }
}

export const cache = new CacheService();
