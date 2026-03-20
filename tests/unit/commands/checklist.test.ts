import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockCreateChecklist = vi.fn()
const mockDeleteChecklist = vi.fn().mockResolvedValue(undefined)
const mockCreateChecklistItem = vi.fn()
const mockEditChecklistItem = vi.fn()
const mockDeleteChecklistItem = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
    createChecklist: mockCreateChecklist,
    deleteChecklist: mockDeleteChecklist,
    createChecklistItem: mockCreateChecklistItem,
    editChecklistItem: mockEditChecklistItem,
    deleteChecklistItem: mockDeleteChecklistItem,
  })),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('viewChecklists', () => {
  beforeEach(() => {
    mockGetTask.mockClear()
  })

  it('returns checklists from task', async () => {
    const checklists = [
      { id: 'cl1', name: 'QA', orderindex: 0, items: [] },
      { id: 'cl2', name: 'Deploy', orderindex: 1, items: [] },
    ]
    mockGetTask.mockResolvedValue({
      id: 't1',
      name: 'Task',
      checklists,
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })

    const { viewChecklists } = await import('../../../src/commands/checklist.js')
    const result = await viewChecklists(config, 't1')
    expect(mockGetTask).toHaveBeenCalledWith('t1')
    expect(result).toEqual(checklists)
  })

  it('returns empty array when no checklists', async () => {
    mockGetTask.mockResolvedValue({
      id: 't1',
      name: 'Task',
      status: { status: 'open', color: '' },
      assignees: [],
      url: '',
    })

    const { viewChecklists } = await import('../../../src/commands/checklist.js')
    const result = await viewChecklists(config, 't1')
    expect(result).toEqual([])
  })
})

describe('createChecklist', () => {
  beforeEach(() => {
    mockCreateChecklist.mockClear()
  })

  it('calls API with taskId and name, returns checklist', async () => {
    const checklist = { id: 'cl_new', name: 'Review', orderindex: 0, items: [] }
    mockCreateChecklist.mockResolvedValue(checklist)

    const { createChecklist } = await import('../../../src/commands/checklist.js')
    const result = await createChecklist(config, 't1', 'Review')
    expect(mockCreateChecklist).toHaveBeenCalledWith('t1', 'Review')
    expect(result).toEqual(checklist)
  })
})

describe('deleteChecklist', () => {
  beforeEach(() => {
    mockDeleteChecklist.mockClear()
    mockDeleteChecklist.mockResolvedValue(undefined)
  })

  it('calls API and returns checklistId', async () => {
    const { deleteChecklist } = await import('../../../src/commands/checklist.js')
    const result = await deleteChecklist(config, 'cl1')
    expect(mockDeleteChecklist).toHaveBeenCalledWith('cl1')
    expect(result).toEqual({ checklistId: 'cl1' })
  })
})

describe('addChecklistItem', () => {
  beforeEach(() => {
    mockCreateChecklistItem.mockClear()
  })

  it('calls API with checklistId and name', async () => {
    const checklist = {
      id: 'cl1',
      name: 'QA',
      orderindex: 0,
      items: [{ id: 'item1', name: 'Step 1', resolved: false, orderindex: 0 }],
    }
    mockCreateChecklistItem.mockResolvedValue(checklist)

    const { addChecklistItem } = await import('../../../src/commands/checklist.js')
    const result = await addChecklistItem(config, 'cl1', 'Step 1')
    expect(mockCreateChecklistItem).toHaveBeenCalledWith('cl1', 'Step 1')
    expect(result).toEqual(checklist)
  })
})

describe('editChecklistItem', () => {
  beforeEach(() => {
    mockEditChecklistItem.mockClear()
  })

  it('calls API with updates object', async () => {
    const checklist = {
      id: 'cl1',
      name: 'QA',
      orderindex: 0,
      items: [{ id: 'item1', name: 'Updated', resolved: true, orderindex: 0 }],
    }
    mockEditChecklistItem.mockResolvedValue(checklist)

    const { editChecklistItem } = await import('../../../src/commands/checklist.js')
    const updates = { name: 'Updated', resolved: true }
    const result = await editChecklistItem(config, 'cl1', 'item1', updates)
    expect(mockEditChecklistItem).toHaveBeenCalledWith('cl1', 'item1', updates)
    expect(result).toEqual(checklist)
  })
})

describe('deleteChecklistItem', () => {
  beforeEach(() => {
    mockDeleteChecklistItem.mockClear()
    mockDeleteChecklistItem.mockResolvedValue(undefined)
  })

  it('calls API and returns both IDs', async () => {
    const { deleteChecklistItem } = await import('../../../src/commands/checklist.js')
    const result = await deleteChecklistItem(config, 'cl1', 'item1')
    expect(mockDeleteChecklistItem).toHaveBeenCalledWith('cl1', 'item1')
    expect(result).toEqual({ checklistId: 'cl1', checklistItemId: 'item1' })
  })
})

describe('formatChecklists', () => {
  it('formats empty list', async () => {
    const { formatChecklists } = await import('../../../src/commands/checklist.js')
    expect(formatChecklists([])).toBe('No checklists')
  })

  it('formats checklist with items', async () => {
    const { formatChecklists } = await import('../../../src/commands/checklist.js')
    const checklists = [
      {
        id: 'cl1',
        name: 'QA Checks',
        orderindex: 0,
        items: [
          { id: 'i1', name: 'Unit tests', resolved: true, orderindex: 0 },
          { id: 'i2', name: 'Code review', resolved: false, orderindex: 1 },
        ],
      },
    ]
    const output = formatChecklists(checklists)
    expect(output).toContain('QA Checks')
    expect(output).toContain('1/2')
    expect(output).toContain('Unit tests')
    expect(output).toContain('Code review')
    expect(output).toContain('cl1')
    expect(output).toContain('i1')
    expect(output).toContain('i2')
  })
})

describe('formatChecklistsMarkdown', () => {
  it('returns "No checklists" for empty array', async () => {
    const { formatChecklistsMarkdown } = await import('../../../src/commands/checklist.js')
    expect(formatChecklistsMarkdown([])).toBe('No checklists')
  })

  it('formats checklists as markdown with checkboxes', async () => {
    const { formatChecklistsMarkdown } = await import('../../../src/commands/checklist.js')
    const checklists = [
      {
        id: 'cl1',
        name: 'QA Checks',
        orderindex: 0,
        items: [
          { id: 'i1', name: 'Unit tests', resolved: true, orderindex: 0 },
          { id: 'i2', name: 'Code review', resolved: false, orderindex: 1 },
        ],
      },
    ]
    const output = formatChecklistsMarkdown(checklists)
    expect(output).toContain('### QA Checks (1/2)')
    expect(output).toContain('- [x] Unit tests')
    expect(output).toContain('- [ ] Code review')
  })

  it('formats multiple checklists separated by blank lines', async () => {
    const { formatChecklistsMarkdown } = await import('../../../src/commands/checklist.js')
    const checklists = [
      {
        id: 'cl1',
        name: 'First',
        orderindex: 0,
        items: [{ id: 'i1', name: 'Step 1', resolved: false, orderindex: 0 }],
      },
      {
        id: 'cl2',
        name: 'Second',
        orderindex: 1,
        items: [{ id: 'i2', name: 'Step 2', resolved: true, orderindex: 0 }],
      },
    ]
    const output = formatChecklistsMarkdown(checklists)
    expect(output).toContain('### First (0/1)')
    expect(output).toContain('### Second (1/1)')
    expect(output).toContain('\n\n')
  })
})
