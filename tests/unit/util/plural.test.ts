import { describe, expect, it } from 'vitest'
import { plural } from '../../../src/util/plural.js'

describe('plural', () => {
  it('appends s for counts other than 1', () => {
    expect(plural(0, 'task')).toBe('0 tasks')
    expect(plural(1, 'task')).toBe('1 task')
    expect(plural(2, 'task')).toBe('2 tasks')
  })

  it('accepts an explicit plural form', () => {
    expect(plural(1, 'initiative')).toBe('1 initiative')
    expect(plural(3, 'initiative')).toBe('3 initiatives')
    expect(plural(1, 'entry', 'entries')).toBe('1 entry')
    expect(plural(2, 'entry', 'entries')).toBe('2 entries')
  })
})
