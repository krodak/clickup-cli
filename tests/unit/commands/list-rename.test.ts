import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateList = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return { updateList: mockUpdateList }
  }),
}))

import { renameList } from '../../../src/commands/list-rename.js'

const config = { apiToken: 'pk_test', teamId: 'team1' }

describe('renameList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateList with name payload and returns updated details', async () => {
    mockUpdateList.mockResolvedValue({ id: 'list1', name: 'New Name' })
    const result = await renameList(config, 'list1', 'New Name')
    expect(mockUpdateList).toHaveBeenCalledWith('list1', { name: 'New Name' })
    expect(result).toEqual({ id: 'list1', name: 'New Name' })
  })

  it('propagates API errors', async () => {
    mockUpdateList.mockRejectedValue(new Error('ClickUp API error 404: list not found'))
    await expect(renameList(config, 'missing', 'Whatever')).rejects.toThrow('404: list not found')
  })
})
