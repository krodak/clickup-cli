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

  it('creates a list from a template in a space', async () => {
    mockCreateListFromTemplate.mockResolvedValue({ id: 'list_1' })
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    const result = await createListFromTemplate(mockConfig, 'Sprint Board', {
      template: 'tmpl_1',
      space: 'space_1',
    })

    expect(result).toEqual({ id: 'list_1', name: 'Sprint Board' })
    expect(mockCreateListFromTemplate).toHaveBeenCalledWith(
      'space_1',
      'tmpl_1',
      'Sprint Board',
      'space',
    )
  })

  it('creates a list from a template in a folder', async () => {
    mockCreateListFromTemplate.mockResolvedValue({ id: 'list_2' })
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await createListFromTemplate(mockConfig, 'Folder Board', {
      template: 'tmpl_2',
      folder: 'folder_1',
    })

    expect(mockCreateListFromTemplate).toHaveBeenCalledWith(
      'folder_1',
      'tmpl_2',
      'Folder Board',
      'folder',
    )
  })

  it('rejects empty names', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, '   ', { template: 'tmpl_1', space: 'space_1' }),
    ).rejects.toThrow('List name cannot be empty')
  })

  it('requires a template id', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, 'Sprint Board', { space: 'space_1' }),
    ).rejects.toThrow('Provide --template with a list template ID')
  })

  it('requires a target location', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, 'Sprint Board', { template: 'tmpl_1' }),
    ).rejects.toThrow('Provide --space or --folder to specify where to create the list')
  })

  it('rejects conflicting targets', async () => {
    const { createListFromTemplate } = await import('../../../src/commands/list-from-template.js')
    await expect(
      createListFromTemplate(mockConfig, 'Sprint Board', {
        template: 'tmpl_1',
        space: 'space_1',
        folder: 'folder_1',
      }),
    ).rejects.toThrow('Provide either --space or --folder, not both')
  })
})
