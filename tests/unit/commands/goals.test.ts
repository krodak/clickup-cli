import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetGoals = vi.fn()
const mockCreateGoal = vi.fn()
const mockUpdateGoal = vi.fn()
const mockGetKeyResults = vi.fn()
const mockCreateKeyResult = vi.fn()
const mockUpdateKeyResult = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getGoals: mockGetGoals,
    createGoal: mockCreateGoal,
    updateGoal: mockUpdateGoal,
    getKeyResults: mockGetKeyResults,
    createKeyResult: mockCreateKeyResult,
    updateKeyResult: mockUpdateKeyResult,
  })),
}))

const mockConfig = { apiToken: 'pk_test', teamId: 'team1' }

const sampleGoals = [
  {
    id: 'g1',
    name: 'Ship v2',
    description: 'Release version 2',
    date_created: '1700000000000',
    percent_completed: 0.75,
    key_result_count: 3,
    owner: { id: 1, username: 'alice' },
    color: '#00ff00',
    archived: false,
  },
  {
    id: 'g2',
    name: 'Reduce bugs',
    date_created: '1700000000000',
    percent_completed: 0.5,
    key_result_count: 2,
    owner: null,
    color: '#ff0000',
    archived: false,
  },
]

const sampleKeyResults = [
  {
    id: 'kr1',
    name: 'Complete API',
    type: 'number',
    unit: 'items',
    steps_current: 7,
    steps_end: 10,
    percent_completed: 0.7,
  },
]

describe('listGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns goals from API', async () => {
    mockGetGoals.mockResolvedValue(sampleGoals)
    const { listGoals } = await import('../../../src/commands/goals.js')
    const result = await listGoals(mockConfig)
    expect(result).toEqual(sampleGoals)
    expect(mockGetGoals).toHaveBeenCalledWith('team1')
  })
})

describe('createGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a goal with options', async () => {
    const newGoal = { id: 'g3', name: 'New Goal' }
    mockCreateGoal.mockResolvedValue(newGoal)
    const { createGoal } = await import('../../../src/commands/goals.js')
    const result = await createGoal(mockConfig, 'New Goal', { description: 'A goal' })
    expect(result).toEqual(newGoal)
    expect(mockCreateGoal).toHaveBeenCalledWith('team1', 'New Goal', { description: 'A goal' })
  })
})

describe('updateGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a goal', async () => {
    const updated = { id: 'g1', name: 'Updated' }
    mockUpdateGoal.mockResolvedValue(updated)
    const { updateGoal } = await import('../../../src/commands/goals.js')
    const result = await updateGoal(mockConfig, 'g1', { name: 'Updated' })
    expect(result).toEqual(updated)
    expect(mockUpdateGoal).toHaveBeenCalledWith('g1', { name: 'Updated' })
  })
})

describe('listKeyResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns key results from API', async () => {
    mockGetKeyResults.mockResolvedValue(sampleKeyResults)
    const { listKeyResults } = await import('../../../src/commands/goals.js')
    const result = await listKeyResults(mockConfig, 'g1')
    expect(result).toEqual(sampleKeyResults)
    expect(mockGetKeyResults).toHaveBeenCalledWith('g1')
  })
})

describe('createKeyResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a key result', async () => {
    const newKr = { id: 'kr2', name: 'New KR' }
    mockCreateKeyResult.mockResolvedValue(newKr)
    const { createKeyResult } = await import('../../../src/commands/goals.js')
    const result = await createKeyResult(mockConfig, 'g1', 'New KR', 'number', 10)
    expect(result).toEqual(newKr)
    expect(mockCreateKeyResult).toHaveBeenCalledWith('g1', 'New KR', 'number', 10)
  })
})

describe('updateKeyResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a key result progress', async () => {
    const updated = { id: 'kr1', name: 'Complete API', steps_current: 8 }
    mockUpdateKeyResult.mockResolvedValue(updated)
    const { updateKeyResult } = await import('../../../src/commands/goals.js')
    const result = await updateKeyResult(mockConfig, 'kr1', { progress: 8 })
    expect(result).toEqual(updated)
    expect(mockUpdateKeyResult).toHaveBeenCalledWith('kr1', { steps_current: 8, note: undefined })
  })

  it('updates a key result with note', async () => {
    const updated = { id: 'kr1', name: 'Complete API' }
    mockUpdateKeyResult.mockResolvedValue(updated)
    const { updateKeyResult } = await import('../../../src/commands/goals.js')
    await updateKeyResult(mockConfig, 'kr1', { note: 'Good progress' })
    expect(mockUpdateKeyResult).toHaveBeenCalledWith('kr1', {
      steps_current: undefined,
      note: 'Good progress',
    })
  })
})

describe('formatGoals', () => {
  it('returns "No goals found" for empty array', async () => {
    const { formatGoals } = await import('../../../src/commands/goals.js')
    expect(formatGoals([])).toBe('No goals found')
  })

  it('formats goals with name, id, and percentage', async () => {
    const { formatGoals } = await import('../../../src/commands/goals.js')
    const result = formatGoals(sampleGoals)
    expect(result).toContain('Ship v2')
    expect(result).toContain('75%')
    expect(result).toContain('alice')
  })
})

describe('formatGoalsMarkdown', () => {
  it('returns "No goals found" for empty array', async () => {
    const { formatGoalsMarkdown } = await import('../../../src/commands/goals.js')
    expect(formatGoalsMarkdown([])).toBe('No goals found')
  })

  it('formats goals as markdown list', async () => {
    const { formatGoalsMarkdown } = await import('../../../src/commands/goals.js')
    const result = formatGoalsMarkdown(sampleGoals)
    expect(result).toContain('- **Ship v2** (g1) - 75% - @alice')
    expect(result).toContain('- **Reduce bugs** (g2) - 50%')
  })
})

describe('formatKeyResults', () => {
  it('returns "No key results found" for empty array', async () => {
    const { formatKeyResults } = await import('../../../src/commands/goals.js')
    expect(formatKeyResults([])).toBe('No key results found')
  })

  it('formats key results with name and progress', async () => {
    const { formatKeyResults } = await import('../../../src/commands/goals.js')
    const result = formatKeyResults(sampleKeyResults)
    expect(result).toContain('Complete API')
    expect(result).toContain('7/10')
  })
})

describe('formatKeyResultsMarkdown', () => {
  it('returns "No key results found" for empty array', async () => {
    const { formatKeyResultsMarkdown } = await import('../../../src/commands/goals.js')
    expect(formatKeyResultsMarkdown([])).toBe('No key results found')
  })

  it('formats key results as markdown list', async () => {
    const { formatKeyResultsMarkdown } = await import('../../../src/commands/goals.js')
    const result = formatKeyResultsMarkdown(sampleKeyResults)
    expect(result).toBe('- **Complete API** (kr1) - 7/10 (70%)')
  })
})
