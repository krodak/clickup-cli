import { describe, it, expect } from 'vitest'
import { runInBatches } from '../../../src/util/batch.js'

describe('runInBatches', () => {
  it('returns ok outcomes for successful items', async () => {
    const outcomes = await runInBatches(['a', 'b', 'c'], 2, async item => item.toUpperCase())
    expect(outcomes).toEqual([
      { item: 'a', ok: true, result: 'A' },
      { item: 'b', ok: true, result: 'B' },
      { item: 'c', ok: true, result: 'C' },
    ])
  })

  it('returns error outcomes for failed items', async () => {
    const outcomes = await runInBatches(['a', 'b'], 2, async item => {
      throw new Error(`boom ${item}`)
    })
    expect(outcomes).toHaveLength(2)
    expect(outcomes[0]).toMatchObject({ item: 'a', ok: false })
    expect(outcomes[1]).toMatchObject({ item: 'b', ok: false })
    expect(outcomes[0]!.ok).toBe(false)
    if (!outcomes[0]!.ok) {
      expect(outcomes[0]!.error).toBeInstanceOf(Error)
      expect(outcomes[0]!.error.message).toBe('boom a')
    }
  })

  it('preserves item order in results', async () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const outcomes = await runInBatches(items, 3, async item => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5))
      return item
    })
    expect(outcomes.map(o => o.item)).toEqual(items)
    expect(outcomes.every(o => o.ok)).toBe(true)
  })

  it('mixes ok and error outcomes while preserving order', async () => {
    const outcomes = await runInBatches(['a', 'b', 'c', 'd'], 2, async item => {
      if (item === 'b' || item === 'c') throw new Error(`fail ${item}`)
      return item.toUpperCase()
    })
    expect(outcomes.map(o => ({ item: o.item, ok: o.ok }))).toEqual([
      { item: 'a', ok: true },
      { item: 'b', ok: false },
      { item: 'c', ok: false },
      { item: 'd', ok: true },
    ])
  })

  it('respects concurrency limit and processes remaining items in the next batch', async () => {
    const inFlight: string[] = []
    let peak = 0
    const resolvers: Array<() => void> = []

    const items = ['t1', 't2', 't3', 't4', 't5', 't6', 't7']
    const promise = runInBatches(items, 3, async item => {
      inFlight.push(item)
      peak = Math.max(peak, inFlight.length)
      await new Promise<void>(resolve => {
        resolvers.push(() => {
          inFlight.splice(inFlight.indexOf(item), 1)
          resolve()
        })
      })
      return item
    })

    while (resolvers.length < 3) {
      await Promise.resolve()
    }
    expect(inFlight).toHaveLength(3)
    for (const resolver of resolvers.splice(0, 3)) resolver()

    while (resolvers.length < 3) {
      await Promise.resolve()
    }
    expect(inFlight).toHaveLength(3)
    for (const resolver of resolvers.splice(0, 3)) resolver()

    while (resolvers.length < 1) {
      await Promise.resolve()
    }
    for (const resolver of resolvers.splice(0, 1)) resolver()

    const outcomes = await promise
    expect(outcomes).toHaveLength(7)
    expect(outcomes.every(o => o.ok)).toBe(true)
    expect(peak).toBe(3)
  })

  it('throws on zero concurrency', async () => {
    await expect(runInBatches(['a'], 0, async item => item)).rejects.toThrow(
      'concurrency must be a positive integer',
    )
  })

  it('throws on negative concurrency', async () => {
    await expect(runInBatches(['a'], -1, async item => item)).rejects.toThrow(
      'concurrency must be a positive integer',
    )
  })

  it('throws on non-integer concurrency', async () => {
    await expect(runInBatches(['a'], 1.5, async item => item)).rejects.toThrow(
      'concurrency must be a positive integer',
    )
  })

  it('wraps non-Error rejections in Error with cause', async () => {
    const outcomes = await runInBatches(['a'], 1, () =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentionally testing non-Error rejection handling
      Promise.reject('plain string'),
    )
    expect(outcomes).toHaveLength(1)
    const outcome = outcomes[0]!
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.error).toBeInstanceOf(Error)
      expect(outcome.error.message).toBe('plain string')
      expect(outcome.error.cause).toBe('plain string')
    }
  })

  it('returns an empty array for empty input', async () => {
    const outcomes = await runInBatches([], 5, async item => item)
    expect(outcomes).toEqual([])
  })
})
