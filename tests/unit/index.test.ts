import { execFile } from 'child_process'
import { promisify } from 'util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const execFileAsync = promisify(execFile)

const config = { apiToken: 'pk_test', teamId: 'team_1' }

const mockLoadConfig = vi.fn(() => config)
const mockGetTask = vi.fn()
const mockRunSummaryCommand = vi.fn()
const mockEditChecklistItem = vi.fn()
const mockIsTTY = vi.fn<() => boolean>()
const mockShouldOutputJson = vi.fn<(forceJson: boolean) => boolean>()
const mockFormatTaskDetail = vi.fn()
const mockFormatTaskDetailMarkdown = vi.fn()

async function loadCli() {
  vi.resetModules()

  vi.doMock('../../src/config.js', () => ({
    loadConfig: mockLoadConfig,
  }))

  vi.doMock('../../src/commands/get.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/get.js')>()
    return {
      ...actual,
      getTask: mockGetTask,
    }
  })

  vi.doMock('../../src/commands/summary.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/summary.js')>()
    return {
      ...actual,
      runSummaryCommand: mockRunSummaryCommand,
    }
  })

  vi.doMock('../../src/commands/checklist.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/checklist.js')>()
    return {
      ...actual,
      editChecklistItem: mockEditChecklistItem,
    }
  })

  vi.doMock('../../src/output.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/output.js')>()
    return {
      ...actual,
      isTTY: mockIsTTY,
      shouldOutputJson: mockShouldOutputJson,
    }
  })

  vi.doMock('../../src/interactive.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/interactive.js')>()
    return {
      ...actual,
      formatTaskDetail: mockFormatTaskDetail,
    }
  })

  vi.doMock('../../src/markdown.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/markdown.js')>()
    return {
      ...actual,
      formatTaskDetailMarkdown: mockFormatTaskDetailMarkdown,
    }
  })

  return import('../../src/index.js')
}

describe('CLI entry point', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockLoadConfig.mockClear()
    mockLoadConfig.mockReturnValue(config)
    mockGetTask.mockReset()
    mockRunSummaryCommand.mockReset()
    mockEditChecklistItem.mockReset()
    mockIsTTY.mockReset().mockReturnValue(false)
    mockShouldOutputJson.mockReset().mockReturnValue(false)
    mockFormatTaskDetail.mockReset().mockReturnValue('TTY detail')
    mockFormatTaskDetailMarkdown.mockReset().mockReturnValue('# Markdown detail')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('run() invokes parseAsync and processes commands', async () => {
    mockGetTask.mockResolvedValue({ id: 'task-1', name: 'Task One' })

    const { run } = await loadCli()
    await run(['node', 'cup', 'task', 'task-1'])

    expect(mockGetTask).toHaveBeenCalledWith(config, 'task-1')
  })

  it('buildProgram responds to --version', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')
    program.exitOverride()

    let versionOutput = ''
    program.configureOutput({ writeOut: (str: string) => (versionOutput = str) })

    try {
      await program.parseAsync(['--version'], { from: 'user' })
    } catch {
      // Commander throws on --version with exitOverride
    }

    expect(versionOutput.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('formats task detail as markdown when output is piped', async () => {
    mockGetTask.mockResolvedValue({ id: 'task-1', name: 'Task One' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['task', 'task-1'], { from: 'user' })

    expect(mockLoadConfig).toHaveBeenCalledOnce()
    expect(mockGetTask).toHaveBeenCalledWith(config, 'task-1')
    expect(mockFormatTaskDetailMarkdown).toHaveBeenCalledWith({ id: 'task-1', name: 'Task One' })
    expect(mockFormatTaskDetail).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('# Markdown detail')
  })

  it('formats task detail for TTY output when json is not forced', async () => {
    mockIsTTY.mockReturnValue(true)
    mockGetTask.mockResolvedValue({ id: 'task-1', name: 'Task One' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['task', 'task-1'], { from: 'user' })

    expect(mockFormatTaskDetail).toHaveBeenCalledWith({ id: 'task-1', name: 'Task One' })
    expect(mockFormatTaskDetailMarkdown).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('TTY detail')
  })

  it('outputs task detail as JSON when --json is provided', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockGetTask.mockResolvedValue({ id: 'task-1', name: 'Task One' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['task', 'task-1', '--json'], { from: 'user' })

    expect(mockFormatTaskDetail).not.toHaveBeenCalled()
    expect(mockFormatTaskDetailMarkdown).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({ id: 'task-1', name: 'Task One' }, null, 2),
    )
  })

  it('parses summary hours before delegating to the command module', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['summary', '--hours', '6', '--json'], { from: 'user' })

    expect(mockRunSummaryCommand).toHaveBeenCalledWith(config, { hours: 6, json: true })
  })

  it('rejects checklist assignee values that are not numeric', async () => {
    const exitError = new Error('process.exit:1')
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null) => {
        throw code === 1 ? exitError : new Error(`process.exit:${String(code)}`)
      })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await expect(
      program.parseAsync(['checklist', 'edit-item', 'chk-1', 'item-1', '--assignee', 'abc'], {
        from: 'user',
      }),
    ).rejects.toBe(exitError)

    expect(mockEditChecklistItem).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('--assignee must be a number or "null"')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

describe('binary smoke test', () => {
  it('node dist/index.js --version outputs a valid semver', async () => {
    const { stdout } = await execFileAsync('node', ['dist/index.js', '--version'])
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('node dist/index.js --help lists commands', async () => {
    const { stdout } = await execFileAsync('node', ['dist/index.js', '--help'])
    expect(stdout).toContain('tasks')
    expect(stdout).toContain('sprint')
    expect(stdout).toContain('config')
  })
})
