import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseSprintDates, findActiveSprintList, runSprintCommand, extractSpaceKeywords, findRelatedSpaces } from './sprint.js'
import { ClickUpClient } from '../api.js'

describe('parseSprintDates', () => {
  it('parses M/D - M/D format', () => {
    const result = parseSprintDates('Acme Sprint 4 (3/1 - 3/14)')
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

describe('extractSpaceKeywords', () => {
  it('extracts meaningful words from space name', () => {
    expect(extractSpaceKeywords('Product - Acme')).toEqual(['acme'])
  })

  it('filters out noise words', () => {
    expect(extractSpaceKeywords('Product Team')).toEqual([])
  })

  it('handles emoji-prefixed names', () => {
    const result = extractSpaceKeywords('Acme Roadmap')
    expect(result).toContain('acme')
    expect(result).toContain('roadmap')
  })
})

describe('findRelatedSpaces', () => {
  it('returns spaces matching keywords from my spaces', () => {
    const allSpaces = [
      { id: 's1', name: 'Product - Acme' },
      { id: 's2', name: 'Acme Team' },
      { id: 's3', name: 'Platform Team' },
    ]
    const result = findRelatedSpaces(new Set(['s1']), allSpaces)
    expect(result.map(s => s.id)).toContain('s1')
    expect(result.map(s => s.id)).toContain('s2')
    expect(result.map(s => s.id)).not.toContain('s3')
  })

  it('falls back to all spaces when no keywords extracted', () => {
    const allSpaces = [
      { id: 's1', name: 'Product' },
      { id: 's2', name: 'Team' },
    ]
    const result = findRelatedSpaces(new Set(['s1']), allSpaces)
    expect(result).toHaveLength(2)
  })
})

describe('runSprintCommand space handling', () => {
  const baseTask = {
    id: 't1', name: 'Task', status: { status: 'in progress', color: '#fff' },
    assignees: [] as Array<{ id: number; username: string }>, url: 'https://app.clickup.com/t/t1',
    list: { id: 'l1', name: 'Acme Sprint 4 (3/1 - 3/14)' },
    space: { id: 's1' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('searches related spaces only and returns tasks via view API', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([baseTask])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Product - Acme' },
      { id: 's2', name: 'Acme Team' },
      { id: 's3', name: 'US Team' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Acme Sprint' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Acme Sprint 4 (3/1 - 3/14)' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getMe').mockResolvedValue({ id: 1, username: 'user' })
    vi.spyOn(ClickUpClient.prototype, 'getListViews').mockResolvedValue({
      views: [],
      required_views: { list: { id: 'v1', name: 'List', type: 'list' } },
    })
    vi.spyOn(ClickUpClient.prototype, 'getViewTasks').mockResolvedValue([
      { ...baseTask, assignees: [{ id: 1, username: 'user' }] },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, {})

    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).toHaveBeenCalledWith('s2')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s3')
  })

  it('--space override filters by partial name', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Acme' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Acme Sprint' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Acme Sprint 4 (3/1 - 3/14)' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getMe').mockResolvedValue({ id: 1, username: 'user' })
    vi.spyOn(ClickUpClient.prototype, 'getListViews').mockResolvedValue({
      views: [],
      required_views: { list: { id: 'v1', name: 'List', type: 'list' } },
    })
    vi.spyOn(ClickUpClient.prototype, 'getViewTasks').mockResolvedValue([])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, { space: 'Kay' })

    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s2')
  })

  it('throws when --space filter matches no spaces', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Acme' },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await expect(runSprintCommand(config, { space: 'nonexistent' })).rejects.toThrow(
      'No space matching "nonexistent" found'
    )
  })

  it('matches --space by exact ID', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Acme' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await expect(runSprintCommand(config, { space: 's2' })).rejects.toThrow('No sprint list found')
    expect(mockGetFolders).toHaveBeenCalledWith('s2')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s1')
  })
})
