import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseSprintDates,
  findActiveSprintList,
  runSprintCommand,
  extractSpaceKeywords,
  findRelatedSpaces,
  SPRINT_KEYWORDS,
} from '../../../src/commands/sprint.js'
import { ClickUpClient } from '../../../src/api.js'

describe('SPRINT_KEYWORDS', () => {
  it('contains expected keywords', () => {
    expect(SPRINT_KEYWORDS).toContain('sprint')
    expect(SPRINT_KEYWORDS).toContain('iteration')
    expect(SPRINT_KEYWORDS).toContain('cycle')
    expect(SPRINT_KEYWORDS).toContain('scrum')
  })

  it('matches folder names with "iteration"', () => {
    const folders = [
      { id: 'f1', name: 'Development Iterations' },
      { id: 'f2', name: 'Backlog' },
    ]
    const matched = folders.filter(f => {
      const lower = f.name.toLowerCase()
      return SPRINT_KEYWORDS.some(kw => lower.includes(kw))
    })
    expect(matched).toHaveLength(1)
    expect(matched[0]!.id).toBe('f1')
  })

  it('matches folder names with "cycle"', () => {
    const folders = [
      { id: 'f1', name: 'Dev Cycle 4' },
      { id: 'f2', name: 'Archive' },
    ]
    const matched = folders.filter(f => {
      const lower = f.name.toLowerCase()
      return SPRINT_KEYWORDS.some(kw => lower.includes(kw))
    })
    expect(matched).toHaveLength(1)
    expect(matched[0]!.id).toBe('f1')
  })
})

describe('parseSprintDates', () => {
  it('parses M/D - M/D format (US)', () => {
    const result = parseSprintDates('Acme Sprint 4 (3/1 - 3/14)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(2)
    expect(result!.start.getDate()).toBe(1)
    expect(result!.end.getMonth()).toBe(2)
    expect(result!.end.getDate()).toBe(14)
  })

  it('parses format without spaces around dash', () => {
    const result = parseSprintDates('Sprint (1/1-1/14)')
    expect(result).not.toBeNull()
    expect(result!.start.getDate()).toBe(1)
    expect(result!.end.getDate()).toBe(14)
  })

  it('parses en-dash separator', () => {
    const result = parseSprintDates('Sprint (2/12 \u2013 2/25)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(1)
    expect(result!.start.getDate()).toBe(12)
    expect(result!.end.getMonth()).toBe(1)
    expect(result!.end.getDate()).toBe(25)
  })

  it('parses ISO date range (YYYY-MM-DD)', () => {
    const result = parseSprintDates('Sprint 4 (2025-02-12 - 2025-02-25)')
    expect(result).not.toBeNull()
    expect(result!.start.getFullYear()).toBe(2025)
    expect(result!.start.getMonth()).toBe(1)
    expect(result!.start.getDate()).toBe(12)
    expect(result!.end.getFullYear()).toBe(2025)
    expect(result!.end.getMonth()).toBe(1)
    expect(result!.end.getDate()).toBe(25)
  })

  it('parses ISO date range with en-dash', () => {
    const result = parseSprintDates('Sprint (2026-03-01 \u2013 2026-03-14)')
    expect(result).not.toBeNull()
    expect(result!.start.getFullYear()).toBe(2026)
    expect(result!.start.getMonth()).toBe(2)
    expect(result!.end.getMonth()).toBe(2)
  })

  it('parses month-day range (Feb 12 - Feb 25)', () => {
    const result = parseSprintDates('Sprint (Feb 12 - Feb 25)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(1)
    expect(result!.start.getDate()).toBe(12)
    expect(result!.end.getMonth()).toBe(1)
    expect(result!.end.getDate()).toBe(25)
  })

  it('parses month-day range across months (Feb 12 - Mar 1)', () => {
    const result = parseSprintDates('Sprint (Feb 12 - Mar 1)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(1)
    expect(result!.end.getMonth()).toBe(2)
    expect(result!.end.getDate()).toBe(1)
  })

  it('parses European date range (12.02 - 25.02)', () => {
    const result = parseSprintDates('Sprint (12.02 - 25.02)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(1)
    expect(result!.start.getDate()).toBe(12)
    expect(result!.end.getMonth()).toBe(1)
    expect(result!.end.getDate()).toBe(25)
  })

  it('parses European date range without spaces', () => {
    const result = parseSprintDates('Sprint (1.03-14.03)')
    expect(result).not.toBeNull()
    expect(result!.start.getMonth()).toBe(2)
    expect(result!.start.getDate()).toBe(1)
    expect(result!.end.getMonth()).toBe(2)
    expect(result!.end.getDate()).toBe(14)
  })

  it('returns null when no date pattern found', () => {
    expect(parseSprintDates('Backlog')).toBeNull()
    expect(parseSprintDates('Sprint 4')).toBeNull()
    expect(parseSprintDates('')).toBeNull()
  })

  it('handles year rollover for US dates', () => {
    const result = parseSprintDates('Sprint (12/20 - 1/5)')
    expect(result).not.toBeNull()
    expect(result!.end.getFullYear()).toBe(result!.start.getFullYear() + 1)
  })

  it('handles year rollover for European dates', () => {
    const result = parseSprintDates('Sprint (20.12 - 5.01)')
    expect(result).not.toBeNull()
    expect(result!.end.getFullYear()).toBe(result!.start.getFullYear() + 1)
  })

  it('handles year rollover for month-day format', () => {
    const result = parseSprintDates('Sprint (Dec 20 - Jan 5)')
    expect(result).not.toBeNull()
    expect(result!.end.getFullYear()).toBe(result!.start.getFullYear() + 1)
  })
})

describe('findActiveSprintList', () => {
  const today = new Date('2026-03-05')

  it('returns list whose date range includes today', () => {
    const lists = [
      { id: 'l1', name: 'Sprint 3 (1/1 - 2/10)' },
      { id: 'l2', name: 'Sprint 4 (3/1 - 3/14)' },
      { id: 'l3', name: 'Sprint 5 (3/15 - 3/28)' },
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

  it('uses list start_date/due_date when name parsing fails', () => {
    const mar1 = new Date('2026-03-01').getTime()
    const mar14 = new Date('2026-03-14T23:59:59').getTime()
    const lists = [
      { id: 'l1', name: 'Sprint A', start_date: String(mar1), due_date: String(mar14) },
      { id: 'l2', name: 'Sprint B' },
    ]
    const result = findActiveSprintList(lists, today)
    expect(result?.id).toBe('l1')
  })

  it('prefers name-based parsing over list-level dates', () => {
    const jan1 = new Date('2026-01-01').getTime()
    const jan14 = new Date('2026-01-14').getTime()
    const lists = [
      {
        id: 'l1',
        name: 'Sprint 4 (3/1 - 3/14)',
        start_date: String(jan1),
        due_date: String(jan14),
      },
      { id: 'l2', name: 'Sprint 5' },
    ]
    const result = findActiveSprintList(lists, today)
    expect(result?.id).toBe('l1')
  })

  it('falls back to last list when neither name nor dates match', () => {
    const jan1 = new Date('2026-01-01').getTime()
    const jan14 = new Date('2026-01-14').getTime()
    const lists = [
      { id: 'l1', name: 'Sprint Old', start_date: String(jan1), due_date: String(jan14) },
      { id: 'l2', name: 'Sprint Newer' },
    ]
    const result = findActiveSprintList(lists, today)
    expect(result?.id).toBe('l2')
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
    id: 't1',
    name: 'Task',
    status: { status: 'in progress', color: '#fff' },
    assignees: [] as Array<{ id: number; username: string }>,
    url: 'https://app.clickup.com/t/t1',
    list: { id: 'l1', name: 'Acme Sprint 4 (3/1 - 3/14)' },
    space: { id: 's1' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(ClickUpClient.prototype, 'getCustomTaskTypes').mockResolvedValue([])
  })

  it('searches related spaces only and returns tasks via view API', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([baseTask])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Product - Acme' },
      { id: 's2', name: 'Acme Team' },
      { id: 's3', name: 'US Team' },
    ])
    const mockGetFolders = vi
      .spyOn(ClickUpClient.prototype, 'getFolders')
      .mockResolvedValue([{ id: 'f1', name: 'Acme Sprint' }])
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
    const mockGetFolders = vi
      .spyOn(ClickUpClient.prototype, 'getFolders')
      .mockResolvedValue([{ id: 'f1', name: 'Acme Sprint' }])
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
    await runSprintCommand(config, { space: 'Acm' })

    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s2')
  })

  it('throws when --space filter matches no spaces', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([{ id: 's1', name: 'Acme' }])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await expect(runSprintCommand(config, { space: 'nonexistent' })).rejects.toThrow(
      'No space matching "nonexistent" found',
    )
  })

  it('matches assignee when API returns string IDs', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([baseTask])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Product - Acme' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
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
      { ...baseTask, assignees: [{ id: '1' as unknown as number, username: 'user' }] },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, {})
  })

  it('falls back to list tasks API when no view exists', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([baseTask])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Product - Acme' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Acme Sprint' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Acme Sprint 4 (3/1 - 3/14)' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getMe').mockResolvedValue({ id: 1, username: 'user' })
    vi.spyOn(ClickUpClient.prototype, 'getListViews').mockResolvedValue({
      views: [],
      required_views: {},
    })
    const mockGetTasksFromList = vi
      .spyOn(ClickUpClient.prototype, 'getTasksFromList')
      .mockResolvedValue([{ ...baseTask, assignees: [{ id: 1, username: 'user' }] }])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, {})

    expect(mockGetTasksFromList).toHaveBeenCalledWith('l1')
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

  it('uses sprintFolderId from config to skip auto-detection', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    const mockGetFolderLists = vi
      .spyOn(ClickUpClient.prototype, 'getFolderLists')
      .mockResolvedValue([{ id: 'l1', name: 'Sprint 4 (3/1 - 3/14)' }])
    vi.spyOn(ClickUpClient.prototype, 'getMe').mockResolvedValue({ id: 1, username: 'user' })
    vi.spyOn(ClickUpClient.prototype, 'getListViews').mockResolvedValue({
      views: [],
      required_views: { list: { id: 'v1', name: 'List', type: 'list' } },
    })
    vi.spyOn(ClickUpClient.prototype, 'getViewTasks').mockResolvedValue([])
    const mockGetSpaces = vi.spyOn(ClickUpClient.prototype, 'getSpaces')

    const config = { apiToken: 'pk_test', teamId: 'team1', sprintFolderId: 'folder123' }
    await runSprintCommand(config, {})

    expect(mockGetFolderLists).toHaveBeenCalledWith('folder123')
    expect(mockGetSpaces).not.toHaveBeenCalled()
  })

  it('--folder flag overrides config sprintFolderId', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    const mockGetFolderLists = vi
      .spyOn(ClickUpClient.prototype, 'getFolderLists')
      .mockResolvedValue([{ id: 'l1', name: 'Sprint 4 (3/1 - 3/14)' }])
    vi.spyOn(ClickUpClient.prototype, 'getMe').mockResolvedValue({ id: 1, username: 'user' })
    vi.spyOn(ClickUpClient.prototype, 'getListViews').mockResolvedValue({
      views: [],
      required_views: { list: { id: 'v1', name: 'List', type: 'list' } },
    })
    vi.spyOn(ClickUpClient.prototype, 'getViewTasks').mockResolvedValue([])

    const config = { apiToken: 'pk_test', teamId: 'team1', sprintFolderId: 'config-folder' }
    await runSprintCommand(config, { folder: 'cli-folder' })

    expect(mockGetFolderLists).toHaveBeenCalledWith('cli-folder')
  })
})
