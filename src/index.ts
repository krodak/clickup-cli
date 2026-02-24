import { Command } from 'commander'
import { createRequire } from 'module'
import { loadConfig } from './config.js'
import { fetchMyTasks, printTasks } from './commands/tasks.js'
import { updateTask, buildUpdatePayload } from './commands/update.js'
import type { UpdateCommandOptions } from './commands/update.js'
import { createTask } from './commands/create.js'
import type { CreateOptions } from './commands/create.js'
import { getTask } from './commands/get.js'
import { runInitCommand } from './commands/init.js'
import { runSprintCommand } from './commands/sprint.js'
import { fetchSubtasks } from './commands/subtasks.js'
import { postComment } from './commands/comment.js'
import { fetchComments, printComments } from './commands/comments.js'
import { fetchLists, printLists } from './commands/lists.js'
import { isTTY } from './output.js'
import { fetchInbox, printInbox } from './commands/inbox.js'
import { listSpaces } from './commands/spaces.js'
import { runAssignedCommand } from './commands/assigned.js'
import { openTask } from './commands/open.js'
import { runSummaryCommand } from './commands/summary.js'
import { fetchOverdueTasks } from './commands/overdue.js'
import {
  getConfigValue,
  setConfigValue,
  configPath as getConfigFilePath,
} from './commands/config.js'
import { assignTask } from './commands/assign.js'
import { generateCompletion } from './commands/completion.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

function wrapAction<T extends unknown[]>(fn: (...args: T) => Promise<void>): (...args: T) => void {
  return (...args: T) => {
    fn(...args).catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
  }
}

interface TaskFilterOpts {
  status?: string
  list?: string
  space?: string
  name?: string
  json?: boolean
}

const program = new Command()

program
  .name('cu')
  .description('ClickUp CLI for AI agents')
  .version(version)
  .allowExcessArguments(false)

program
  .command('init')
  .description('Set up cu for the first time')
  .action(
    wrapAction(async () => {
      await runInitCommand()
    }),
  )

program
  .command('tasks')
  .description('List tasks assigned to me')
  .option('--status <status>', 'Filter by status (e.g. "in progress")')
  .option('--list <listId>', 'Filter by list ID')
  .option('--space <spaceId>', 'Filter by space ID')
  .option('--name <partial>', 'Filter by name (case-insensitive contains)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: TaskFilterOpts) => {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, {
        typeFilter: 'task',
        statuses: opts.status ? [opts.status] : undefined,
        listIds: opts.list ? [opts.list] : undefined,
        spaceIds: opts.space ? [opts.space] : undefined,
        name: opts.name,
      })
      await printTasks(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('initiatives')
  .description('List initiatives assigned to me')
  .option('--status <status>', 'Filter by status')
  .option('--list <listId>', 'Filter by list ID')
  .option('--space <spaceId>', 'Filter by space ID')
  .option('--name <partial>', 'Filter by name (case-insensitive contains)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: TaskFilterOpts) => {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, {
        typeFilter: 'initiative',
        statuses: opts.status ? [opts.status] : undefined,
        listIds: opts.list ? [opts.list] : undefined,
        spaceIds: opts.space ? [opts.space] : undefined,
        name: opts.name,
      })
      await printTasks(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('task <taskId>')
  .description('Get task details')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await getTask(config, taskId)
      if (opts.json || !isTTY()) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        const lines = [
          `ID:          ${result.id}`,
          `Name:        ${result.name}`,
          `Status:      ${result.status?.status ?? 'unknown'}`,
          `Type:        ${(result.custom_item_id ?? 0) !== 0 ? 'initiative' : 'task'}`,
          `List:        ${result.list?.name ?? 'unknown'}`,
          `URL:         ${result.url}`,
          ...(result.parent ? [`Parent:      ${result.parent}`] : []),
          ...(result.description ? ['', result.description] : []),
        ]
        console.log(lines.join('\n'))
      }
    }),
  )

program
  .command('update <taskId>')
  .description('Update a task')
  .option('-n, --name <text>', 'New task name')
  .option('-d, --description <text>', 'New description (markdown supported)')
  .option('-s, --status <status>', 'New status (e.g. "in progress", "done")')
  .option('--priority <level>', 'Priority: urgent, high, normal, low (or 1-4)')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--assignee <userId>', 'Add assignee by user ID')
  .action(
    wrapAction(async (taskId: string, opts: UpdateCommandOptions) => {
      const config = loadConfig()
      const payload = buildUpdatePayload(opts)
      const result = await updateTask(config, taskId, payload)
      if (isTTY()) {
        console.log(`Updated task ${result.id}: "${result.name}"`)
      } else {
        console.log(JSON.stringify(result, null, 2))
      }
    }),
  )

program
  .command('create')
  .description('Create a new task')
  .option('-l, --list <listId>', 'Target list ID (auto-detected from --parent if omitted)')
  .requiredOption('-n, --name <name>', 'Task name')
  .option('-d, --description <text>', 'Task description')
  .option('-p, --parent <taskId>', 'Parent task ID (list auto-detected from parent)')
  .option('-s, --status <status>', 'Initial status')
  .option('--priority <level>', 'Priority: urgent, high, normal, low (or 1-4)')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--assignee <userId>', 'Assignee user ID')
  .option('--tags <tags>', 'Comma-separated tag names')
  .action(
    wrapAction(async (opts: CreateOptions) => {
      const config = loadConfig()
      const result = await createTask(config, opts)
      if (isTTY()) {
        console.log(`Created task ${result.id}: "${result.name}" - ${result.url}`)
      } else {
        console.log(JSON.stringify(result, null, 2))
      }
    }),
  )

program
  .command('sprint')
  .description('List my tasks in the current active sprint (auto-detected)')
  .option('--status <status>', 'Filter by status')
  .option('--space <nameOrId>', 'Narrow sprint search to a specific space (partial name or ID)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { status?: string; space?: string; json?: boolean }) => {
      const config = loadConfig()
      await runSprintCommand(config, opts)
    }),
  )

program
  .command('subtasks <taskId>')
  .description('List subtasks of a task or initiative')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const tasks = await fetchSubtasks(config, taskId)
      await printTasks(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('comment <taskId>')
  .description('Post a comment on a task')
  .requiredOption('-m, --message <text>', 'Comment text')
  .action(
    wrapAction(async (taskId: string, opts: { message: string }) => {
      const config = loadConfig()
      const result = await postComment(config, taskId, opts.message)
      if (isTTY()) {
        console.log(`Comment posted (id: ${result.id})`)
      } else {
        console.log(JSON.stringify(result, null, 2))
      }
    }),
  )

program
  .command('comments <taskId>')
  .description('List comments on a task')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const comments = await fetchComments(config, taskId)
      printComments(comments, opts.json ?? false)
    }),
  )

program
  .command('lists <spaceId>')
  .description('List all lists in a space (including lists inside folders)')
  .option('--name <partial>', 'Filter by name (case-insensitive contains)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (spaceId: string, opts: { name?: string; json?: boolean }) => {
      const config = loadConfig()
      const lists = await fetchLists(config, spaceId, { name: opts.name })
      printLists(lists, opts.json ?? false)
    }),
  )

program
  .command('spaces')
  .description('List spaces in your workspace')
  .option('--name <partial>', 'Filter spaces by name (case-insensitive contains)')
  .option('--my', 'Show only spaces where I have assigned tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { name?: string; my?: boolean; json?: boolean }) => {
      const config = loadConfig()
      await listSpaces(config, opts)
    }),
  )

program
  .command('inbox')
  .description('Recently updated tasks grouped by time period')
  .option('--json', 'Force JSON output even in terminal')
  .option('--days <n>', 'Lookback period in days', '30')
  .action(
    wrapAction(async (opts: { json?: boolean; days?: string }) => {
      const config = loadConfig()
      const days = Number(opts.days ?? 30)
      if (!Number.isFinite(days) || days <= 0) {
        console.error('Error: --days must be a positive number')
        process.exit(1)
      }
      const tasks = await fetchInbox(config, days)
      await printInbox(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('assigned')
  .description('Show all tasks assigned to me, grouped by status')
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { includeClosed?: boolean; json?: boolean }) => {
      const config = loadConfig()
      await runAssignedCommand(config, opts)
    }),
  )

program
  .command('open <query>')
  .description('Open a task in the browser by ID or name')
  .option('--json', 'Output task JSON instead of opening')
  .action(
    wrapAction(async (query: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await openTask(config, query, opts)
    }),
  )

program
  .command('summary')
  .description('Daily standup summary: completed, in-progress, overdue')
  .option('--hours <n>', 'Completed-tasks lookback in hours', '24')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { hours?: string; json?: boolean }) => {
      const config = loadConfig()
      const hours = Number(opts.hours ?? 24)
      if (!Number.isFinite(hours) || hours <= 0) {
        console.error('Error: --hours must be a positive number')
        process.exit(1)
      }
      await runSummaryCommand(config, { hours, json: opts.json ?? false })
    }),
  )

program
  .command('overdue')
  .description('List tasks that are past their due date')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const tasks = await fetchOverdueTasks(config)
      await printTasks(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('assign <taskId>')
  .description('Assign or unassign users from a task')
  .option('--to <userId>', 'Add assignee (user ID or "me")')
  .option('--remove <userId>', 'Remove assignee (user ID or "me")')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { to?: string; remove?: string; json?: boolean }) => {
      const config = loadConfig()
      const result = await assignTask(config, taskId, opts)
      if (opts.json || !isTTY()) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        const parts: string[] = []
        if (opts.to) parts.push(`Assigned ${opts.to} to task ${taskId}`)
        if (opts.remove) parts.push(`Removed ${opts.remove} from task ${taskId}`)
        console.log(parts.join('; '))
      }
    }),
  )

const configCmd = program.command('config').description('Manage CLI configuration')

configCmd
  .command('get <key>')
  .description('Print a config value')
  .action(
    wrapAction(async (key: string) => {
      const value = getConfigValue(key)
      if (value !== undefined) {
        console.log(value)
      }
    }),
  )

configCmd
  .command('set <key> <value>')
  .description('Set a config value')
  .action(
    wrapAction(async (key: string, value: string) => {
      setConfigValue(key, value)
    }),
  )

configCmd
  .command('path')
  .description('Print config file path')
  .action(
    wrapAction(async () => {
      console.log(getConfigFilePath())
    }),
  )

program
  .command('completion <shell>')
  .description('Output shell completion script (bash, zsh, fish)')
  .action(
    wrapAction(async (shell: string) => {
      const script = generateCompletion(shell)
      process.stdout.write(script)
    }),
  )

process.on('SIGINT', () => {
  process.stderr.write('\nInterrupted\n')
  process.exit(130)
})

program.parse()
