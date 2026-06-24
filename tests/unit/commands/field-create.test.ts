import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateListCustomField = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      createListCustomField: mockCreateListCustomField,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

describe('resolveFieldScope', () => {
  it('returns workspace mode when no list flags are given', async () => {
    const { resolveFieldScope } = await import('../../../src/commands/field-create.js')
    expect(resolveFieldScope()).toEqual({ mode: 'workspace' })
  })

  it('returns single mode with the list id for --list', async () => {
    const { resolveFieldScope } = await import('../../../src/commands/field-create.js')
    expect(resolveFieldScope('l1')).toEqual({ mode: 'single', listId: 'l1' })
  })

  it('returns bulk mode with parsed, trimmed list ids for --lists', async () => {
    const { resolveFieldScope } = await import('../../../src/commands/field-create.js')
    expect(resolveFieldScope(undefined, 'l1, l2 ,l3')).toEqual({
      mode: 'bulk',
      listIds: ['l1', 'l2', 'l3'],
    })
  })

  it('throws when both --list and --lists are given', async () => {
    const { resolveFieldScope } = await import('../../../src/commands/field-create.js')
    expect(() => resolveFieldScope('l1', 'l2,l3')).toThrow(/Cannot use --list and --lists together/)
  })

  it('throws when --lists is empty after trimming', async () => {
    const { resolveFieldScope } = await import('../../../src/commands/field-create.js')
    expect(() => resolveFieldScope(undefined, ' , ')).toThrow(/at least one list ID/)
  })
})

describe('validateFieldType', () => {
  it('throws on an unknown field type', async () => {
    const { validateFieldType } = await import('../../../src/commands/field-create.js')
    expect(() => validateFieldType('bogus')).toThrow(/Invalid field type "bogus"/)
  })

  it('requires options for drop_down fields', async () => {
    const { validateFieldType } = await import('../../../src/commands/field-create.js')
    expect(() => validateFieldType('drop_down')).toThrow(/--options is required for drop_down/)
  })

  it('requires options for labels fields', async () => {
    const { validateFieldType } = await import('../../../src/commands/field-create.js')
    expect(() => validateFieldType('labels')).toThrow(/--options is required for labels/)
  })

  it('passes for a valid type with options', async () => {
    const { validateFieldType } = await import('../../../src/commands/field-create.js')
    expect(() => validateFieldType('drop_down', ['A', 'B'])).not.toThrow()
    expect(() => validateFieldType('text')).not.toThrow()
  })
})

describe('createFieldAcrossLists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates the field on a single list', async () => {
    mockCreateListCustomField.mockResolvedValue({ id: 'cf1', name: 'Notes', type: 'text' })
    const { createFieldAcrossLists } = await import('../../../src/commands/field-create.js')
    const results = await createFieldAcrossLists(mockConfig, 'Notes', 'text', ['l1'])

    expect(mockCreateListCustomField).toHaveBeenCalledTimes(1)
    expect(mockCreateListCustomField).toHaveBeenCalledWith('l1', 'Notes', 'text', undefined)
    expect(results).toEqual([{ listId: 'l1', ok: true, fieldId: 'cf1' }])
  })

  it('creates the same field across multiple lists', async () => {
    mockCreateListCustomField
      .mockResolvedValueOnce({ id: 'cfa', name: 'Notes', type: 'text' })
      .mockResolvedValueOnce({ id: 'cfb', name: 'Notes', type: 'text' })
      .mockResolvedValueOnce({ id: 'cfc', name: 'Notes', type: 'text' })

    const { createFieldAcrossLists } = await import('../../../src/commands/field-create.js')
    const results = await createFieldAcrossLists(mockConfig, 'Notes', 'text', ['l1', 'l2', 'l3'], {
      description: 'desc',
    })

    expect(mockCreateListCustomField).toHaveBeenCalledTimes(3)
    expect(mockCreateListCustomField).toHaveBeenCalledWith('l1', 'Notes', 'text', {
      description: 'desc',
    })
    expect(mockCreateListCustomField).toHaveBeenCalledWith('l2', 'Notes', 'text', {
      description: 'desc',
    })
    expect(mockCreateListCustomField).toHaveBeenCalledWith('l3', 'Notes', 'text', {
      description: 'desc',
    })
    expect(results).toEqual([
      { listId: 'l1', ok: true, fieldId: 'cfa' },
      { listId: 'l2', ok: true, fieldId: 'cfb' },
      { listId: 'l3', ok: true, fieldId: 'cfc' },
    ])
  })

  it('reports per-list partial failures without aborting the rest', async () => {
    mockCreateListCustomField
      .mockResolvedValueOnce({ id: 'cfa', name: 'Notes', type: 'text' })
      .mockRejectedValueOnce(new Error('List not found'))
      .mockResolvedValueOnce({ id: 'cfc', name: 'Notes', type: 'text' })

    const { createFieldAcrossLists } = await import('../../../src/commands/field-create.js')
    const results = await createFieldAcrossLists(mockConfig, 'Notes', 'text', ['l1', 'l2', 'l3'])

    expect(results).toEqual([
      { listId: 'l1', ok: true, fieldId: 'cfa' },
      { listId: 'l2', ok: false, error: 'List not found' },
      { listId: 'l3', ok: true, fieldId: 'cfc' },
    ])
  })
})
