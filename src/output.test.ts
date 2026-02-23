import { describe, it, expect } from 'vitest'
import { formatTable, isTTY } from './output.js'

describe('formatTable', () => {
  it('includes column labels in output', () => {
    const result = formatTable(
      [{ id: 'abc123', name: 'My task', status: 'open', list: 'Sprint 1' }],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 20 },
        { key: 'status', label: 'STATUS' },
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
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 20 },
      ]
    )
    expect(result).toContain('abc123')
    expect(result).toContain('My task')
  })

  it('truncates long values to column maxWidth with ellipsis', () => {
    const result = formatTable(
      [{ name: 'This is a very long task name that exceeds the column width limit' }],
      [{ key: 'name', label: 'NAME', maxWidth: 20 }]
    )
    expect(result).toContain('This is a very long')
    expect(result).not.toContain('limit')
    expect(result).toContain('…')
  })

  it('handles missing keys with empty string', () => {
    const result = formatTable(
      [{ id: 'abc' }],
      [
        { key: 'id', label: 'ID' },
        { key: 'missing', label: 'MISSING' },
      ]
    )
    expect(result).toContain('abc')
  })

  it('returns empty table with just header when no rows', () => {
    const result = formatTable([], [{ key: 'id', label: 'ID' }])
    expect(result).toContain('ID')
  })

  it('does not truncate status column', () => {
    const result = formatTable(
      [{ status: 'needs definition' }],
      [{ key: 'status', label: 'STATUS' }]
    )
    expect(result).toContain('needs definition')
    expect(result).not.toContain('…')
  })

  it('auto-sizes columns from data', () => {
    const result = formatTable(
      [
        { id: 'abc', name: 'Short' },
        { id: 'defghi', name: 'Longer name here' },
      ],
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME', maxWidth: 60 },
      ]
    )
    expect(result).toContain('defghi')
    expect(result).toContain('Short')
    expect(result).not.toContain('…')
  })

  it('caps NAME column at maxWidth and truncates', () => {
    const longName = 'A'.repeat(80)
    const result = formatTable(
      [{ name: longName }],
      [{ key: 'name', label: 'NAME', maxWidth: 60 }]
    )
    expect(result).toContain('…')
    expect(result).not.toContain(longName)
  })
})

describe('isTTY', () => {
  it('returns a boolean', () => {
    expect(typeof isTTY()).toBe('boolean')
  })
})
