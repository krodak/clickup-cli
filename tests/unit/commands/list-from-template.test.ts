import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateListFromTemplate = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      createListFromTemplate: mockCreateListFromTemplate,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('createListFromTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a list in a space from template', async () => {
    mockCreateListFromTemplate.mockResolvedValue({ id: 'newlist1' })
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    const result = await createListFromTemplate(mockConfig, 'My List', {
      template: 'tmpl1',
      space: 'space1',
    })
    expect(result).toEqual({ id: 'newlist1' })
    expect(mockCreateListFromTemplate).toHaveBeenCalledWith('space1', 'tmpl1', 'My List', 'space')
  })

  it('creates a list in a folder from template', async () => {
    mockCreateListFromTemplate.mockResolvedValue({ id: 'newlist2' })
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    const result = await createListFromTemplate(mockConfig, 'My List', {
      template: 'tmpl1',
      folder: 'folder1',
    })
    expect(result).toEqual({ id: 'newlist2' })
    expect(mockCreateListFromTemplate).toHaveBeenCalledWith('folder1', 'tmpl1', 'My List', 'folder')
  })

  it('throws when neither --space nor --folder is provided', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, 'My List', { template: 'tmpl1' }),
    ).rejects.toThrow('Provide --space or --folder')
  })

  it('throws when both --space and --folder are provided', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, 'My List', {
        template: 'tmpl1',
        space: 's1',
        folder: 'f1',
      }),
    ).rejects.toThrow('either --space or --folder, not both')
  })

  it('throws when name is empty', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, '  ', { template: 'tmpl1', space: 's1' }),
    ).rejects.toThrow('name cannot be empty')
  })
})
