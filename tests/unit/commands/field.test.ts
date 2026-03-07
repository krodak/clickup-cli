import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockSetCustomFieldValue = vi.fn().mockResolvedValue(undefined)
const mockRemoveCustomFieldValue = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getTask: mockGetTask,
    setCustomFieldValue: mockSetCustomFieldValue,
    removeCustomFieldValue: mockRemoveCustomFieldValue,
  })),
}))

const config = { apiToken: 'pk_test', teamId: 'team1' }

const taskWithFields = {
  id: 'task1',
  name: 'Test Task',
  custom_fields: [
    { id: 'uuid-text', name: 'Notes', type: 'text', value: null, type_config: {} },
    { id: 'uuid-num', name: 'Score', type: 'number', value: null, type_config: {} },
    {
      id: 'uuid-dd',
      name: 'Priority Type',
      type: 'drop_down',
      value: null,
      type_config: {
        options: [
          { id: 0, name: 'Low', orderindex: 0 },
          { id: 1, name: 'Medium', orderindex: 1 },
          { id: 2, name: 'High', orderindex: 2 },
        ],
      },
    },
    { id: 'uuid-cb', name: 'Approved', type: 'checkbox', value: null, type_config: {} },
    { id: 'uuid-date', name: 'Target Date', type: 'date', value: null, type_config: {} },
    { id: 'uuid-url', name: 'Link', type: 'url', value: null, type_config: {} },
    { id: 'uuid-email', name: 'Contact', type: 'email', value: null, type_config: {} },
  ],
}

describe('setCustomField', () => {
  beforeEach(() => {
    mockGetTask.mockReset().mockResolvedValue(taskWithFields)
    mockSetCustomFieldValue.mockReset().mockResolvedValue(undefined)
    mockRemoveCustomFieldValue.mockReset().mockResolvedValue(undefined)
  })

  it('sets a text field by name', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Notes', 'hello world'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-text', 'hello world')
    expect(results[0]).toEqual({
      taskId: 'task1',
      field: 'Notes',
      action: 'set',
      value: 'hello world',
    })
  })

  it('sets a number field (parses string to number)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Score', '42'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-num', 42)
    expect(results[0]!.value).toBe(42)
  })

  it('throws on non-numeric value for number field', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Score', 'abc'] })).rejects.toThrow(
      'not a valid numeric value',
    )
  })

  it('sets a dropdown field by option name (resolves to orderindex)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Priority Type', 'High'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-dd', 2)
    expect(results[0]!.value).toBe(2)
  })

  it('throws on unknown dropdown option and lists available options', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(
      setCustomField(config, 'task1', { set: ['Priority Type', 'Critical'] }),
    ).rejects.toThrow('Available options: Low, Medium, High')
  })

  it('sets a checkbox field ("true" -> true)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Approved', 'true'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-cb', true)
    expect(results[0]!.value).toBe(true)
  })

  it('sets a date field from YYYY-MM-DD (converts to epoch ms)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Target Date', '2025-06-15'],
    })
    const expected = new Date('2025-06-15').getTime()
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-date', expected)
    expect(results[0]!.value).toBe(expected)
  })

  it('sets a url field (pass-through string)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Link', 'https://example.com'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-url', 'https://example.com')
    expect(results[0]!.value).toBe('https://example.com')
  })

  it('sets an email field (pass-through string)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Contact', 'user@example.com'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-email', 'user@example.com')
    expect(results[0]!.value).toBe('user@example.com')
  })

  it('removes a field by name', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { remove: 'Notes' })
    expect(mockRemoveCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-text')
    expect(results[0]).toEqual({ taskId: 'task1', field: 'Notes', action: 'removed' })
  })

  it('supports both --set and --remove in one call', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Score', '10'],
      remove: 'Notes',
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-num', 10)
    expect(mockRemoveCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-text')
    expect(results).toHaveLength(2)
    expect(results[0]!.action).toBe('set')
    expect(results[1]!.action).toBe('removed')
  })

  it('throws when field name not found and lists available fields', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Nonexistent', 'val'] })).rejects.toThrow(
      'Available fields:',
    )
  })

  it('matches field name case-insensitively', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await setCustomField(config, 'task1', { set: ['notes', 'lowercase match'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-text', 'lowercase match')
  })

  it('throws when neither --set nor --remove provided', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', {})).rejects.toThrow(
      'Provide at least one of: --set, --remove',
    )
  })

  it('throws on unsupported field type', async () => {
    mockGetTask.mockResolvedValue({
      ...taskWithFields,
      custom_fields: [
        { id: 'uuid-labels', name: 'Labels', type: 'labels', value: null, type_config: {} },
      ],
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Labels', 'foo'] })).rejects.toThrow(
      'not supported',
    )
  })
})
