/** @type {Map<string, number[]>} */
const windows = new Map();

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Sliding-window rate limiter keyed by shopId.
 * @param {string} key
 * @param {{ limit?: number, windowMs?: number }} [opts]
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
export function checkRateLimit(key, opts = {}) {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  const cutoff = now - windowMs;

  let timestamps = windows.get(key);
  if (!timestamps) {
    timestamps = [];
    windows.set(key, timestamps);
  }

  // Prune old entries
  while (timestamps.length > 0 && timestamps[0] <= cutoff) {
    timestamps.shift();
  }

  if (timestamps.length >= limit) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  timestamps.push(now);
  return { allowed: true };
}
