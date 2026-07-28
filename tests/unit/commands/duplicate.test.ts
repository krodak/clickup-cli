import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetTask = vi.fn()
const mockCreateTask = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getTask: mockGetTask,
      createTask: mockCreateTask,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('duplicateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a copy of the task, preserving markdown from markdown_description', async () => {
    // getTask (include_markdown_description=true) returns markdown_description,
    // while markdown_content is always null on read.
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'Original',
      description: 'Some desc',
      markdown_description: '# Content',
      markdown_content: null,
      list: { id: 'list1', name: 'My List' },
      priority: { priority: 'high' },
      tags: [{ name: 'bug' }],
      time_estimate: 3600000,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'Original (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    const result = await duplicateTask(mockConfig, 'abc')

    expect(mockGetTask).toHaveBeenCalledWith('abc')
    expect(mockCreateTask).toHaveBeenCalledWith('list1', {
      name: 'Original (copy)',
      description: 'Some desc',
      markdown_content: '# Content',
      priority: 2,
      tags: ['bug'],
      time_estimate: 3600000,
    })
    expect(result).toEqual({
      id: 'xyz',
      name: 'Original (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })
  })

  it('preserves markdown formatting (headings, checkboxes, links) on the copy', async () => {
    const md =
      '## Summary\n\nTest **bold** and `code`.\n\n- [ ] Checkbox one\n- [example](https://example.com)'
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'Markdown probe',
      description: 'Summary\n\nTest bold and code.\n\nCheckbox one\nexample',
      markdown_description: md,
      markdown_content: null,
      list: { id: 'list1', name: 'My List' },
      priority: null,
      tags: [],
      time_estimate: null,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'Markdown probe (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    await duplicateTask(mockConfig, 'abc')

    expect(mockCreateTask).toHaveBeenCalledWith(
      'list1',
      expect.objectContaining({ markdown_content: md }),
    )
  })

  it('falls back to plain description when markdown_description is absent', async () => {
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'No markdown',
      description: 'Just plain text',
      markdown_description: undefined,
      markdown_content: null,
      list: { id: 'list1', name: 'My List' },
      priority: null,
      tags: [],
      time_estimate: null,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'No markdown (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    await duplicateTask(mockConfig, 'abc')

    expect(mockCreateTask).toHaveBeenCalledWith(
      'list1',
      expect.objectContaining({ markdown_content: 'Just plain text' }),
    )
  })

  it('handles task without priority or tags', async () => {
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'Simple',
      list: { id: 'list1', name: 'My List' },
      priority: null,
      tags: [],
      time_estimate: null,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'Simple (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    const result = await duplicateTask(mockConfig, 'abc')

    expect(mockCreateTask).toHaveBeenCalledWith('list1', {
      name: 'Simple (copy)',
      description: undefined,
      markdown_content: undefined,
      priority: undefined,
      tags: [],
      time_estimate: undefined,
    })
    expect(result.id).toBe('xyz')
  })

  it('maps priority string "urgent" to 1', async () => {
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'Urgent Task',
      list: { id: 'list1', name: 'My List' },
      priority: { priority: 'urgent' },
      tags: [],
      time_estimate: null,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'Urgent Task (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    await duplicateTask(mockConfig, 'abc')

    expect(mockCreateTask).toHaveBeenCalledWith('list1', expect.objectContaining({ priority: 1 }))
  })

  it('maps priority string "low" to 4', async () => {
    mockGetTask.mockResolvedValue({
      id: 'abc',
      name: 'Low Task',
      list: { id: 'list1', name: 'My List' },
      priority: { priority: 'Low' },
      tags: [],
      time_estimate: null,
    })
    mockCreateTask.mockResolvedValue({
      id: 'xyz',
      name: 'Low Task (copy)',
      url: 'https://app.clickup.com/t/xyz',
    })

    const { duplicateTask } = await import('../../../src/commands/duplicate.js')
    await duplicateTask(mockConfig, 'abc')

    expect(mockCreateTask).toHaveBeenCalledWith('list1', expect.objectContaining({ priority: 4 }))
  })
})
