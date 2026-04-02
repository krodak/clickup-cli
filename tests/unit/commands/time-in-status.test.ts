import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTimeInStatus = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getTimeInStatus: mockGetTimeInStatus,
    }
  }),
}))

const mockApiResponse = {
  current_status: {
    status: 'in progress',
    color: '#4194f6',
    total_time: { by_minute: 1500, since: '1700000000000' },
    orderindex: 1,
  },
  status_history: [
    {
      status: 'open',
      color: '#d3d3d3',
      total_time: { by_minute: 60, since: '1699990000000' },
      orderindex: 0,
    },
    {
      status: 'in progress',
      color: '#4194f6',
      total_time: { by_minute: 1500, since: '1700000000000' },
      orderindex: 1,
    },
  ],
}

describe('fetchTimeInStatus', () => {
  beforeEach(() => {
    mockGetTimeInStatus.mockReset()
  })

  it('transforms API response into status durations', async () => {
    mockGetTimeInStatus.mockResolvedValue(mockApiResponse)

    const { fetchTimeInStatus } = await import('../../../src/commands/time-in-status.js')
    const result = await fetchTimeInStatus({ apiToken: 'pk_t', teamId: 'team1' }, 't1')

    expect(mockGetTimeInStatus).toHaveBeenCalledWith('t1')
    expect(result.taskId).toBe('t1')
    expect(result.statuses).toHaveLength(2)
    expect(result.statuses[0]!.status).toBe('open')
    expect(result.statuses[0]!.current).toBe(false)
    expect(result.statuses[1]!.status).toBe('in progress')
    expect(result.statuses[1]!.current).toBe(true)
    expect(result.totalMs).toBeGreaterThan(0)
    expect(result.total).toBeTruthy()
  })

  it('handles empty status history', async () => {
    mockGetTimeInStatus.mockResolvedValue({
      current_status: {
        status: 'open',
        color: '#d3d3d3',
        total_time: { by_minute: 10, since: '1700000000000' },
        orderindex: 0,
      },
      status_history: [],
    })

    const { fetchTimeInStatus } = await import('../../../src/commands/time-in-status.js')
    const result = await fetchTimeInStatus({ apiToken: 'pk_t', teamId: 'team1' }, 't1')

    expect(result.statuses).toHaveLength(1)
    expect(result.statuses[0]!.status).toBe('open')
    expect(result.statuses[0]!.current).toBe(true)
  })
})

describe('printTimeInStatus', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi
      .spyOn(console, 'log')
      .mockClear()
      .mockImplementation(() => {})
  })

  const mockResult = {
    taskId: 't1',
    statuses: [
      { status: 'open', duration: '1h', durationMs: 3600000, current: false },
      { status: 'in progress', duration: '1d 1h', durationMs: 90000000, current: true },
    ],
    totalMs: 93600000,
    total: '1d 2h',
  }

  it('outputs JSON when forceJson is true', async () => {
    const { printTimeInStatus } = await import('../../../src/commands/time-in-status.js')

    printTimeInStatus(mockResult, true)

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
  })

  it('prints table in TTY mode', async () => {
    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(true)
    const { printTimeInStatus } = await import('../../../src/commands/time-in-status.js')

    printTimeInStatus(mockResult, false)

    const output = logSpy.mock.calls.map(c => c[0]).join('\n')
    expect(output).toContain('open')
    expect(output).toContain('in progress')
    expect(output).toContain('1d 1h')
    expect(output).toContain('1d 2h')
  })

  it('outputs markdown when non-TTY without forceJson', async () => {
    const outputModule = await import('../../../src/output.js')
    vi.spyOn(outputModule, 'isTTY').mockReturnValue(false)
    const { printTimeInStatus } = await import('../../../src/commands/time-in-status.js')

    printTimeInStatus(mockResult, false)

    const output = logSpy.mock.calls[0]?.[0] as string
    expect(output).toContain('| Status')
    expect(output).toContain('open')
    expect(output).toContain('in progress')
    expect(output).toContain('**Total:**')
  })
})
