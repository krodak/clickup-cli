import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateSpace = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return { updateSpace: mockUpdateSpace }
  }),
}))

import { renameSpace } from '../../../src/commands/space-rename.js'

const config = { apiToken: 'pk_test', teamId: 'team1' }

describe('renameSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateSpace with name payload and returns updated details', async () => {
    mockUpdateSpace.mockResolvedValue({ id: 'space1', name: 'Renamed Space' })
    const result = await renameSpace(config, 'space1', 'Renamed Space')
    expect(mockUpdateSpace).toHaveBeenCalledWith('space1', { name: 'Renamed Space' })
    expect(result).toEqual({ id: 'space1', name: 'Renamed Space' })
  })

  it('propagates API errors', async () => {
    mockUpdateSpace.mockRejectedValue(new Error('ClickUp API error 403: forbidden'))
    await expect(renameSpace(config, 'space1', 'Whatever')).rejects.toThrow('403: forbidden')
  })
})
