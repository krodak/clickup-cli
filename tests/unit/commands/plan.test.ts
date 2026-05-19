import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspacePlan } from '../../../src/api.js'

const mockGetWorkspacePlan = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(function () {
    return {
      getWorkspacePlan: mockGetWorkspacePlan,
    }
  }),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const samplePlan: WorkspacePlan = {
  plan_id: 5,
  name: 'Business',
}

describe('getWorkspacePlanCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns plan from API', async () => {
    mockGetWorkspacePlan.mockResolvedValue(samplePlan)
    const { getWorkspacePlanCommand } = await import('../../../src/commands/plan.js')
    const result = await getWorkspacePlanCommand(mockConfig)
    expect(result).toEqual(samplePlan)
    expect(mockGetWorkspacePlan).toHaveBeenCalled()
  })
})

describe('formatPlan', () => {
  it('formats plan with name and ID', async () => {
    const { formatPlan } = await import('../../../src/commands/plan.js')
    const result = formatPlan(samplePlan)
    expect(result).toContain('Business')
    expect(result).toContain('5')
  })
})

describe('formatPlanMarkdown', () => {
  it('formats plan as markdown', async () => {
    const { formatPlanMarkdown } = await import('../../../src/commands/plan.js')
    const result = formatPlanMarkdown(samplePlan)
    expect(result).toContain('Business')
    expect(result).toContain('5')
  })
})
