import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/output.js', () => ({
  formatTable: vi.fn().mockReturnValue('formatted-table'),
  isTTY: vi.fn().mockReturnValue(true),
}))

describe('validateFavoriteType', () => {
  it('accepts all valid types', async () => {
    const { validateFavoriteType } = await import('../../../src/commands/favorite.js')
    for (const type of ['sprint-folder', 'space', 'list', 'folder', 'view', 'task']) {
      expect(() => validateFavoriteType(type)).not.toThrow()
    }
  })

  it('rejects invalid type', async () => {
    const { validateFavoriteType } = await import('../../../src/commands/favorite.js')
    expect(() => validateFavoriteType('bogus')).toThrow('Invalid favorite type: "bogus"')
  })
})

describe('slugify', () => {
  it('converts names to url-friendly aliases', async () => {
    const { slugify } = await import('../../../src/commands/favorite.js')
    expect(slugify('Sprint Folder')).toBe('sprint-folder')
    expect(slugify('My Space 123')).toBe('my-space-123')
  })

  it('strips leading and trailing hyphens', async () => {
    const { slugify } = await import('../../../src/commands/favorite.js')
    expect(slugify('---test---')).toBe('test')
  })
})

describe('formatFavoritesTable', () => {
  it('returns empty message when no favorites', async () => {
    const { formatFavoritesTable } = await import('../../../src/commands/favorite.js')
    expect(formatFavoritesTable({})).toBe('No favorites saved')
  })

  it('formats favorites via formatTable', async () => {
    const { formatTable } = await import('../../../src/output.js')
    const { formatFavoritesTable } = await import('../../../src/commands/favorite.js')
    const result = formatFavoritesTable({
      'my-sprint': { type: 'sprint-folder', id: '456', name: 'Sprint Folder' },
    })
    expect(result).toBe('formatted-table')
    expect(formatTable).toHaveBeenCalledWith(
      [{ alias: 'my-sprint', type: 'sprint-folder', id: '456', name: 'Sprint Folder' }],
      expect.any(Array),
    )
  })
})

describe('formatFavoritesMarkdown', () => {
  it('returns empty message when no favorites', async () => {
    const { formatFavoritesMarkdown } = await import('../../../src/commands/favorite.js')
    expect(formatFavoritesMarkdown({})).toBe('No favorites saved')
  })

  it('formats as markdown table', async () => {
    const { formatFavoritesMarkdown } = await import('../../../src/commands/favorite.js')
    const result = formatFavoritesMarkdown({
      'my-sprint': { type: 'sprint-folder', id: '456', name: 'Sprint Folder' },
      backend: { type: 'space', id: '789' },
    })
    expect(result).toContain('| Alias | Type | ID | Name |')
    expect(result).toContain('| my-sprint | sprint-folder | 456 | Sprint Folder |')
    expect(result).toContain('| backend | space | 789 |  |')
  })
})
