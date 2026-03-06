import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAddDependency = vi.fn().mockResolvedValue(undefined)
const mockDeleteDependency = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    addDependency: mockAddDependency,
    deleteDependency: mockDeleteDependency,
  })),
}))

describe('manageDependency', () => {
  beforeEach(() => {
    mockAddDependency.mockClear()
    mockDeleteDependency.mockClear()
  })

  it('adds a depends-on relationship', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    const msg = await manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      on: 'task2',
    })
    expect(mockAddDependency).toHaveBeenCalledWith('task1', {
      dependsOn: 'task2',
      dependencyOf: undefined,
    })
    expect(msg).toContain('depends on')
    expect(msg).toContain('task2')
  })

  it('adds a blocks relationship', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    const msg = await manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      blocks: 'task3',
    })
    expect(mockAddDependency).toHaveBeenCalledWith('task1', {
      dependsOn: undefined,
      dependencyOf: 'task3',
    })
    expect(msg).toContain('blocks')
    expect(msg).toContain('task3')
  })

  it('removes a depends-on relationship', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    const msg = await manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      on: 'task2',
      remove: true,
    })
    expect(mockDeleteDependency).toHaveBeenCalledWith('task1', {
      dependsOn: 'task2',
      dependencyOf: undefined,
    })
    expect(msg).toContain('no longer depends on')
  })

  it('removes a blocks relationship', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    const msg = await manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
      blocks: 'task3',
      remove: true,
    })
    expect(mockDeleteDependency).toHaveBeenCalledWith('task1', {
      dependsOn: undefined,
      dependencyOf: 'task3',
    })
    expect(msg).toContain('no longer blocks')
  })

  it('throws when neither --on nor --blocks is provided', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    await expect(manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {})).rejects.toThrow(
      '--on',
    )
  })

  it('throws when both --on and --blocks are provided', async () => {
    const { manageDependency } = await import('../../../src/commands/depend.js')
    await expect(
      manageDependency({ apiToken: 'pk_t', teamId: 'tm' }, 'task1', {
        on: 'task2',
        blocks: 'task3',
      }),
    ).rejects.toThrow('only one')
  })
})
