export type BatchOutcome<T, R> =
  | { item: T; ok: true; result: R }
  | { item: T; ok: false; error: Error }

export async function runInBatches<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<BatchOutcome<T, R>[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`concurrency must be a positive integer, got ${concurrency}`)
  }
  const results: BatchOutcome<T, R>[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map(fn))
    settled.forEach((res, idx) => {
      const item = batch[idx]!
      if (res.status === 'fulfilled') {
        results.push({ item, ok: true, result: res.value })
      } else {
        const error =
          res.reason instanceof Error
            ? res.reason
            : new Error(String(res.reason), { cause: res.reason })
        results.push({ item, ok: false, error })
      }
    })
  }
  return results
}
