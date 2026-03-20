import { describe, it, expect } from 'vitest'
import { formatDate, formatTimestamp, formatDuration, formatDateISO } from '../../src/date.js'

describe('formatDate', () => {
  it('formats a timestamp as human-readable local date', () => {
    const ts = new Date(2025, 2, 15).getTime()
    expect(formatDate(ts)).toBe('Mar 15, 2025')
  })

  it('handles string input', () => {
    const ts = String(new Date(2025, 0, 1).getTime())
    expect(formatDate(ts)).toBe('Jan 1, 2025')
  })

  it('handles numeric input', () => {
    const ts = new Date(2024, 11, 25).getTime()
    expect(formatDate(ts)).toBe('Dec 25, 2024')
  })
})

describe('formatTimestamp', () => {
  it('formats a timestamp with date and time', () => {
    const ts = new Date(2025, 2, 15, 10, 30).getTime()
    const result = formatTimestamp(ts)
    expect(result).toContain('Mar')
    expect(result).toContain('15')
    expect(result).toContain('10:30')
  })

  it('handles string input', () => {
    const ts = String(new Date(2025, 0, 1, 14, 0).getTime())
    const result = formatTimestamp(ts)
    expect(result).toContain('Jan')
    expect(result).toContain('1')
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(5400000)).toBe('1h 30m')
  })

  it('formats hours only', () => {
    expect(formatDuration(7200000)).toBe('2h')
  })

  it('formats minutes only', () => {
    expect(formatDuration(900000)).toBe('15m')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('handles negative values (absolute)', () => {
    expect(formatDuration(-3600000)).toBe('1h')
  })
})

describe('formatDateISO', () => {
  it('formats a timestamp as YYYY-MM-DD in local time', () => {
    const ts = new Date(2025, 5, 15, 12, 0).getTime()
    expect(formatDateISO(ts)).toBe('2025-06-15')
  })

  it('handles string input', () => {
    const ts = String(new Date(2025, 0, 1, 12, 0).getTime())
    expect(formatDateISO(ts)).toBe('2025-01-01')
  })

  it('pads single-digit months and days', () => {
    const ts = new Date(2025, 2, 5, 12, 0).getTime()
    expect(formatDateISO(ts)).toBe('2025-03-05')
  })
})
