import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter } from '../../../src/util/rate-limit.js'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a small burst through without waiting', async () => {
    const limiter = createRateLimiter(60) // burst capacity = max(5, 6) = 6
    const order: number[] = []
    await Promise.all([
      limiter.acquire().then(() => order.push(1)),
      limiter.acquire().then(() => order.push(2)),
      limiter.acquire().then(() => order.push(3)),
    ])
    expect(order).toEqual([1, 2, 3])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('delays the request that exceeds the burst until a token refills', async () => {
    const limiter = createRateLimiter(60) // 1 token per second, burst 6
    for (let i = 0; i < 6; i++) await limiter.acquire()

    let released = false
    const next = limiter.acquire().then(() => {
      released = true
    })
    await vi.advanceTimersByTimeAsync(900)
    expect(released).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    await next
    expect(released).toBe(true)
  })

  it('refills continuously rather than in fixed windows', async () => {
    const limiter = createRateLimiter(60) // one per second
    for (let i = 0; i < 6; i++) await limiter.acquire()

    let released = 0
    const a = limiter.acquire().then(() => released++)
    const b = limiter.acquire().then(() => released++)
    await vi.advanceTimersByTimeAsync(1_000)
    await a
    expect(released).toBe(1)
    await vi.advanceTimersByTimeAsync(1_000)
    await b
    expect(released).toBe(2)
  })

  it('rejects a non-positive rate', () => {
    expect(() => createRateLimiter(0)).toThrow('requestsPerMinute must be a positive number')
    expect(() => createRateLimiter(-5)).toThrow('requestsPerMinute must be a positive number')
  })
})

describe('createRateLimiter burst and backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('caps the initial burst well below the per-minute budget', async () => {
    const limiter = createRateLimiter(90)
    let released = 0
    const pending = Array.from({ length: 30 }, () => limiter.acquire().then(() => released++))
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)
    // Default burst is 10% of the budget (min 5), not the whole minute's worth.
    expect(released).toBe(9)
    await vi.advanceTimersByTimeAsync(60_000)
    await Promise.all(pending)
    expect(released).toBe(30)
  })

  it('penalize() empties the bucket so the next request waits a full slot', async () => {
    const limiter = createRateLimiter(60)
    await limiter.acquire()
    limiter.penalize()
    let released = false
    const p = limiter.acquire().then(() => {
      released = true
    })
    await vi.advanceTimersByTimeAsync(900)
    expect(released).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    await p
    expect(released).toBe(true)
  })
})
