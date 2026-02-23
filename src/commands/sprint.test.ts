import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseSprintDates, findActiveSprintList, runSprintCommand } from './sprint.js'
import { ClickUpClient } from '../api.js'

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

describe('runSprintCommand space handling', () => {
  const baseTask = {
    id: 't1', name: 'Task', status: { status: 'in progress', color: '#fff' },
    assignees: [], url: 'https://app.clickup.com/t/t1',
    list: { id: 'l1', name: 'Kayenta Sprint 4 (2/12 - 2/25)' },
    space: { id: 's1' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-detects spaces from assigned tasks', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([baseTask])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Kayenta' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Kayenta Sprint' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Kayenta Sprint 4 (2/12 - 2/25)' },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, {})

    // Only s1 (has tasks) should be searched, not s2 (no tasks)
    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s2')
  })

  it('--space override filters by partial name', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Kayenta' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([
      { id: 'f1', name: 'Kayenta Sprint' },
    ])
    vi.spyOn(ClickUpClient.prototype, 'getFolderLists').mockResolvedValue([
      { id: 'l1', name: 'Kayenta Sprint 4 (2/12 - 2/25)' },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await runSprintCommand(config, { space: 'Kay' })

    expect(mockGetFolders).toHaveBeenCalledWith('s1')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s2')
  })

  it('throws when --space filter matches no spaces', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Kayenta' },
    ])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await expect(runSprintCommand(config, { space: 'nonexistent' })).rejects.toThrow(
      'No space matching "nonexistent" found'
    )
  })

  it('matches --space by exact ID', async () => {
    vi.spyOn(ClickUpClient.prototype, 'getMyTasks').mockResolvedValue([])
    vi.spyOn(ClickUpClient.prototype, 'getSpaces').mockResolvedValue([
      { id: 's1', name: 'Kayenta' },
      { id: 's2', name: 'Platform' },
    ])
    const mockGetFolders = vi.spyOn(ClickUpClient.prototype, 'getFolders').mockResolvedValue([])

    const config = { apiToken: 'pk_test', teamId: 'team1' }
    await expect(runSprintCommand(config, { space: 's2' })).rejects.toThrow('No sprint list found')
    expect(mockGetFolders).toHaveBeenCalledWith('s2')
    expect(mockGetFolders).not.toHaveBeenCalledWith('s1')
  })
})
