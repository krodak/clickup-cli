export interface RateLimiter {
  /** Resolves when the caller may send one request. */
  acquire(): Promise<void>
}

/**
 * Token-bucket limiter: a burst up to `requestsPerMinute` passes immediately,
 * then tokens refill continuously at that rate. Callers are released in FIFO
 * order. Used to stay under ClickUp's per-token budget during bulk crawls,
 * where reactive 429 backoff alone wastes a whole minute per trip.
 */
export function createRateLimiter(requestsPerMinute: number): RateLimiter {
  if (!(requestsPerMinute > 0)) {
    throw new Error(`requestsPerMinute must be a positive number, got ${requestsPerMinute}`)
  }
  const capacity = requestsPerMinute
  const refillPerMs = requestsPerMinute / 60_000
  let tokens = capacity
  let lastRefill = Date.now()
  const queue: Array<() => void> = []
  let timer: NodeJS.Timeout | undefined

  function refill(): void {
    const now = Date.now()
    tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerMs)
    lastRefill = now
  }

  function drain(): void {
    timer = undefined
    refill()
    while (queue.length > 0 && tokens >= 1) {
      tokens -= 1
      queue.shift()!()
    }
    if (queue.length > 0) {
      const waitMs = Math.ceil((1 - tokens) / refillPerMs)
      timer = setTimeout(drain, waitMs)
    }
  }

  return {
    acquire(): Promise<void> {
      return new Promise<void>(resolve => {
        queue.push(resolve)
        if (!timer) drain()
      })
    },
  }
}
