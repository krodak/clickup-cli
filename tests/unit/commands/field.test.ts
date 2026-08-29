import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTask = vi.fn()
const mockSetCustomFieldValue = vi.fn().mockResolvedValue(undefined)
const mockRemoveCustomFieldValue = vi.fn().mockResolvedValue(undefined)
const mockResolveTaskId = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getTask: mockGetTask,
      setCustomFieldValue: mockSetCustomFieldValue,
      removeCustomFieldValue: mockRemoveCustomFieldValue,
      resolveTaskId: mockResolveTaskId,
    }
  }),
}))

const config = { apiToken: 'pk_test', teamId: 'team1' }

const taskWithFields = {
  id: 'task1',
  name: 'Test Task',
  custom_fields: [
    { id: 'uuid-text', name: 'Notes', type: 'text', value: null, type_config: {} },
    { id: 'uuid-short', name: 'Summary', type: 'short_text', value: null, type_config: {} },
    { id: 'uuid-phone', name: 'Phone', type: 'phone', value: null, type_config: {} },
    { id: 'uuid-currency', name: 'Budget', type: 'currency', value: null, type_config: {} },
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
    {
      id: 'uuid-labels',
      name: 'Priority Labels',
      type: 'labels',
      value: null,
      type_config: {
        options: [
          { id: 'opt-1', label: 'High', orderindex: 0 },
          { id: 'opt-2', label: 'Medium', orderindex: 1 },
          { id: 'opt-3', label: 'Low', orderindex: 2 },
        ],
      },
    },
    { id: 'cf_emoji', name: 'Rating', type: 'emoji', value: null, type_config: {} },
    { id: 'cf_progress', name: 'Progress', type: 'manual_progress', value: null, type_config: {} },
    { id: 'cf_tasks', name: 'Related Tasks', type: 'tasks', value: null, type_config: {} },
    { id: 'cf_users', name: 'Reviewers', type: 'users', value: null, type_config: {} },
  ],
}

describe('setCustomField', () => {
  beforeEach(() => {
    mockGetTask.mockReset().mockResolvedValue(taskWithFields)
    mockSetCustomFieldValue.mockReset().mockResolvedValue(undefined)
    mockRemoveCustomFieldValue.mockReset().mockResolvedValue(undefined)
    mockResolveTaskId.mockReset().mockImplementation(async (id: string) => id)
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

  it('sets a short_text field (pass-through string)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Summary', 'quick note'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-short', 'quick note')
    expect(results[0]!.value).toBe('quick note')
  })

  it('sets a phone field (pass-through string)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Phone', '+1-555-0100'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-phone', '+1-555-0100')
    expect(results[0]!.value).toBe('+1-555-0100')
  })

  it('sets a currency field (pass-through string)', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Budget', '5000'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-currency', '5000')
    expect(results[0]!.value).toBe('5000')
  })

  it('sets emoji field with valid rating', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Rating', '3'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'cf_emoji', 3)
    expect(results[0]!.value).toBe(3)
  })

  it('throws on invalid emoji rating', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Rating', '6'] })).rejects.toThrow(
      'Rating value must be a number between 0 and 5',
    )
  })

  it('sets manual_progress field', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Progress', '75'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'cf_progress', { current: 75 })
    expect(results[0]!.value).toEqual({ current: 75 })
  })

  it('throws on invalid progress value', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Progress', '150'] })).rejects.toThrow(
      'Progress value must be a number between 0 and 100',
    )
  })

  it('sets tasks (relationship) field', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Related Tasks', 'task1, task2'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'cf_tasks', {
      add: ['task1', 'task2'],
    })
    expect(results[0]!.value).toEqual({ add: ['task1', 'task2'] })
  })

  it('resolves custom task IDs and URLs in a tasks relationship field', async () => {
    mockResolveTaskId.mockImplementation(async (id: string) => {
      if (id === 'PROD-123') return 'native1'
      if (id === 'https://app.clickup.com/t/abc999') return 'abc999'
      return id
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Related Tasks', 'PROD-123, https://app.clickup.com/t/abc999, plain1'],
    })
    expect(mockResolveTaskId).toHaveBeenCalledWith('PROD-123')
    expect(mockResolveTaskId).toHaveBeenCalledWith('https://app.clickup.com/t/abc999')
    expect(mockResolveTaskId).toHaveBeenCalledWith('plain1')
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'cf_tasks', {
      add: ['native1', 'abc999', 'plain1'],
    })
    expect(results[0]!.value).toEqual({ add: ['native1', 'abc999', 'plain1'] })
  })

  it('does not resolve task IDs for non-relationship fields', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await setCustomField(config, 'task1', { set: ['Notes', 'PROD-123'] })
    expect(mockResolveTaskId).not.toHaveBeenCalled()
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-text', 'PROD-123')
  })

  it('sets users (people) field', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Reviewers', '123, 456'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'cf_users', {
      add: [123, 456],
    })
    expect(results[0]!.value).toEqual({ add: [123, 456] })
  })

  it('throws on unsupported field type', async () => {
    mockGetTask.mockResolvedValue({
      ...taskWithFields,
      custom_fields: [
        {
          id: 'uuid-progress',
          name: 'Progress',
          type: 'automatic_progress',
          value: null,
          type_config: {},
        },
      ],
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Progress', 'foo'] })).rejects.toThrow(
      'not supported',
    )
  })

  it('sets labels field with single label', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Priority Labels', 'High'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-labels', ['opt-1'])
    expect(results[0]!.value).toEqual(['opt-1'])
  })

  it('sets labels field with multiple comma-separated labels', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', {
      set: ['Priority Labels', 'High, Low'],
    })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-labels', ['opt-1', 'opt-3'])
    expect(results[0]!.value).toEqual(['opt-1', 'opt-3'])
  })

  it('throws when label name not found', async () => {
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(
      setCustomField(config, 'task1', { set: ['Priority Labels', 'Critical'] }),
    ).rejects.toThrow('Available: High, Medium, Low')
  })

  it('sets labels field when API returns options with label (not name)', async () => {
    mockGetTask.mockResolvedValue({
      ...taskWithFields,
      custom_fields: [
        {
          id: 'uuid-context',
          name: 'Context',
          type: 'labels',
          value: null,
          type_config: {
            options: [
              { id: 'opt-home', label: 'Home', orderindex: 0 },
              { id: 'opt-office', label: 'Office', orderindex: 1 },
            ],
          },
        },
      ],
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    const { results } = await setCustomField(config, 'task1', { set: ['Context', 'Home'] })
    expect(mockSetCustomFieldValue).toHaveBeenCalledWith('task1', 'uuid-context', ['opt-home'])
    expect(results[0]!.value).toEqual(['opt-home'])
  })

  it('lists labels using label field in error message when option not found', async () => {
    mockGetTask.mockResolvedValue({
      ...taskWithFields,
      custom_fields: [
        {
          id: 'uuid-context',
          name: 'Context',
          type: 'labels',
          value: null,
          type_config: {
            options: [
              { id: 'opt-home', label: 'Home', orderindex: 0 },
              { id: 'opt-office', label: 'Office', orderindex: 1 },
            ],
          },
        },
      ],
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Context', 'Nowhere'] })).rejects.toThrow(
      'Available: Home, Office',
    )
  })

  it('throws when labels field has no options', async () => {
    mockGetTask.mockResolvedValue({
      ...taskWithFields,
      custom_fields: [
        {
          id: 'uuid-labels-empty',
          name: 'Empty Labels',
          type: 'labels',
          value: null,
          type_config: {},
        },
      ],
    })
    const { setCustomField } = await import('../../../src/commands/field.js')
    await expect(setCustomField(config, 'task1', { set: ['Empty Labels', 'foo'] })).rejects.toThrow(
      'Labels field has no configured options',
    )
  })
})
