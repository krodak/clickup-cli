import { describe, it, expect } from 'vitest'
import { matchStatus } from '../../src/status.js'

describe('matchStatus', () => {
  const statuses = ['open', 'in progress', 'review', 'done', 'closed']

  it('returns exact match', () => {
    expect(matchStatus('done', statuses)).toBe('done')
  })

  it('matches case-insensitively', () => {
    expect(matchStatus('Done', statuses)).toBe('done')
    expect(matchStatus('IN PROGRESS', statuses)).toBe('in progress')
  })

  it('matches starts-with', () => {
    expect(matchStatus('in', statuses)).toBe('in progress')
  })

  it('matches contains', () => {
    expect(matchStatus('prog', statuses)).toBe('in progress')
  })

  it('prefers exact over starts-with', () => {
    const withExact = ['open', 'open source', 'opened']
    expect(matchStatus('open', withExact)).toBe('open')
  })

  it('prefers starts-with over contains', () => {
    const mixed = ['not reviewed', 'review', 'in review']
    expect(matchStatus('rev', mixed)).toBe('review')
  })

  it('returns null when no match', () => {
    expect(matchStatus('nonexistent', statuses)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(matchStatus('', statuses)).toBeNull()
  })

  it('returns first starts-with match when multiple exist', () => {
    const multiple = ['done', 'doing', 'dormant']
    expect(matchStatus('do', multiple)).toBe('done')
  })

  it('returns first contains match when multiple exist', () => {
    const multiple = ['needs review', 'in review']
    expect(matchStatus('review', multiple)).toBe('needs review')
  })
})
