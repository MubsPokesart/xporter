// lib/rate-limit.ts
// In-memory sliding window rate limiter — zero dependencies

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 60 seconds
const DEFAULT_MAX_REQUESTS = 10;

/**
 * Check whether a key (typically an IP) is within rate limits.
 * Uses a sliding window: only timestamps within the last `windowMs` count.
 */
export function rateLimit(
  key: string,
  {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
  } = {}
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Prune stale entries on every call to prevent memory leaks
  for (const [k, entry] of store) {
    if (entry.timestamps.every((t) => t < windowStart)) {
      store.delete(k);
    }
  }

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Drop timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t >= windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;
    return {
      success: false,
      remaining: 0,
      resetAt,
    };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}
