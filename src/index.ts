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
import { listSprints } from './commands/sprints.js'
import { fetchSubtasks } from './commands/subtasks.js'
import { postComment } from './commands/comment.js'
import { fetchComments, printComments } from './commands/comments.js'
import { fetchLists, printLists } from './commands/lists.js'
import { formatTaskDetail } from './interactive.js'
import { isTTY, shouldOutputJson } from './output.js'
import {
  formatTaskDetailMarkdown,
  formatUpdateConfirmation,
  formatCreateConfirmation,
  formatCommentConfirmation,
  formatAssignConfirmation,
} from './markdown.js'
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
import { fetchActivity, printActivity } from './commands/activity.js'
import { generateCompletion } from './commands/completion.js'
import { checkAuth } from './commands/auth.js'
import { searchTasks } from './commands/search.js'
import { manageDependency } from './commands/depend.js'
import type { DependOptions } from './commands/depend.js'
import { moveTask } from './commands/move.js'
import type { MoveOptions } from './commands/move.js'
import { setCustomField } from './commands/field.js'
import { deleteTaskCommand } from './commands/delete.js'
import { manageTags } from './commands/tag.js'

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
  includeClosed?: boolean
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
  .command('auth')
  .description('Validate API token and show current user')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await checkAuth(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else if (result.authenticated && result.user) {
        console.log(`Authenticated as @${result.user.username} (id: ${result.user.id})`)
      } else {
        throw new Error(`Authentication failed: ${result.error ?? 'unknown error'}`)
      }
    }),
  )

program
  .command('tasks')
  .description('List tasks assigned to me')
  .option('--status <status>', 'Filter by status (e.g. "in progress")')
  .option('--list <listId>', 'Filter by list ID')
  .option('--space <spaceId>', 'Filter by space ID')
  .option('--name <partial>', 'Filter by name (case-insensitive contains)')
  .option('--include-closed', 'Include done/closed tasks')
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
        includeClosed: opts.includeClosed,
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
  .option('--include-closed', 'Include done/closed tasks')
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
        includeClosed: opts.includeClosed,
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
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else if (!isTTY()) {
        console.log(formatTaskDetailMarkdown(result))
      } else {
        console.log(formatTaskDetail(result))
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
  .option('--time-estimate <duration>', 'Time estimate (e.g. "2h", "30m", "1h30m")')
  .option('--assignee <userId>', 'Add assignee by user ID')
  .option('--parent <taskId>', 'Set parent task (makes this a subtask)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: UpdateCommandOptions & { json?: boolean }) => {
      const config = loadConfig()
      const payload = buildUpdatePayload(opts)
      const result = await updateTask(config, taskId, payload)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(formatUpdateConfirmation(result.id, result.name))
      }
    }),
  )

program
  .command('create')
  .description('Create a new task')
  .option('-l, --list <listId>', 'Target list ID (auto-detected from --parent if omitted)')
  .requiredOption('-n, --name <name>', 'Task name')
  .option('-d, --description <text>', 'Task description (markdown supported)')
  .option('-p, --parent <taskId>', 'Parent task ID (list auto-detected from parent)')
  .option('-s, --status <status>', 'Initial status')
  .option('--priority <level>', 'Priority: urgent, high, normal, low (or 1-4)')
  .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
  .option('--assignee <userId>', 'Assignee user ID')
  .option('--tags <tags>', 'Comma-separated tag names')
  .option('--custom-item-id <id>', 'Custom task type ID (use to create initiatives)')
  .option('--time-estimate <duration>', 'Time estimate (e.g. "2h", "30m", "1h30m")')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: CreateOptions & { json?: boolean }) => {
      const config = loadConfig()
      const result = await createTask(config, opts)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(formatCreateConfirmation(result.id, result.name, result.url))
      }
    }),
  )

program
  .command('sprint')
  .description('List my tasks in the current active sprint (auto-detected)')
  .option('--status <status>', 'Filter by status')
  .option('--space <nameOrId>', 'Narrow sprint search to a specific space (partial name or ID)')
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (opts: {
        status?: string
        space?: string
        includeClosed?: boolean
        json?: boolean
      }) => {
        const config = loadConfig()
        await runSprintCommand(config, opts)
      },
    ),
  )

program
  .command('sprints')
  .description('List all sprints in sprint folders')
  .option('--space <nameOrId>', 'Filter by space (partial name or ID)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { space?: string; json?: boolean }) => {
      const config = loadConfig()
      await listSprints(config, opts)
    }),
  )

program
  .command('subtasks <taskId>')
  .description('List subtasks of a task or initiative')
  .option('--status <status>', 'Filter by status')
  .option('--name <partial>', 'Filter by name (case-insensitive contains)')
  .option('--include-closed', 'Include closed/done subtasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        taskId: string,
        opts: { status?: string; name?: string; includeClosed?: boolean; json?: boolean },
      ) => {
        const config = loadConfig()
        let tasks = await fetchSubtasks(config, taskId, { includeClosed: opts.includeClosed })
        if (opts.status) {
          const lower = opts.status.toLowerCase()
          tasks = tasks.filter(t => t.status.toLowerCase() === lower)
        }
        if (opts.name) {
          const query = opts.name.toLowerCase()
          tasks = tasks.filter(t => t.name.toLowerCase().includes(query))
        }
        await printTasks(tasks, opts.json ?? false, config)
      },
    ),
  )

program
  .command('comment <taskId>')
  .description('Post a comment on a task')
  .requiredOption('-m, --message <text>', 'Comment text')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { message: string; json?: boolean }) => {
      const config = loadConfig()
      const result = await postComment(config, taskId, opts.message)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(formatCommentConfirmation(result.id))
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
  .command('activity <taskId>')
  .description('Show task details and comments combined')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await fetchActivity(config, taskId)
      printActivity(result, opts.json ?? false)
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
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .option('--days <n>', 'Lookback period in days', '30')
  .action(
    wrapAction(async (opts: { includeClosed?: boolean; json?: boolean; days?: string }) => {
      const config = loadConfig()
      const days = Number(opts.days ?? 30)
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error('--days must be a positive number')
      }
      const tasks = await fetchInbox(config, days, { includeClosed: opts.includeClosed })
      await printInbox(tasks, opts.json ?? false, config)
    }),
  )

program
  .command('assigned')
  .description('Show all tasks assigned to me, grouped by status')
  .option('--status <status>', 'Show only tasks with this status')
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { status?: string; includeClosed?: boolean; json?: boolean }) => {
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
  .command('search <query>')
  .description('Search my tasks by name')
  .option('--status <status>', 'Filter by status')
  .option('--include-closed', 'Include done/closed tasks in search')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (query: string, opts: { status?: string; includeClosed?: boolean; json?: boolean }) => {
        const config = loadConfig()
        const tasks = await searchTasks(config, query, {
          status: opts.status,
          includeClosed: opts.includeClosed,
        })
        await printTasks(tasks, opts.json ?? false, config)
      },
    ),
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
        throw new Error('--hours must be a positive number')
      }
      await runSummaryCommand(config, { hours, json: opts.json ?? false })
    }),
  )

program
  .command('overdue')
  .description('List tasks that are past their due date')
  .option('--include-closed', 'Include done/closed overdue tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { includeClosed?: boolean; json?: boolean }) => {
      const config = loadConfig()
      const tasks = await fetchOverdueTasks(config, { includeClosed: opts.includeClosed })
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
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(formatAssignConfirmation(taskId, { to: opts.to, remove: opts.remove }))
      }
    }),
  )

program
  .command('depend <taskId>')
  .description('Add or remove task dependencies')
  .option('--on <taskId>', 'Task that this task depends on (waiting on)')
  .option('--blocks <taskId>', 'Task that this task blocks')
  .option('--remove', 'Remove the dependency instead of adding it')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: DependOptions & { json?: boolean }) => {
      const config = loadConfig()
      const message = await manageDependency(config, taskId, opts)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(
          JSON.stringify(
            { taskId, on: opts.on, blocks: opts.blocks, remove: opts.remove, message },
            null,
            2,
          ),
        )
      } else {
        console.log(message)
      }
    }),
  )

program
  .command('move <taskId>')
  .description('Add or remove a task from a list')
  .option('--to <listId>', 'Add task to this list')
  .option('--remove <listId>', 'Remove task from this list')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: MoveOptions & { json?: boolean }) => {
      const config = loadConfig()
      const message = await moveTask(config, taskId, opts)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ taskId, to: opts.to, remove: opts.remove, message }, null, 2))
      } else {
        console.log(message)
      }
    }),
  )

program
  .command('field <taskId>')
  .description('Set or remove a custom field value on a task')
  .option('--set <nameAndValue...>', 'Set field: --set "Field Name" value')
  .option('--remove <fieldName>', 'Remove field value by name')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (taskId: string, opts: { set?: string[]; remove?: string; json?: boolean }) => {
        const config = loadConfig()
        const fieldOpts: { set?: [string, string]; remove?: string } = {}
        if (opts.set) {
          if (opts.set.length !== 2) {
            throw new Error('--set requires exactly two arguments: field name and value')
          }
          fieldOpts.set = [opts.set[0]!, opts.set[1]!]
        }
        if (opts.remove) {
          fieldOpts.remove = opts.remove
        }
        const { results } = await setCustomField(config, taskId, fieldOpts)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(results, null, 2))
        } else {
          for (const r of results) {
            if (r.action === 'set') {
              console.log(`Set "${r.field}" to ${JSON.stringify(r.value)} on ${r.taskId}`)
            } else {
              console.log(`Removed "${r.field}" from ${r.taskId}`)
            }
          }
        }
      },
    ),
  )

program
  .command('delete <taskId>')
  .description('Delete a task (requires confirmation)')
  .option('--confirm', 'Skip confirmation prompt (required in non-interactive mode)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { confirm?: boolean; json?: boolean }) => {
      const config = loadConfig()
      const result = await deleteTaskCommand(config, taskId, opts)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Deleted task ${result.taskId}`)
      }
    }),
  )

program
  .command('tag <taskId>')
  .description('Add or remove tags from a task')
  .option('--add <tags>', 'Comma-separated tag names to add')
  .option('--remove <tags>', 'Comma-separated tag names to remove')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { add?: string; remove?: string; json?: boolean }) => {
      const config = loadConfig()
      const result = await manageTags(config, taskId, opts)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        const parts: string[] = []
        if (result.added.length > 0) parts.push(`Added tags: ${result.added.join(', ')}`)
        if (result.removed.length > 0) parts.push(`Removed tags: ${result.removed.join(', ')}`)
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
