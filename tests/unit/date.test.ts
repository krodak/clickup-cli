import { describe, it, expect } from 'vitest'
import { formatDate } from '../../src/date.js'

describe('formatDate', () => {
  it('formats a numeric timestamp correctly', () => {
    const ts = Date.UTC(2025, 5, 15)
    expect(formatDate(ts)).toBe('2025-06-15')
  })

  it('handles string input', () => {
    const ts = String(Date.UTC(2025, 0, 1))
    expect(formatDate(ts)).toBe('2025-01-01')
  })

  it('handles numeric input', () => {
    const ts = Date.UTC(2024, 11, 25)
    expect(formatDate(ts)).toBe('2024-12-25')
  })

  it('pads single-digit months and days', () => {
    const ts = Date.UTC(2025, 2, 5)
    expect(formatDate(ts)).toBe('2025-03-05')
  })
})
