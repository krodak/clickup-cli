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
const mockListListTemplates = vi.fn()
const mockFormatListTemplates = vi.fn()
const mockFormatListTemplatesMarkdown = vi.fn()
const mockListFolderTemplates = vi.fn()
const mockFormatFolderTemplates = vi.fn()
const mockFormatFolderTemplatesMarkdown = vi.fn()
const mockCreateListFromTemplate = vi.fn()
const mockListViews = vi.fn()
const mockFormatViews = vi.fn()
const mockFormatViewsMarkdown = vi.fn()
const mockGetViewCmd = vi.fn()
const mockFormatView = vi.fn()
const mockFormatViewMarkdown = vi.fn()
const mockCreateView = vi.fn()
const mockUpdateViewCommand = vi.fn()
const mockDeleteViewCommand = vi.fn()

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

  vi.doMock('../../src/commands/list-templates.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/list-templates.js')>()
    return {
      ...actual,
      listListTemplates: mockListListTemplates,
      formatListTemplates: mockFormatListTemplates,
      formatListTemplatesMarkdown: mockFormatListTemplatesMarkdown,
    }
  })

  vi.doMock('../../src/commands/folder-templates.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/folder-templates.js')>()
    return {
      ...actual,
      listFolderTemplates: mockListFolderTemplates,
      formatFolderTemplates: mockFormatFolderTemplates,
      formatFolderTemplatesMarkdown: mockFormatFolderTemplatesMarkdown,
    }
  })

  vi.doMock('../../src/commands/list-from-template.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/list-from-template.js')>()
    return {
      ...actual,
      createListFromTemplate: mockCreateListFromTemplate,
    }
  })

  vi.doMock('../../src/commands/views.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/views.js')>()
    return {
      ...actual,
      listViews: mockListViews,
      formatViews: mockFormatViews,
      formatViewsMarkdown: mockFormatViewsMarkdown,
    }
  })

  vi.doMock('../../src/commands/view.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/view.js')>()
    return {
      ...actual,
      getView: mockGetViewCmd,
      formatView: mockFormatView,
      formatViewMarkdown: mockFormatViewMarkdown,
    }
  })

  vi.doMock('../../src/commands/view-create.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/view-create.js')>()
    return {
      ...actual,
      createView: mockCreateView,
    }
  })

  vi.doMock('../../src/commands/view-update.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/view-update.js')>()
    return {
      ...actual,
      updateViewCommand: mockUpdateViewCommand,
    }
  })

  vi.doMock('../../src/commands/view-delete.js', async importOriginal => {
    const actual = await importOriginal<typeof import('../../src/commands/view-delete.js')>()
    return {
      ...actual,
      deleteViewCommand: mockDeleteViewCommand,
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
    mockListListTemplates.mockReset()
    mockFormatListTemplates.mockReset().mockReturnValue('TTY list templates')
    mockFormatListTemplatesMarkdown.mockReset().mockReturnValue('- **Sprint Board** (tmpl_1)')
    mockListFolderTemplates.mockReset()
    mockFormatFolderTemplates.mockReset().mockReturnValue('TTY folder templates')
    mockFormatFolderTemplatesMarkdown
      .mockReset()
      .mockReturnValue('- **Engineering Sprint Folder** (tmpl_1)')
    mockCreateListFromTemplate.mockReset()
    mockListViews.mockReset()
    mockFormatViews.mockReset().mockReturnValue('TTY views')
    mockFormatViewsMarkdown.mockReset().mockReturnValue('- **Board** (v1) — board')
    mockGetViewCmd.mockReset()
    mockFormatView.mockReset().mockReturnValue('TTY view detail')
    mockFormatViewMarkdown.mockReset().mockReturnValue('## Board')
    mockCreateView.mockReset()
    mockUpdateViewCommand.mockReset()
    mockDeleteViewCommand.mockReset()
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

  it('formats list templates as markdown when output is piped', async () => {
    mockListListTemplates.mockResolvedValue([{ id: 'tmpl_1', name: 'Sprint Board' }])

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['list-templates'], { from: 'user' })

    expect(mockListListTemplates).toHaveBeenCalledWith(config)
    expect(mockFormatListTemplatesMarkdown).toHaveBeenCalledWith([
      { id: 'tmpl_1', name: 'Sprint Board' },
    ])
    expect(console.log).toHaveBeenCalledWith('- **Sprint Board** (tmpl_1)')
  })

  it('formats folder templates for TTY output when json is not forced', async () => {
    mockIsTTY.mockReturnValue(true)
    mockListFolderTemplates.mockResolvedValue([{ id: 'tmpl_1', name: 'Engineering Sprint Folder' }])

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['folder-templates'], { from: 'user' })

    expect(mockListFolderTemplates).toHaveBeenCalledWith(config)
    expect(mockFormatFolderTemplates).toHaveBeenCalledWith([
      { id: 'tmpl_1', name: 'Engineering Sprint Folder' },
    ])
    expect(console.log).toHaveBeenCalledWith('TTY folder templates')
  })

  it('outputs lists created from templates as JSON when --json is provided', async () => {
    mockShouldOutputJson.mockReturnValue(true)
    mockCreateListFromTemplate.mockResolvedValue({ id: 'list_1', name: 'Sprint Board' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(
      [
        'list-from-template',
        'Sprint Board',
        '--template',
        'tmpl_1',
        '--space',
        'space_1',
        '--json',
      ],
      { from: 'user' },
    )

    expect(mockCreateListFromTemplate).toHaveBeenCalledWith(config, 'Sprint Board', {
      template: 'tmpl_1',
      space: 'space_1',
      json: true,
    })
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({ id: 'list_1', name: 'Sprint Board' }, null, 2),
    )
  })

  it('prints a success message when a list is created from a template', async () => {
    mockCreateListFromTemplate.mockResolvedValue({ id: 'list_2', name: 'Roadmap' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(
      ['list-from-template', 'Roadmap', '--template', 'tmpl_2', '--folder', 'folder_1'],
      { from: 'user' },
    )

    expect(console.log).toHaveBeenCalledWith('Created list "Roadmap" (list_2) from template')
  })

  it('formats views as markdown when output is piped', async () => {
    mockListViews.mockResolvedValue([{ id: 'v1', name: 'Board', type: 'board' }])

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['views', 'list_1'], { from: 'user' })

    expect(mockListViews).toHaveBeenCalledWith(config, 'list_1')
    expect(mockFormatViewsMarkdown).toHaveBeenCalledWith([
      { id: 'v1', name: 'Board', type: 'board' },
    ])
    expect(console.log).toHaveBeenCalledWith('- **Board** (v1) — board')
  })

  it('formats view detail as markdown when output is piped', async () => {
    mockGetViewCmd.mockResolvedValue({ id: 'v1', name: 'Board', type: 'board' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['view', 'v1'], { from: 'user' })

    expect(mockGetViewCmd).toHaveBeenCalledWith(config, 'v1')
    expect(mockFormatViewMarkdown).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith('## Board')
  })

  it('creates a view and prints success message', async () => {
    mockCreateView.mockResolvedValue({ id: 'v1', name: 'Sprint Board', type: 'board' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(
      ['view-create', 'list_1', 'Sprint Board', '--type', 'board'],
      { from: 'user' },
    )

    expect(mockCreateView).toHaveBeenCalledWith(config, 'list_1', 'Sprint Board', {
      type: 'board',
    })
    expect(console.log).toHaveBeenCalledWith(
      'Created board view "Sprint Board" (v1)',
    )
  })

  it('updates a view and prints success message', async () => {
    mockUpdateViewCommand.mockResolvedValue({ id: 'v1', name: 'Renamed', type: 'board' })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['view-update', 'v1', '--name', 'Renamed'], { from: 'user' })

    expect(mockUpdateViewCommand).toHaveBeenCalledWith(config, 'v1', { name: 'Renamed' })
    expect(console.log).toHaveBeenCalledWith('Updated view "Renamed" (v1)')
  })

  it('deletes a view and prints success message', async () => {
    mockDeleteViewCommand.mockResolvedValue({ viewId: 'v1', deleted: true })

    const { buildProgram } = await loadCli()
    const program = buildProgram('cup')

    await program.parseAsync(['view-delete', 'v1', '--confirm'], { from: 'user' })

    expect(mockDeleteViewCommand).toHaveBeenCalledWith(config, 'v1', { confirm: true })
    expect(console.log).toHaveBeenCalledWith('Deleted view v1')
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
