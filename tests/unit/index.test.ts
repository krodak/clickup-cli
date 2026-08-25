import { execFile } from 'child_process'
import { existsSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
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
const mockBulkUpdateStatus = vi.fn()
const mockSetCustomField = vi.fn()
const mockBulkField = vi.fn()
const mockCreateDocPage = vi.fn()
const mockEditDocPage = vi.fn()

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

  vi.doMock('../../src/commands/doc.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/doc.js')>()
    return {
      ...actual,
      createDocPage: mockCreateDocPage,
      editDocPage: mockEditDocPage,
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

  vi.doMock('../../src/commands/bulk.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/bulk.js')>()
    return {
      ...actual,
      bulkUpdateStatus: mockBulkUpdateStatus,
      bulkField: mockBulkField,
    }
  })

  vi.doMock('../../src/commands/field.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/field.js')>()
    return {
      ...actual,
      setCustomField: mockSetCustomField,
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
    mockBulkUpdateStatus.mockReset()
    mockSetCustomField.mockReset().mockResolvedValue({ results: [] })
    mockBulkField.mockReset().mockResolvedValue({ updated: 1, failed: [] })
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
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['checklist', 'edit-item', 'chk-1', 'item-1', '--assignee', 'abc'], {
      from: 'user',
    })

    expect(mockEditChecklistItem).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('--assignee must be a number or "null"')
    expect(process.exitCode).toBe(1)
  })

  it('bulk status routes failed rows to stderr, not stdout', async () => {
    mockBulkUpdateStatus.mockResolvedValue({
      updated: 2,
      failed: [
        { id: 't2', reason: 'Not found' },
        { id: 't4', reason: 'Invalid status' },
      ],
    })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['bulk', 'status', 'done', 't1', 't2', 't3', 't4'], { from: 'user' })

    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(config, ['t1', 't2', 't3', 't4'], 'done')

    const stdoutCalls = vi.mocked(console.log).mock.calls.map(c => c.join(' '))
    const stderrCalls = vi.mocked(console.error).mock.calls.map(c => c.join(' '))

    expect(stdoutCalls.some(line => line.includes('t2'))).toBe(false)
    expect(stdoutCalls.some(line => line.includes('t4'))).toBe(false)
    expect(stdoutCalls.some(line => line.includes('Not found'))).toBe(false)
    expect(stdoutCalls.some(line => line.includes('Invalid status'))).toBe(false)

    expect(stderrCalls.some(line => line.includes('t2') && line.includes('Not found'))).toBe(true)
    expect(stderrCalls.some(line => line.includes('t4') && line.includes('Invalid status'))).toBe(
      true,
    )
  })
})

describe('cup field --value-file', () => {
  const tmpFile = join(tmpdir(), `cup-value-file-test-${process.pid}.md`)

  beforeEach(() => {
    vi.restoreAllMocks()
    mockLoadConfig.mockClear().mockReturnValue(config)
    mockSetCustomField.mockReset().mockResolvedValue({ results: [] })
    mockBulkField.mockReset().mockResolvedValue({ updated: 1, failed: [] })
    mockIsTTY.mockReset().mockReturnValue(false)
    mockShouldOutputJson.mockReset().mockReturnValue(false)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.exitCode = undefined
    writeFileSync(tmpFile, "Done X; didn't finish the team's review.\n\nNext: Y with `code`.\n")
  })

  afterEach(() => {
    process.exitCode = undefined
    if (existsSync(tmpFile)) rmSync(tmpFile)
  })

  it('reads the field value from a file, stripping one trailing newline', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['field', 'task-1', '--set', 'Notes', '--value-file', tmpFile], {
      from: 'user',
    })

    expect(mockSetCustomField).toHaveBeenCalledWith(config, 'task-1', {
      set: ['Notes', "Done X; didn't finish the team's review.\n\nNext: Y with `code`."],
    })
  })

  it('still accepts an inline value (backward compatible)', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['field', 'task-1', '--set', 'Notes', 'inline value'], {
      from: 'user',
    })

    expect(mockSetCustomField).toHaveBeenCalledWith(config, 'task-1', {
      set: ['Notes', 'inline value'],
    })
  })

  it('rejects an inline value combined with --value-file', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(
      ['field', 'task-1', '--set', 'Notes', 'inline', '--value-file', tmpFile],
      { from: 'user' },
    )

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot use --set <value> and --value-file together'),
    )
    expect(process.exitCode).toBe(1)
    expect(mockSetCustomField).not.toHaveBeenCalled()
  })

  it('rejects --value-file without --set', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['field', 'task-1', '--value-file', tmpFile], { from: 'user' })

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('--value-file requires --set'),
    )
    expect(process.exitCode).toBe(1)
    expect(mockSetCustomField).not.toHaveBeenCalled()
  })

  it('rejects --set with a name but no value and no --value-file', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['field', 'task-1', '--set', 'Notes'], { from: 'user' })

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--set requires a value'))
    expect(process.exitCode).toBe(1)
    expect(mockSetCustomField).not.toHaveBeenCalled()
  })

  it('supports --value-file on bulk field', async () => {
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(
      ['bulk', 'field', 't1', 't2', '--set', 'Notes', '--value-file', tmpFile],
      { from: 'user' },
    )

    expect(mockBulkField).toHaveBeenCalledWith(
      config,
      'Notes',
      "Done X; didn't finish the team's review.\n\nNext: Y with `code`.",
      ['t1', 't2'],
    )
  })
})

describe('global option collisions', () => {
  it('no subcommand declares a short flag that a global option already uses', async () => {
    // Commander resolves a shared short flag to the global option, so a
    // subcommand that reuses one silently becomes unreachable. `cup create -p`
    // was parsed as --profile and failed with "Profile <taskId> not found".
    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    const isHelp = (long?: string | null) => long === '--help'
    const globalShorts = new Map<string, string>()
    for (const option of program.options) {
      if (option.short && !isHelp(option.long)) {
        globalShorts.set(option.short, option.long ?? option.short)
      }
    }

    const collisions: string[] = []
    for (const command of program.commands) {
      for (const option of command.options) {
        if (!option.short || isHelp(option.long)) continue
        const globalLong = globalShorts.get(option.short)
        if (globalLong) {
          collisions.push(
            `${command.name()}: ${option.short}, ${option.long} collides with global ${option.short}, ${globalLong}`,
          )
        }
      }
    }

    expect(collisions).toEqual([])
  })
})

describe('binary smoke test', () => {
  describe('cup doc-page-create / doc-page-edit --content-file', () => {
    const tmpFile = join(tmpdir(), `cup-content-file-test-${process.pid}.md`)

    beforeEach(() => {
      vi.restoreAllMocks()
      mockLoadConfig.mockClear().mockReturnValue(config)
      mockCreateDocPage.mockReset().mockResolvedValue({ id: 'p9', doc_id: 'd1', name: 'Page' })
      mockEditDocPage.mockReset().mockResolvedValue({ id: 'p9', doc_id: 'd1', name: 'Page' })
      mockIsTTY.mockReset().mockReturnValue(false)
      mockShouldOutputJson.mockReset().mockReturnValue(false)
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
      process.exitCode = undefined
      writeFileSync(tmpFile, '# Heading\n\nBody with $vars and [links](https://example.com).\n')
    })

    afterEach(() => {
      process.exitCode = undefined
      if (existsSync(tmpFile)) rmSync(tmpFile)
    })

    it('doc-page-create reads content from a file, stripping one trailing newline', async () => {
      const { buildProgram } = await loadCli()
      const program = buildProgram('cup')

      await program.parseAsync(
        ['doc-page-create', 'd1', 'Release Notes', '--content-file', tmpFile],
        {
          from: 'user',
        },
      )

      expect(mockCreateDocPage).toHaveBeenCalledWith(
        config,
        'd1',
        'Release Notes',
        '# Heading\n\nBody with $vars and [links](https://example.com).',
        undefined,
      )
    })

    it('doc-page-edit reads content from a file', async () => {
      const { buildProgram } = await loadCli()
      const program = buildProgram('cup')

      await program.parseAsync(['doc-page-edit', 'd1', 'p9', '--content-file', tmpFile], {
        from: 'user',
      })

      expect(mockEditDocPage).toHaveBeenCalledWith(config, 'd1', 'p9', {
        name: undefined,
        content: '# Heading\n\nBody with $vars and [links](https://example.com).',
      })
    })

    it('still accepts inline content (backward compatible)', async () => {
      const { buildProgram } = await loadCli()
      const program = buildProgram('cup')

      await program.parseAsync(['doc-page-create', 'd1', 'Page', '-c', '# Inline'], {
        from: 'user',
      })

      expect(mockCreateDocPage).toHaveBeenCalledWith(config, 'd1', 'Page', '# Inline', undefined)
    })

    it('rejects -c combined with --content-file on doc-page-create', async () => {
      const { buildProgram } = await loadCli()
      const program = buildProgram('cup')

      await program.parseAsync(
        ['doc-page-create', 'd1', 'Page', '-c', '# Inline', '--content-file', tmpFile],
        { from: 'user' },
      )

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot use -c and --content-file together'),
      )
      expect(process.exitCode).toBe(1)
      expect(mockCreateDocPage).not.toHaveBeenCalled()
    })

    it('rejects -c combined with --content-file on doc-page-edit', async () => {
      const { buildProgram } = await loadCli()
      const program = buildProgram('cup')

      await program.parseAsync(
        ['doc-page-edit', 'd1', 'p9', '-c', '# Inline', '--content-file', tmpFile],
        { from: 'user' },
      )

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot use -c and --content-file together'),
      )
      expect(process.exitCode).toBe(1)
      expect(mockEditDocPage).not.toHaveBeenCalled()
    })
  })

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
