import { describe, it, expect } from 'vitest'
import { formatTable, isTTY } from './output.js'

describe('formatTable', () => {
  it('includes column labels in output', () => {
    const result = formatTable(
      [{ id: 'abc123', name: 'My task', status: 'open', list: 'Sprint 1' }],
      [
        { key: 'id', label: 'ID', width: 10 },
        { key: 'name', label: 'NAME', width: 20 },
        { key: 'status', label: 'STATUS', width: 10 },
      ]
    )
    expect(result).toContain('ID')
    expect(result).toContain('NAME')
    expect(result).toContain('STATUS')
  })

  it('includes row values', () => {
    const result = formatTable(
      [{ id: 'abc123', name: 'My task', status: 'open' }],
      [
        { key: 'id', label: 'ID', width: 10 },
        { key: 'name', label: 'NAME', width: 20 },
      ]
    )
    expect(result).toContain('abc123')
    expect(result).toContain('My task')
  })

  it('truncates long values to column width with ellipsis', () => {
    const result = formatTable(
      [{ name: 'This is a very long task name that exceeds the column width limit' }],
      [{ key: 'name', label: 'NAME', width: 20 }]
    )
    expect(result).toContain('This is a very long')
    expect(result).not.toContain('limit')
    expect(result).toContain('…')
  })

  it('handles missing keys with empty string', () => {
    const result = formatTable(
      [{ id: 'abc' }],
      [
        { key: 'id', label: 'ID', width: 10 },
        { key: 'missing', label: 'MISSING', width: 10 },
      ]
    )
    expect(result).toContain('abc')
  })

  it('returns empty table with just header when no rows', () => {
    const result = formatTable([], [{ key: 'id', label: 'ID', width: 10 }])
    expect(result).toContain('ID')
  })
})

describe('isTTY', () => {
  it('returns a boolean', () => {
    expect(typeof isTTY()).toBe('boolean')
  })
})
