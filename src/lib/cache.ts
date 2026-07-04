type CacheEntry<T = any> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private activePending = new Map<string, Promise<any>>();

  constructor() {
    // Periodically clean expired entries (every 1 minute)
    if (typeof window === 'undefined') {
      setInterval(() => this.cleanExpired(), 60000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 900): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  // Deduplicate concurrent requests
  async getOrCreatePending<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    // Check if in cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if already fetching in background
    let pending = this.activePending.get(key);
    if (pending) {
      console.log(`[Cache] Deduplicating pending request for key: ${key}`);
      return pending;
    }

    // Create the promise and execute
    pending = fetchFn()
      .then((data) => {
        this.set(key, data);
        this.activePending.delete(key);
        return data;
      })
      .catch((err) => {
        this.activePending.delete(key);
        throw err;
      });

    this.activePending.set(key, pending);
    return pending;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Global server-side cache instance
export const serverCache = new MemoryCache();
export default serverCache;
