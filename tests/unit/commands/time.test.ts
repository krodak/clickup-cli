import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStartTimeEntry = vi.fn()
const mockStopTimeEntry = vi.fn()
const mockGetRunningTimeEntry = vi.fn()
const mockCreateTimeEntry = vi.fn()
const mockGetTimeEntries = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    startTimeEntry: mockStartTimeEntry,
    stopTimeEntry: mockStopTimeEntry,
    getRunningTimeEntry: mockGetRunningTimeEntry,
    createTimeEntry: mockCreateTimeEntry,
    getTimeEntries: mockGetTimeEntries,
  })),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

const baseEntry = {
  id: 'te1',
  wid: 'w1',
  user: { id: 1, username: 'user' },
  start: '1710000000000',
  duration: 3600000,
  description: '',
  tags: [],
  billable: false,
  at: 1710000000,
  task: { id: 't1', name: 'Test Task', status: { status: 'open', color: '#fff' } },
}

describe('startTimer', () => {
  beforeEach(() => {
    mockStartTimeEntry.mockClear()
  })

  it('calls startTimeEntry with taskId and description', async () => {
    mockStartTimeEntry.mockResolvedValue({ ...baseEntry, duration: -1 })

    const { startTimer } = await import('../../../src/commands/time.js')
    const result = await startTimer(config, 't1', 'working on feature')
    expect(mockStartTimeEntry).toHaveBeenCalledWith('tm_1', 't1', 'working on feature')
    expect(result.duration).toBe(-1)
  })

  it('calls startTimeEntry without description', async () => {
    mockStartTimeEntry.mockResolvedValue({ ...baseEntry, duration: -1 })

    const { startTimer } = await import('../../../src/commands/time.js')
    await startTimer(config, 't1')
    expect(mockStartTimeEntry).toHaveBeenCalledWith('tm_1', 't1', undefined)
  })
})

describe('stopTimer', () => {
  beforeEach(() => {
    mockStopTimeEntry.mockClear()
  })

  it('calls stopTimeEntry', async () => {
    mockStopTimeEntry.mockResolvedValue(baseEntry)

    const { stopTimer } = await import('../../../src/commands/time.js')
    const result = await stopTimer(config)
    expect(mockStopTimeEntry).toHaveBeenCalledWith('tm_1')
    expect(result.duration).toBe(3600000)
  })
})

describe('timerStatus', () => {
  beforeEach(() => {
    mockGetRunningTimeEntry.mockClear()
  })

  it('returns entry when running', async () => {
    const running = { ...baseEntry, duration: -1 }
    mockGetRunningTimeEntry.mockResolvedValue(running)

    const { timerStatus } = await import('../../../src/commands/time.js')
    const result = await timerStatus(config)
    expect(mockGetRunningTimeEntry).toHaveBeenCalledWith('tm_1')
    expect(result).toEqual(running)
  })

  it('returns null when not running', async () => {
    mockGetRunningTimeEntry.mockResolvedValue(null)

    const { timerStatus } = await import('../../../src/commands/time.js')
    const result = await timerStatus(config)
    expect(result).toBeNull()
  })
})

describe('logTime', () => {
  beforeEach(() => {
    mockCreateTimeEntry.mockClear()
  })

  it('parses duration string and calls createTimeEntry', async () => {
    mockCreateTimeEntry.mockResolvedValue(baseEntry)

    const { logTime } = await import('../../../src/commands/time.js')
    await logTime(config, 't1', '2h', 'code review')
    expect(mockCreateTimeEntry).toHaveBeenCalledWith('tm_1', 't1', 7200000, {
      description: 'code review',
    })
  })

  it('throws on invalid duration', async () => {
    const { logTime } = await import('../../../src/commands/time.js')
    await expect(logTime(config, 't1', 'invalid')).rejects.toThrow()
  })
})

describe('listTimeEntries', () => {
  beforeEach(() => {
    mockGetTimeEntries.mockClear()
  })

  it('calls getTimeEntries with date range', async () => {
    mockGetTimeEntries.mockResolvedValue([baseEntry])

    const { listTimeEntries } = await import('../../../src/commands/time.js')
    const result = await listTimeEntries(config, { days: 7 })
    expect(mockGetTimeEntries).toHaveBeenCalledWith(
      'tm_1',
      expect.objectContaining({
        startDate: expect.any(Number) as number,
        endDate: expect.any(Number) as number,
      }),
    )
    expect(result).toHaveLength(1)
  })

  it('passes taskId filter', async () => {
    mockGetTimeEntries.mockResolvedValue([baseEntry])

    const { listTimeEntries } = await import('../../../src/commands/time.js')
    await listTimeEntries(config, { taskId: 't1' })
    expect(mockGetTimeEntries).toHaveBeenCalledWith(
      'tm_1',
      expect.objectContaining({ taskId: 't1' }),
    )
  })
})

describe('formatTimeEntries', () => {
  it('returns "No time entries" for empty array', async () => {
    const { formatTimeEntries } = await import('../../../src/commands/time.js')
    expect(formatTimeEntries([])).toBe('No time entries')
  })
})

describe('formatTimeEntry', () => {
  it('shows RUNNING for negative duration', async () => {
    const { formatTimeEntry } = await import('../../../src/commands/time.js')
    const running = { ...baseEntry, duration: -1, start: String(Date.now() - 60000) }
    const output = formatTimeEntry(running)
    expect(output).toContain('RUNNING')
    expect(output).toContain('Test Task')
  })

  it('shows duration for completed entry', async () => {
    const { formatTimeEntry } = await import('../../../src/commands/time.js')
    const output = formatTimeEntry(baseEntry)
    expect(output).not.toContain('RUNNING')
    expect(output).toContain('1h')
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', async () => {
    const { formatDuration } = await import('../../../src/commands/time.js')
    expect(formatDuration(5400000)).toBe('1h 30m')
  })

  it('formats hours only', async () => {
    const { formatDuration } = await import('../../../src/commands/time.js')
    expect(formatDuration(7200000)).toBe('2h')
  })

  it('formats minutes only', async () => {
    const { formatDuration } = await import('../../../src/commands/time.js')
    expect(formatDuration(900000)).toBe('15m')
  })

  it('handles zero', async () => {
    const { formatDuration } = await import('../../../src/commands/time.js')
    expect(formatDuration(0)).toBe('0m')
  })
})
