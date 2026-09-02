import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter } from '../../../src/util/rate-limit.js'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a burst up to the per-minute budget through without waiting', async () => {
    const limiter = createRateLimiter(3)
    const order: number[] = []
    await Promise.all([
      limiter.acquire().then(() => order.push(1)),
      limiter.acquire().then(() => order.push(2)),
      limiter.acquire().then(() => order.push(3)),
    ])
    expect(order).toEqual([1, 2, 3])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('delays the request that exceeds the budget until a slot frees', async () => {
    const limiter = createRateLimiter(2)
    await limiter.acquire()
    await limiter.acquire()

    let released = false
    const third = limiter.acquire().then(() => {
      released = true
    })
    await vi.advanceTimersByTimeAsync(29_000)
    expect(released).toBe(false)
    await vi.advanceTimersByTimeAsync(1_000)
    await third
    expect(released).toBe(true)
  })

  it('refills continuously rather than in fixed windows', async () => {
    const limiter = createRateLimiter(60) // one per second
    for (let i = 0; i < 60; i++) await limiter.acquire()

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
