import { describe, it, expect } from 'vitest'
import { parseSprintDates, findActiveSprintList } from './sprint.js'

describe('parseSprintDates', () => {
  it('parses M/D - M/D format', () => {
    const result = parseSprintDates('Kayenta Sprint 4 (2/12 - 2/25)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(1) // Feb = month index 1
    expect(result!.start.getDate()).toBe(12)
    expect(result!.end.getMonth()).toBe(1)
    expect(result!.end.getDate()).toBe(25)
  })

  it('parses format without spaces around dash', () => {
    const result = parseSprintDates('Sprint (1/1-1/14)')
    expect(result).not.toBeNull()
    expect(result!.start.getDate()).toBe(1)
    expect(result!.end.getDate()).toBe(14)
  })

  it('returns null when no date pattern found', () => {
    expect(parseSprintDates('Backlog')).toBeNull()
    expect(parseSprintDates('Sprint 4')).toBeNull()
    expect(parseSprintDates('')).toBeNull()
  })
})

describe('findActiveSprintList', () => {
  const today = new Date('2026-02-20')

  it('returns list whose date range includes today', () => {
    const lists = [
      { id: 'l1', name: 'Sprint 3 (1/1 - 2/10)' },
      { id: 'l2', name: 'Sprint 4 (2/12 - 2/25)' },
      { id: 'l3', name: 'Sprint 5 (2/26 - 3/11)' },
    ]
    const result = findActiveSprintList(lists, today)
    expect(result?.id).toBe('l2')
  })

  it('falls back to last list when no date matches today', () => {
    const lists = [
      { id: 'l1', name: 'Sprint 1' },
      { id: 'l2', name: 'Sprint 2' },
    ]
    const result = findActiveSprintList(lists, today)
    expect(result?.id).toBe('l2')
  })

  it('returns null when list is empty', () => {
    expect(findActiveSprintList([], today)).toBeNull()
  })

  it('returns single list when only one exists', () => {
    const lists = [{ id: 'l1', name: 'Sprint 1' }]
    expect(findActiveSprintList(lists, today)?.id).toBe('l1')
  })
})
