import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateTask = vi.fn().mockResolvedValue({
  id: 't1',
  name: 'Task',
  status: { status: 'done', color: '' },
  list: { id: 'l1', name: 'L1' },
  assignees: [],
  url: '',
})

const mockGetTask = vi.fn().mockResolvedValue({
  id: 't1',
  name: 'Task',
  status: { status: 'open', color: '' },
  list: { id: 'l1', name: 'L1' },
  space: { id: 's1' },
  assignees: [],
  url: '',
})

const mockGetListWithStatuses = vi.fn().mockResolvedValue({
  id: 'l1',
  name: 'L1',
  statuses: [
    { status: 'open', color: '#000' },
    { status: 'in progress', color: '#111' },
    { status: 'review', color: '#222' },
    { status: 'done', color: '#333' },
  ],
})

const mockGetCustomTaskTypes = vi.fn().mockResolvedValue([
  { id: 1000, name: 'Task' },
  { id: 1001, name: 'Initiative' },
  { id: 1002, name: 'Bug' },
])

const mockGetGroups = vi.fn().mockResolvedValue([
  {
    id: '00000000-0000-0000-0000-000000000001',
    team_id: 'team1',
    name: 'Mobile Team',
    handle: 'mobile-team',
    date_created: '0',
    members: [],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    team_id: 'team1',
    name: 'Backend',
    handle: 'backend',
    date_created: '0',
    members: [],
  },
])

const mockResolveTaskId = vi.fn((id: string) => Promise.resolve(id))

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateTask: mockUpdateTask,
      getTask: mockGetTask,
      getListWithStatuses: mockGetListWithStatuses,
      getCustomTaskTypes: mockGetCustomTaskTypes,
      getGroups: mockGetGroups,
      resolveTaskId: mockResolveTaskId,
      getUserTimezone: vi.fn().mockResolvedValue(undefined),
    }
  }),
}))

describe('updateTask', () => {
  beforeEach(() => {
    mockUpdateTask.mockClear()
    mockGetTask.mockClear()
    mockGetListWithStatuses.mockClear()
    mockGetCustomTaskTypes.mockClear()
    mockResolveTaskId.mockClear()
    mockResolveTaskId.mockImplementation((id: string) => Promise.resolve(id))
  })

  it('calls API with task id and markdown_content', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    const result = await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      markdown_content: 'new desc',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { markdown_content: 'new desc' })
    expect(result.id).toBe('t1')
  })

  it('calls API with status update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'done' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
  })

  it('calls API with name update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { name: 'New name' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { name: 'New name' })
  })

  it('calls API with multiple fields at once', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      name: 'New name',
      status: 'in progress',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { name: 'New name', status: 'in progress' })
  })

  it('calls API with parent update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { parent: 'parent123' })
    expect(mockResolveTaskId).toHaveBeenCalledWith('parent123')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { parent: 'parent123' })
  })

  it('resolves a custom-id parent to native id before updating', async () => {
    mockResolveTaskId.mockResolvedValue('86e26w1ew')
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { parent: 'PROD-811' })
    expect(mockResolveTaskId).toHaveBeenCalledWith('PROD-811')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { parent: '86e26w1ew' })
  })

  it('throws when no fields provided', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {})).rejects.toThrow(
      'at least one',
    )
  })

  it('allows empty markdown_content to clear the field', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    const result = await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      markdown_content: '',
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { markdown_content: '' })
    expect(result.id).toBe('t1')
  })

  it('calls API with archived: true', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { archived: true })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { archived: true })
  })

  it('calls API with archived: false to unarchive', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { archived: false })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { archived: false })
  })

  it('calls API with start_date', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    const ms = Date.UTC(2025, 5, 1)
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {
      start_date: ms,
      start_date_time: false,
    })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { start_date: ms, start_date_time: false })
  })

  it('calls API with due_date: null to clear due date', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { due_date: null })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { due_date: null })
  })

  it('calls API with assignees.rem to remove assignee', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { assignees: { rem: [99] } })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { assignees: { rem: [99] } })
  })
})

describe('parsePriority', () => {
  it('parses named priorities', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('urgent')).toBe(1)
    expect(parsePriority('high')).toBe(2)
    expect(parsePriority('normal')).toBe(3)
    expect(parsePriority('low')).toBe(4)
  })

  it('parses numeric priorities', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('1')).toBe(1)
    expect(parsePriority('4')).toBe(4)
  })

  it('is case-insensitive', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(parsePriority('URGENT')).toBe(1)
    expect(parsePriority('High')).toBe(2)
  })

  it('throws on invalid priority', async () => {
    const { parsePriority } = await import('../../../src/commands/update.js')
    expect(() => parsePriority('5')).toThrow('Priority must be')
    expect(() => parsePriority('invalid')).toThrow('Priority must be')
  })
})

describe('parseDueDate', () => {
  it('parses YYYY-MM-DD format to UTC midnight with hasTime=false', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-03-15')
    expect(result).toEqual({ ms: Date.UTC(2025, 2, 15), hasTime: false })
  })

  it('parses YYYY-MM-DD with timezone to midnight in that timezone', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-06-01', 'America/New_York')
    // June 1 midnight ET = June 1 04:00 UTC (EDT = UTC-4)
    expect(result).toEqual({ ms: Date.UTC(2025, 5, 1, 4, 0, 0), hasTime: false })
  })

  it('parses YYYY-MM-DDTHH:MM as wall clock with hasTime=true (UTC fallback)', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-03-15T14:30')
    expect(result).toEqual({ ms: Date.UTC(2025, 2, 15, 14, 30, 0), hasTime: true })
  })

  it('parses YYYY-MM-DDTHH:MM:SS as wall clock with hasTime=true', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-03-15T14:30:45')
    expect(result).toEqual({ ms: Date.UTC(2025, 2, 15, 14, 30, 45), hasTime: true })
  })

  it('parses YYYY-MM-DDTHH:MM with timezone (wall clock in tz)', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-05-14T14:30', 'Australia/Perth')
    // 14:30 AWST (UTC+8) = 06:30 UTC
    expect(result).toEqual({ ms: Date.UTC(2025, 4, 14, 6, 30, 0), hasTime: true })
  })

  it('parses full ISO with Z offset as absolute instant', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-03-15T14:30:00Z')
    expect(result).toEqual({ ms: Date.UTC(2025, 2, 15, 14, 30, 0), hasTime: true })
  })

  it('parses full ISO with explicit offset as absolute instant', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    const result = parseDueDate('2025-05-14T14:30:00+08:00')
    // 14:30 +08:00 = 06:30 UTC
    expect(result).toEqual({ ms: Date.UTC(2025, 4, 14, 6, 30, 0), hasTime: true })
  })

  it('ISO with offset ignores the timezone argument', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    // Explicit +08:00 wins over the America/New_York hint.
    const result = parseDueDate('2025-05-14T14:30:00+08:00', 'America/New_York')
    expect(result).toEqual({ ms: Date.UTC(2025, 4, 14, 6, 30, 0), hasTime: true })
  })

  it('throws on invalid date format', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    expect(() => parseDueDate('not-a-date')).toThrow('YYYY-MM-DD')
  })

  it('throws on partial date', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    expect(() => parseDueDate('2025-02')).toThrow('YYYY-MM-DD')
    expect(() => parseDueDate('2025')).toThrow('YYYY-MM-DD')
  })

  it('throws on malformed time component', async () => {
    const { parseDueDate } = await import('../../../src/commands/update.js')
    expect(() => parseDueDate('2025-03-15T14')).toThrow('YYYY-MM-DD')
    expect(() => parseDueDate('2025-03-15T25:00')).toThrow('YYYY-MM-DD')
  })
})

describe('parseAssigneeId', () => {
  it('parses numeric string to number', async () => {
    const { parseAssigneeId } = await import('../../../src/commands/update.js')
    expect(parseAssigneeId('12345')).toBe(12345)
  })

  it('throws on non-numeric string', async () => {
    const { parseAssigneeId } = await import('../../../src/commands/update.js')
    expect(() => parseAssigneeId('abc')).toThrow('numeric user ID')
  })
})

describe('parseTimeEstimate', () => {
  it('parses hours only', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('2h')).toBe(2 * 60 * 60 * 1000)
  })

  it('parses minutes only', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('30m')).toBe(30 * 60 * 1000)
  })

  it('parses combined hours and minutes', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('1h30m')).toBe(90 * 60 * 1000)
  })

  it('parses raw milliseconds', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('3600000')).toBe(3600000)
  })

  it('is case-insensitive', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('2H')).toBe(2 * 60 * 60 * 1000)
    expect(parseTimeEstimate('30M')).toBe(30 * 60 * 1000)
    expect(parseTimeEstimate('1H30M')).toBe(90 * 60 * 1000)
  })

  it('throws on invalid format', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(() => parseTimeEstimate('abc')).toThrow('duration')
    expect(() => parseTimeEstimate('-1')).toThrow('duration')
  })

  it('returns 0 for zero values to clear estimate', async () => {
    const { parseTimeEstimate } = await import('../../../src/commands/update.js')
    expect(parseTimeEstimate('0')).toBe(0)
    expect(parseTimeEstimate('none')).toBe(0)
    expect(parseTimeEstimate('None')).toBe(0)
    expect(parseTimeEstimate('')).toBe(0)
  })
})

describe('buildUpdatePayload', () => {
  it('maps description to markdown_content', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ description: '# Heading\n\nSome **bold** text' })
    expect(payload.markdown_content).toBe('# Heading\n\nSome **bold** text')
    expect(payload.description).toBeUndefined()
  })

  it('builds payload with priority', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ priority: 'high' })
    expect(payload).toEqual({ priority: 2 })
  })

  it('builds payload with due date', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: '2025-06-01' })
    expect(payload.due_date).toBe(Date.UTC(2025, 5, 1))
    expect(payload.due_date_time).toBe(false)
  })

  it('builds payload with assignee', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ assignee: '12345' })
    expect(payload.assignees).toEqual({ add: [12345] })
  })

  it('builds payload with assignees.rem for --remove-assignee', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ removeAssignee: '99' })
    expect(payload.assignees).toEqual({ rem: [99] })
  })

  it('builds payload with both add and rem when both flags given', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ assignee: '12', removeAssignee: '99' })
    expect(payload.assignees).toEqual({ add: [12], rem: [99] })
  })

  it('builds payload with group_assignees.add from groupAssigneeIds', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({
      groupAssigneeIds: ['00000000-0000-0000-0000-000000000001'],
    })
    expect(payload.group_assignees).toEqual({
      add: ['00000000-0000-0000-0000-000000000001'],
    })
  })

  it('builds payload with group_assignees.rem from removeGroupAssigneeIds', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({
      removeGroupAssigneeIds: ['00000000-0000-0000-0000-000000000002'],
    })
    expect(payload.group_assignees).toEqual({
      rem: ['00000000-0000-0000-0000-000000000002'],
    })
  })

  it('builds payload with both group_assignees.add and rem', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({
      groupAssigneeIds: ['00000000-0000-0000-0000-000000000001'],
      removeGroupAssigneeIds: ['00000000-0000-0000-0000-000000000002'],
    })
    expect(payload.group_assignees).toEqual({
      add: ['00000000-0000-0000-0000-000000000001'],
      rem: ['00000000-0000-0000-0000-000000000002'],
    })
  })

  it('builds payload with all fields', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({
      name: 'New name',
      status: 'done',
      priority: 'urgent',
      dueDate: '2025-01-01',
      assignee: '99',
    })
    expect(payload.name).toBe('New name')
    expect(payload.status).toBe('done')
    expect(payload.priority).toBe(1)
    expect(payload.due_date).toBe(Date.UTC(2025, 0, 1))
    expect(payload.assignees).toEqual({ add: [99] })
  })

  it('builds payload with time estimate', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ timeEstimate: '2h' })
    expect(payload.time_estimate).toBe(2 * 60 * 60 * 1000)
  })

  it('builds payload with parent', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ parent: 'parent456' })
    expect(payload).toEqual({ parent: 'parent456' })
  })

  it('throws on non-numeric assignee', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    expect(() => buildUpdatePayload({ assignee: 'abc' })).toThrow('numeric user ID')
  })

  it('throws on empty name', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    expect(() => buildUpdatePayload({ name: '' })).toThrow('Task name cannot be empty')
  })

  it('throws on whitespace-only name', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    expect(() => buildUpdatePayload({ name: '   ' })).toThrow('Task name cannot be empty')
  })

  it('builds payload with archived: true for --archive', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ archive: true })
    expect(payload).toEqual({ archived: true })
  })

  it('builds payload with archived: false for --unarchive', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ unarchive: true })
    expect(payload).toEqual({ archived: false })
  })

  it('throws when both --archive and --unarchive are set', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    expect(() => buildUpdatePayload({ archive: true, unarchive: true })).toThrow(
      'Cannot use --archive and --unarchive together',
    )
  })

  it('builds payload with start_date', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ startDate: '2025-06-01' })
    expect(payload.start_date).toBe(Date.UTC(2025, 5, 1))
    expect(payload.start_date_time).toBe(false)
  })

  it('builds payload with due date + time-of-day sets due_date_time=true', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: '2025-05-14T14:30' })
    expect(payload.due_date).toBe(Date.UTC(2025, 4, 14, 14, 30, 0))
    expect(payload.due_date_time).toBe(true)
  })

  it('builds payload with start_date + time-of-day in timezone', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ startDate: '2025-05-14T14:30' }, 'Australia/Perth')
    // 14:30 AWST (UTC+8) = 06:30 UTC
    expect(payload.start_date).toBe(Date.UTC(2025, 4, 14, 6, 30, 0))
    expect(payload.start_date_time).toBe(true)
  })

  it('builds payload with full ISO offset preserves absolute instant', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: '2025-05-14T14:30:00+08:00' })
    expect(payload.due_date).toBe(Date.UTC(2025, 4, 14, 6, 30, 0))
    expect(payload.due_date_time).toBe(true)
  })

  it('clears due_date when --due-date is "none"', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: 'none' })
    expect(payload.due_date).toBeNull()
    expect(payload.due_date_time).toBeUndefined()
  })

  it('clears due_date when --due-date is "clear"', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ dueDate: 'clear' })
    expect(payload.due_date).toBeNull()
  })

  it('builds payload with parent id when --parent is set', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ parent: 'p1' })
    expect(payload.parent).toBe('p1')
  })
})

describe('fuzzy status matching', () => {
  beforeEach(() => {
    mockUpdateTask.mockClear()
    mockGetTask.mockClear()
    mockGetListWithStatuses.mockClear()
  })

  it('resolves fuzzy status before sending update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'prog' })
    expect(mockGetTask).toHaveBeenCalledWith('t1')
    expect(mockGetListWithStatuses).toHaveBeenCalledWith('l1')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'in progress' })
  })

  it('sends exact match without modification', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'done' })
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'done' })
  })

  it('throws when no status matches', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(
      updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { status: 'nonexistent' }),
    ).rejects.toThrow('open, in progress, review, done')
  })

  it('sets custom_item_id when numeric --type is passed via buildUpdatePayload', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ type: '1001' })
    expect(payload.custom_item_id).toBe(1001)
  })

  it('does not set custom_item_id in payload when --type is a name', async () => {
    const { buildUpdatePayload } = await import('../../../src/commands/update.js')
    const payload = buildUpdatePayload({ type: 'Initiative' })
    expect(payload.custom_item_id).toBeUndefined()
  })

  it('resolves --type by name via getCustomTaskTypes', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {}, 'Initiative')
    expect(mockGetCustomTaskTypes).toHaveBeenCalledWith('team1')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { custom_item_id: 1001 })
  })

  it('resolves --type by name case-insensitively', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {}, 'bug')
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { custom_item_id: 1002 })
  })

  it('passes numeric custom_item_id through without name resolution', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    mockGetCustomTaskTypes.mockClear()
    await updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', { custom_item_id: 1001 }, '1001')
    expect(mockGetCustomTaskTypes).not.toHaveBeenCalled()
    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { custom_item_id: 1001 })
  })

  it('throws when --type name does not match any task type', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(
      updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {}, 'NonExistent'),
    ).rejects.toThrow('No matching task type')
  })

  it('allows --type alone as a valid update', async () => {
    const { updateTask } = await import('../../../src/commands/update.js')
    await expect(
      updateTask({ apiToken: 'pk_t', teamId: 'team1' }, 't1', {}, 'Initiative'),
    ).resolves.toBeDefined()
  })
})

describe('resolveGroupId', () => {
  beforeEach(() => {
    mockGetGroups.mockClear()
  })

  it('passes through UUID values without calling getGroups', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    const uuid = '00000000-0000-0000-0000-000000000001'
    const result = await resolveGroupId(client, uuid)
    expect(result).toBe(uuid)
    expect(mockGetGroups).not.toHaveBeenCalled()
  })

  it('accepts uppercase UUID format', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    const uuid = 'ABCDEF12-3456-7890-ABCD-EF1234567890'
    const result = await resolveGroupId(client, uuid)
    expect(result).toBe(uuid)
    expect(mockGetGroups).not.toHaveBeenCalled()
  })

  it('resolves bare handle to UUID', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    const result = await resolveGroupId(client, 'mobile-team')
    expect(result).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('resolves @-prefixed handle to UUID', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    const result = await resolveGroupId(client, '@backend')
    expect(result).toBe('00000000-0000-0000-0000-000000000002')
  })

  it('resolves handle case-insensitively', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    const result = await resolveGroupId(client, 'Mobile-Team')
    expect(result).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('throws with available handles when no match is found', async () => {
    const { resolveGroupId } = await import('../../../src/commands/update.js')
    const { ClickUpClient } = await import('../../../src/api.js')
    const client = new ClickUpClient({ apiToken: 'pk_t', teamId: 'team1' })
    await expect(resolveGroupId(client, 'nonexistent')).rejects.toThrow(
      /Group "nonexistent" not found.*@mobile-team.*@backend/,
    )
  })
})
