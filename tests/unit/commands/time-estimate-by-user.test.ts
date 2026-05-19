import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpdateTimeEstimatesByUser = vi.fn().mockResolvedValue({
  total_time_estimate: 7200000,
  assignee_estimates: { '123': 7200000 },
})
const mockReplaceTimeEstimatesByUser = vi.fn().mockResolvedValue({
  total_time_estimate: 7200000,
  updated_estimates: { '123': 7200000 },
})

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      updateTimeEstimatesByUser: mockUpdateTimeEstimatesByUser,
      replaceTimeEstimatesByUser: mockReplaceTimeEstimatesByUser,
    }
  }),
}))

const config = { apiToken: 'pk_test', teamId: 'tm_1' }

describe('timeEstimateByUserCommand', () => {
  beforeEach(() => {
    mockUpdateTimeEstimatesByUser.mockClear()
    mockReplaceTimeEstimatesByUser.mockClear()
  })

  it('updates time estimate for a user (PATCH)', async () => {
    const { timeEstimateByUserCommand } =
      await import('../../../src/commands/time-estimate-by-user.js')
    const result = await timeEstimateByUserCommand(config, 'task1', '123', '2h', {})
    expect(mockUpdateTimeEstimatesByUser).toHaveBeenCalledWith('task1', [
      { assignee: '123', time: 7200000 },
    ])
    expect(result.total_time_estimate).toBe(7200000)
  })

  it('replaces time estimates with --replace flag (PUT)', async () => {
    const { timeEstimateByUserCommand } =
      await import('../../../src/commands/time-estimate-by-user.js')
    const result = await timeEstimateByUserCommand(config, 'task1', '123', '2h', {
      replace: true,
    })
    expect(mockReplaceTimeEstimatesByUser).toHaveBeenCalledWith('task1', [
      { assignee: '123', time: 7200000 },
    ])
    expect(mockUpdateTimeEstimatesByUser).not.toHaveBeenCalled()
    expect(result.total_time_estimate).toBe(7200000)
  })

  it('parses complex duration strings', async () => {
    const { timeEstimateByUserCommand } =
      await import('../../../src/commands/time-estimate-by-user.js')
    await timeEstimateByUserCommand(config, 'task1', '456', '1h30m', {})
    expect(mockUpdateTimeEstimatesByUser).toHaveBeenCalledWith('task1', [
      { assignee: '456', time: 5400000 },
    ])
  })
})
