import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetListWithStatuses = vi.fn()
const mockGetSpaceWithStatuses = vi.fn()
const mockCreateList = vi.fn()
const mockCreateFolderList = vi.fn()
const mockUpdateList = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getListWithStatuses: mockGetListWithStatuses,
      getSpaceWithStatuses: mockGetSpaceWithStatuses,
      createList: mockCreateList,
      createFolderList: mockCreateFolderList,
      updateList: mockUpdateList,
    }
  }),
}))

import { copyStatusesFrom } from '../../../src/commands/list-create.js'
import { ClickUpClient } from '../../../src/api.js'

const config = { apiToken: 'pk_test', teamId: 'team1' }

const sampleStatuses = [
  { status: 'open', color: '#000', type: 'open', orderindex: 0 },
  { status: 'in progress', color: '#111', type: 'custom', orderindex: 1 },
  { status: 'done', color: '#222', type: 'closed', orderindex: 2 },
]

describe('copyStatusesFrom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses list statuses when list fetch succeeds', async () => {
    mockGetListWithStatuses.mockResolvedValue({
      id: 'list1',
      name: 'List',
      statuses: sampleStatuses,
    })
    const client = new ClickUpClient(config)
    const result = await copyStatusesFrom(client, 'list1')
    expect(mockGetListWithStatuses).toHaveBeenCalledWith('list1')
    expect(mockGetSpaceWithStatuses).not.toHaveBeenCalled()
    expect(result).toHaveLength(3)
  })

  it('falls back to space statuses when list fetch fails', async () => {
    mockGetListWithStatuses.mockRejectedValue(new Error('not found'))
    mockGetSpaceWithStatuses.mockResolvedValue({
      id: 'space1',
      name: 'Space',
      statuses: [
        { status: 'todo', color: '#aaa' },
        { status: 'done', color: '#bbb' },
      ],
    })
    const client = new ClickUpClient(config)
    const result = await copyStatusesFrom(client, 'space1')
    expect(mockGetListWithStatuses).toHaveBeenCalledWith('space1')
    expect(mockGetSpaceWithStatuses).toHaveBeenCalledWith('space1')
    expect(result).toHaveLength(2)
  })

  it('throws informative error when both list and space fetch fail', async () => {
    mockGetListWithStatuses.mockRejectedValue(new Error('list not found'))
    mockGetSpaceWithStatuses.mockRejectedValue(new Error('space not found'))
    const client = new ClickUpClient(config)
    await expect(copyStatusesFrom(client, 'bad-id')).rejects.toThrow(
      'Could not find a list or space with ID "bad-id". Check the ID and try again.',
    )
  })

  it('strips orderindex from returned statuses', async () => {
    mockGetListWithStatuses.mockResolvedValue({
      id: 'list1',
      name: 'List',
      statuses: sampleStatuses,
    })
    const client = new ClickUpClient(config)
    const result = await copyStatusesFrom(client, 'list1')
    for (const s of result) {
      expect(s).not.toHaveProperty('orderindex')
      expect(s).toHaveProperty('status')
      expect(s).toHaveProperty('color')
      expect(s).toHaveProperty('type')
    }
  })

  it('returns correct status, color, type fields from list', async () => {
    mockGetListWithStatuses.mockResolvedValue({
      id: 'list1',
      name: 'List',
      statuses: sampleStatuses,
    })
    const client = new ClickUpClient(config)
    const result = await copyStatusesFrom(client, 'list1')
    expect(result[0]).toEqual({ status: 'open', color: '#000', type: 'open' })
    expect(result[1]).toEqual({ status: 'in progress', color: '#111', type: 'custom' })
    expect(result[2]).toEqual({ status: 'done', color: '#222', type: 'closed' })
  })

  it('uses custom as default type when type is missing from space statuses', async () => {
    mockGetListWithStatuses.mockRejectedValue(new Error('not found'))
    mockGetSpaceWithStatuses.mockResolvedValue({
      id: 'space1',
      name: 'Space',
      statuses: [{ status: 'todo', color: '#aaa' }],
    })
    const client = new ClickUpClient(config)
    const result = await copyStatusesFrom(client, 'space1')
    expect(result[0]).toEqual({ status: 'todo', color: '#aaa', type: 'custom' })
  })
})
