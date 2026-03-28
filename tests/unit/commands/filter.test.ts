import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'

const mockSpawnSync = vi.fn()

vi.mock('fs')

vi.mock('child_process', () => ({
  spawnSync: mockSpawnSync,
}))

const savedEnv: Record<string, string | undefined> = {}

function clearConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'CU_PROFILE', 'XDG_CONFIG_HOME']) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
}

function restoreConfigEnv() {
  for (const key of ['CU_API_TOKEN', 'CU_TEAM_ID', 'CU_PROFILE', 'XDG_CONFIG_HOME']) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
}

function multiProfileConfig(
  profiles: Record<string, Record<string, unknown>>,
  defaultProfile = 'default',
) {
  return JSON.stringify({ defaultProfile, profiles })
}

describe('isAllowedFilterCommand', () => {
  it('allows tasks', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['tasks'])).toBe(true)
  })

  it('allows search with additional flags', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['search', '--status', 'done'])).toBe(true)
  })

  it('allows time list', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['time', 'list'])).toBe(true)
  })

  it('disallows time start', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['time', 'start'])).toBe(false)
  })

  it('disallows update', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['update'])).toBe(false)
  })

  it('disallows delete', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand(['delete'])).toBe(false)
  })

  it('disallows empty array', async () => {
    const { isAllowedFilterCommand } = await import('../../../src/commands/filter.js')
    expect(isAllowedFilterCommand([])).toBe(false)
  })
})

describe('formatFiltersTable', () => {
  it('returns empty message for no filters', async () => {
    const { formatFiltersTable } = await import('../../../src/commands/filter.js')
    expect(formatFiltersTable({})).toBe('No filters saved')
  })

  it('contains filter name, command and description', async () => {
    const { formatFiltersTable } = await import('../../../src/commands/filter.js')
    const result = formatFiltersTable({
      'my-sprint': {
        command: ['tasks', '--status', 'in progress'],
        description: 'Sprint tasks',
      },
    })
    expect(result).toContain('my-sprint')
    expect(result).toContain('tasks --status in progress')
    expect(result).toContain('Sprint tasks')
  })
})

describe('formatFiltersMarkdown', () => {
  it('returns empty message for no filters', async () => {
    const { formatFiltersMarkdown } = await import('../../../src/commands/filter.js')
    expect(formatFiltersMarkdown({})).toBe('No filters saved')
  })

  it('contains filter name and command', async () => {
    const { formatFiltersMarkdown } = await import('../../../src/commands/filter.js')
    const result = formatFiltersMarkdown({ x: { command: ['tasks'] } })
    expect(result).toContain('x')
    expect(result).toContain('tasks')
  })
})

describe('runFilter', () => {
  beforeEach(() => {
    mockSpawnSync.mockClear()
    mockSpawnSync.mockReturnValue({ status: 0 })
  })

  it('calls spawnSync with correct args', async () => {
    const { runFilter } = await import('../../../src/commands/filter.js')
    runFilter('my-sprint', { command: ['tasks', '--status', 'in progress'] })
    expect(mockSpawnSync).toHaveBeenCalledWith(
      process.execPath,
      [process.argv[1], 'tasks', '--status', 'in progress'],
      { stdio: 'inherit' },
    )
  })

  it('sets process.exitCode on non-zero status', async () => {
    mockSpawnSync.mockReturnValue({ status: 1 })
    const { runFilter } = await import('../../../src/commands/filter.js')
    runFilter('my-filter', { command: ['tasks'] })
    expect(process.exitCode).toBe(1)
    process.exitCode = 0
  })

  it('throws when spawnSync reports a spawn error', async () => {
    const spawnError = new Error('ENOENT')
    mockSpawnSync.mockReturnValue({ status: null, error: spawnError })
    const { runFilter } = await import('../../../src/commands/filter.js')
    expect(() => runFilter('my-filter', { command: ['tasks'] })).toThrow('ENOENT')
  })
})

describe('getFilters', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('returns empty object when profile has no filters', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_test', teamId: '1' } }),
    )
    const { getFilters } = await import('../../../src/config.js')
    const result = getFilters()
    expect(result).toEqual({})
  })

  it('returns filters when present', async () => {
    const filters = { 'my-sprint': { command: ['tasks'], description: 'Sprint' } }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_test', teamId: '1', filters } }),
    )
    const { getFilters } = await import('../../../src/config.js')
    const result = getFilters()
    expect(result).toEqual(filters)
  })
})

describe('saveFilter', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('adds a filter to the profile', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_test', teamId: '1' } }),
    )
    const { saveFilter } = await import('../../../src/config.js')
    saveFilter('sprint', { command: ['tasks', '--status', 'in progress'] })
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled()
    const written = JSON.parse(String(vi.mocked(fs.writeFileSync).mock.calls[0]?.[1])) as {
      profiles: { default: { filters: Record<string, unknown> } }
    }
    expect(written.profiles.default.filters).toMatchObject({
      sprint: { command: ['tasks', '--status', 'in progress'] },
    })
  })
})

describe('deleteFilter', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset()
    vi.mocked(fs.readFileSync).mockReset()
    vi.mocked(fs.writeFileSync).mockReset()
    vi.mocked(fs.mkdirSync).mockReset()
    vi.resetModules()
    clearConfigEnv()
  })

  afterEach(() => {
    restoreConfigEnv()
  })

  it('removes a filter from the profile', async () => {
    const filters = { sprint: { command: ['tasks'] }, other: { command: ['search', 'foo'] } }
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_test', teamId: '1', filters } }),
    )
    const { deleteFilter } = await import('../../../src/config.js')
    deleteFilter('sprint')
    expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled()
    const written = JSON.parse(String(vi.mocked(fs.writeFileSync).mock.calls[0]?.[1])) as {
      profiles: { default: { filters: Record<string, unknown> } }
    }
    expect(written.profiles.default.filters).toEqual({ other: { command: ['search', 'foo'] } })
    expect(written.profiles.default.filters).not.toHaveProperty('sprint')
  })

  it('throws if filter name not found', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      multiProfileConfig({ default: { apiToken: 'pk_test', teamId: '1', filters: {} } }),
    )
    const { deleteFilter } = await import('../../../src/config.js')
    expect(() => deleteFilter('nonexistent')).toThrow('Filter "nonexistent" not found.')
  })
})
