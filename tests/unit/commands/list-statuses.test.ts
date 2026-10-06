import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetListWithStatuses = vi.fn()
const mockGetSpaceWithStatuses = vi.fn()
const mockGetTasksFromList = vi.fn()
const mockUpdateList = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListWithStatuses: mockGetListWithStatuses,
      getSpaceWithStatuses: mockGetSpaceWithStatuses,
      getTasksFromList: mockGetTasksFromList,
      updateList: mockUpdateList,
    }
  }),
}))

import { listStatuses, parseStatusNames } from '../../../src/commands/list-statuses.js'

const config = { apiToken: 'pk_test', teamId: 'team1' }

const defaultStatuses = [
  { status: 'to do', color: '#87909e', type: 'open' },
  { status: 'complete', color: '#008844', type: 'closed' },
]

function list(statuses: unknown[], override = false) {
  return { id: 'l1', name: 'Project', override_statuses: override, statuses }
}

describe('parseStatusNames', () => {
  it('makes the first status open, the last closed and the rest custom', () => {
    const result = parseStatusNames('Offen, in arbeit, wartet auf kunde, erledigt')
    expect(result.map(s => [s.status, s.type])).toEqual([
      ['offen', 'open'],
      ['in arbeit', 'custom'],
      ['wartet auf kunde', 'custom'],
      ['erledigt', 'closed'],
    ])
  })

  it('keeps the color of statuses that already exist', () => {
    const result = parseStatusNames('to do,review,complete', [
      { status: 'Review', color: '#123456' },
    ])
    expect(result[1]).toEqual({ status: 'review', type: 'custom', color: '#123456' })
  })

  it('lets name:type override the positional type', () => {
    const result = parseStatusNames('offen, complete:done, erledigt, archiv:closed')
    expect(result.map(s => [s.status, s.type])).toEqual([
      ['offen', 'open'],
      ['complete', 'done'],
      ['erledigt', 'custom'],
      ['archiv', 'closed'],
    ])
  })

  it('keeps colons in status names when the suffix is not a known type', () => {
    const result = parseStatusNames('open,Review: waiting,finished:approved')
    expect(result.map(s => [s.status, s.type])).toEqual([
      ['open', 'open'],
      ['review: waiting', 'custom'],
      ['finished:approved', 'closed'],
    ])
  })

  it('uses only the last colon for an explicit status type', () => {
    const result = parseStatusNames('open,Review: waiting : done,closed')
    expect(result[1]).toEqual({
      status: 'review: waiting',
      type: 'done',
      color: '#008844',
    })
  })

  it('rejects fewer than two statuses', () => {
    expect(() => parseStatusNames('offen, ')).toThrow('at least two statuses')
  })

  it('rejects duplicate statuses ignoring case', () => {
    expect(() => parseStatusNames('offen,Offen,erledigt')).toThrow('Duplicate status "offen"')
  })
})

describe('listStatuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const mock of [
      mockGetListWithStatuses,
      mockGetSpaceWithStatuses,
      mockGetTasksFromList,
      mockUpdateList,
    ]) {
      mock.mockReset()
    }
  })

  it('only reads when neither --set nor --copy-from is given', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    const result = await listStatuses(config, 'l1', {})
    expect(result.changed).toBe(false)
    expect(result.statuses.map(s => s.status)).toEqual(['to do', 'complete'])
    expect(mockUpdateList).not.toHaveBeenCalled()
  })

  it('sets statuses with override and verifies them by reading back', async () => {
    mockGetListWithStatuses
      .mockResolvedValueOnce(list(defaultStatuses))
      .mockResolvedValueOnce(list(parseStatusNames('offen,in arbeit,erledigt'), true))
    mockGetTasksFromList.mockResolvedValue([])
    const result = await listStatuses(config, 'l1', { set: 'offen,in arbeit,erledigt' })
    expect(mockUpdateList).toHaveBeenCalledWith('l1', {
      override_statuses: true,
      statuses: parseStatusNames('offen,in arbeit,erledigt'),
    })
    expect(mockGetTasksFromList).toHaveBeenCalledWith('l1', {}, { includeClosed: true })
    expect(mockGetTasksFromList).toHaveBeenCalledWith(
      'l1',
      {},
      {
        includeClosed: true,
        archived: true,
      },
    )
    expect(result.changed).toBe(true)
    expect(result.statuses.map(s => s.status)).toEqual(['offen', 'in arbeit', 'erledigt'])
  })

  it('fails when ClickUp ignores the new statuses', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    mockGetTasksFromList.mockResolvedValue([])
    await expect(listStatuses(config, 'l1', { set: 'offen,erledigt' })).rejects.toThrow(
      'ClickUp did not apply the statuses to list l1. Now: to do, complete',
    )
  })

  it('refuses to drop a status that tasks still use, including closed tasks', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    mockGetTasksFromList.mockResolvedValue([
      { id: 't1', status: { status: 'complete', color: '#008844' } },
    ])
    await expect(listStatuses(config, 'l1', { set: 'offen,erledigt' })).rejects.toThrow(
      '1 task(s) in list l1 still use complete',
    )
    expect(mockUpdateList).not.toHaveBeenCalled()
  })

  it('refuses to drop a status used only by an archived task', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    mockGetTasksFromList
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 't1', archived: true, status: { status: 'complete', color: '#008844' } },
      ])
    await expect(listStatuses(config, 'l1', { set: 'to do,done' })).rejects.toThrow(
      '1 task(s) in list l1 still use complete',
    )
    expect(mockUpdateList).not.toHaveBeenCalled()
  })

  it('counts blocking tasks once when both queries return the same task', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    mockGetTasksFromList.mockResolvedValue([
      { id: 't1', status: { status: 'complete', color: '#008844' } },
    ])
    await expect(listStatuses(config, 'l1', { set: 'to do,done' })).rejects.toThrow(
      '1 task(s) in list l1 still use complete',
    )
    expect(mockGetTasksFromList).toHaveBeenCalledTimes(2)
    expect(mockUpdateList).not.toHaveBeenCalled()
  })

  it('does not write when the archived task query fails', async () => {
    mockGetListWithStatuses.mockResolvedValue(list(defaultStatuses))
    mockGetTasksFromList
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Could not read archived tasks'))
    await expect(listStatuses(config, 'l1', { set: 'to do,done' })).rejects.toThrow(
      'Could not read archived tasks',
    )
    expect(mockUpdateList).not.toHaveBeenCalled()
  })

  it('skips the task check when no status is dropped', async () => {
    mockGetListWithStatuses
      .mockResolvedValueOnce(list(parseStatusNames('offen,erledigt'), true))
      .mockResolvedValueOnce(list(parseStatusNames('offen,abnahme,erledigt'), true))
    await listStatuses(config, 'l1', { set: 'offen,abnahme,erledigt' })
    expect(mockGetTasksFromList).not.toHaveBeenCalled()
  })

  it('copies the status set from another list', async () => {
    const source = parseStatusNames('offen,abnahme,erledigt')
    mockGetListWithStatuses
      .mockResolvedValueOnce(list(source, true))
      .mockResolvedValueOnce({ id: 'src', name: 'Source', statuses: source })
      .mockResolvedValueOnce(list(source, true))
    const result = await listStatuses(config, 'l1', { copyFrom: 'src' })
    expect(mockGetListWithStatuses).toHaveBeenNthCalledWith(2, 'src')
    expect(mockUpdateList).toHaveBeenCalledWith('l1', { override_statuses: true, statuses: source })
    expect(result.statuses).toEqual(source)
  })

  it('rejects --set together with --copy-from', async () => {
    await expect(listStatuses(config, 'l1', { set: 'a,b', copyFrom: 'src' })).rejects.toThrow(
      'either --set or --copy-from',
    )
    expect(mockGetListWithStatuses).not.toHaveBeenCalled()
  })
})
