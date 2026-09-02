export interface RateLimiter {
  /** Resolves when the caller may send one request. */
  acquire(): Promise<void>
  /** Called after a 429: empty the bucket so the next request waits a full slot. */
  penalize(): void
}

/**
 * Token-bucket limiter with a small burst: tokens refill continuously at
 * `requestsPerMinute`, but the bucket only holds ~10% of a minute's worth, so
 * a cold start cannot fire a minute of requests at once. ClickUp's limit is
 * enforced on a rolling window, and a full-capacity burst on start reliably
 * tripped it even at 90/min. Callers are released in FIFO order.
 */
export function createRateLimiter(requestsPerMinute: number): RateLimiter {
  if (!(requestsPerMinute > 0)) {
    throw new Error(`requestsPerMinute must be a positive number, got ${requestsPerMinute}`)
  }
  const capacity = Math.max(5, Math.floor(requestsPerMinute / 10))
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
      // Deliberately ref'd: a pending throttle IS pending work. The callback
      // always clears `timer`, so nothing lingers once the queue is empty.
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
    penalize(): void {
      refill()
      tokens = 0
    },
  }
}
