import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSpaces = vi.fn()
const mockGetMyTasks = vi.fn()

vi.mock('../../../src/api.js', () => ({
  ClickUpClient: vi.fn().mockImplementation(() => ({
    getSpaces: mockGetSpaces,
    getMyTasks: mockGetMyTasks,
  })),
}))

const mockIsTTY = vi.fn<() => boolean>()
const mockShouldOutputJson = vi.fn<(forceJson: boolean) => boolean>()

vi.mock('../../../src/output.js', async importOriginal => {
  const orig = await importOriginal<typeof import('../../../src/output.js')>()
  return {
    ...orig,
    isTTY: (...args: Parameters<typeof orig.isTTY>) => mockIsTTY(...args),
    shouldOutputJson: (...args: Parameters<typeof orig.shouldOutputJson>) =>
      mockShouldOutputJson(...args),
  }
})

const config = { apiToken: 'pk_test', teamId: 'team1' }

const sampleSpaces = [
  { id: 's1', name: 'Engineering' },
  { id: 's2', name: 'Design' },
]

describe('listSpaces', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockGetSpaces.mockReset()
    mockGetMyTasks.mockReset()
    mockIsTTY.mockReset()
    mockShouldOutputJson.mockReset()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockGetSpaces.mockResolvedValue(sampleSpaces)
  })

  it('prints table with header in TTY mode', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(true)

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces(config, {})

    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('ID')
    expect(output).toContain('NAME')
    expect(output).toContain('s1')
    expect(output).toContain('Engineering')
    expect(output).toContain('s2')
    expect(output).toContain('Design')
  })

  it('prints JSON when --json is set', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockIsTTY.mockReturnValue(false)

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces(config, { json: true })

    const output = logSpy.mock.calls[0]![0] as string
    expect(() => JSON.parse(output)).not.toThrow()
    const parsed = JSON.parse(output) as typeof sampleSpaces
    expect(parsed).toEqual(sampleSpaces)
  })

  it('outputs markdown when piped and --json is not set', async () => {
    mockShouldOutputJson.mockReturnValue(false)
    mockIsTTY.mockReturnValue(false)

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces(config, {})

    expect(logSpy).toHaveBeenCalledOnce()
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('|')
    expect(output).toContain('Engineering')
    expect(output).toContain('Design')
    expect(output).not.toContain('"id"')
  })

  it('filters spaces by name', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockIsTTY.mockReturnValue(false)

    const { listSpaces } = await import('../../../src/commands/spaces.js')
    await listSpaces(config, { name: 'eng', json: true })

    const output = logSpy.mock.calls[0]![0] as string
    const parsed = JSON.parse(output) as Array<{ id: string; name: string }>
    expect(parsed).toHaveLength(1)
    expect(parsed[0]!.name).toBe('Engineering')
  })
})
