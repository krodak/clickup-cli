import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateFolder = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return { updateFolder: mockUpdateFolder }
  }),
}))

import { renameFolder } from '../../../src/commands/folder-rename.js'

const config = { apiToken: 'pk_test', teamId: 'team1' }

describe('renameFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateFolder with name payload and returns updated details', async () => {
    mockUpdateFolder.mockResolvedValue({ id: 'folder1', name: 'Renamed Folder' })
    const result = await renameFolder(config, 'folder1', 'Renamed Folder')
    expect(mockUpdateFolder).toHaveBeenCalledWith('folder1', { name: 'Renamed Folder' })
    expect(result).toEqual({ id: 'folder1', name: 'Renamed Folder' })
  })

  it('propagates API errors', async () => {
    mockUpdateFolder.mockRejectedValue(new Error('ClickUp API error 404: folder not found'))
    await expect(renameFolder(config, 'missing', 'Whatever')).rejects.toThrow(
      '404: folder not found',
    )
  })
})
