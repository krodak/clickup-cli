import { Command } from 'commander'
import { createRequire } from 'module'
import { loadConfig } from './config.js'
import { fetchMyTasks, printTasks } from './commands/tasks.js'
import { updateTask } from './commands/update.js'
import { createTask } from './commands/create.js'
import type { CreateOptions } from './commands/create.js'
import { getTask } from './commands/get.js'
import { runInitCommand } from './commands/init.js'
import { runSprintCommand } from './commands/sprint.js'
import { fetchSubtasks } from './commands/subtasks.js'
import { postComment } from './commands/comment.js'
import { ClickUpClient } from './api.js'
import { isTTY } from './output.js'
import { fetchInbox } from './commands/inbox.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const program = new Command()

program
  .name('cu')
  .description('ClickUp CLI for AI agents')
  .version(version)

program
  .command('init')
  .description('Set up cu for the first time')
  .action(async () => {
    try {
      await runInitCommand()
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('tasks')
  .description('List tasks assigned to me')
  .option('--status <status>', 'Filter by status (e.g. "in progress")')
  .option('--list <listId>', 'Filter by list ID')
  .option('--space <spaceId>', 'Filter by space ID')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (opts: { status?: string; list?: string; space?: string; json?: boolean }) => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, {
        typeFilter: 'task',
        statuses: opts.status ? [opts.status] : undefined,
        listIds: opts.list ? [opts.list] : undefined,
        spaceIds: opts.space ? [opts.space] : undefined,
      })
      printTasks(tasks, opts.json ?? false)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('initiatives')
  .description('List initiatives assigned to me')
  .option('--status <status>', 'Filter by status')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (opts: { status?: string; json?: boolean }) => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, {
        typeFilter: 'initiative',
        statuses: opts.status ? [opts.status] : undefined,
      })
      printTasks(tasks, opts.json ?? false)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('task <taskId>')
  .description('Get task details')
  .option('--raw', 'Show full JSON response')
  .action(async (taskId: string, opts: { raw?: boolean }) => {
    try {
      const config = loadConfig()
      const result = await getTask(config, taskId)
      if (opts.raw || !isTTY()) {
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
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('update <taskId>')
  .description('Update a task (name, description, or status)')
  .option('-n, --name <text>', 'New task name')
  .option('-d, --description <text>', 'New description (markdown supported)')
  .option('-s, --status <status>', 'New status (e.g. "in progress", "done")')
  .action(async (taskId: string, opts: { name?: string; description?: string; status?: string }) => {
    try {
      const config = loadConfig()
      const result = await updateTask(config, taskId, opts)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('create')
  .description('Create a new task')
  .option('-l, --list <listId>', 'Target list ID (auto-detected from --parent if omitted)')
  .requiredOption('-n, --name <name>', 'Task name')
  .option('-d, --description <text>', 'Task description')
  .option('-p, --parent <taskId>', 'Parent task ID (list auto-detected from parent)')
  .option('-s, --status <status>', 'Initial status')
  .action(async (opts: CreateOptions) => {
    try {
      const config = loadConfig()
      const result = await createTask(config, opts)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('sprint')
  .description('List my tasks in the current active sprint (auto-detected)')
  .option('--status <status>', 'Filter by status')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (opts: { status?: string; json?: boolean }) => {
    try {
      const config = loadConfig()
      await runSprintCommand(config, opts)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('subtasks <taskId>')
  .description('List subtasks of a task or initiative')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (taskId: string, opts: { json?: boolean }) => {
    try {
      const config = loadConfig()
      const tasks = await fetchSubtasks(config, taskId)
      printTasks(tasks, opts.json ?? false)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('comment <taskId>')
  .description('Post a comment on a task')
  .requiredOption('-m, --message <text>', 'Comment text')
  .action(async (taskId: string, opts: { message: string }) => {
    try {
      const config = loadConfig()
      const result = await postComment(config, taskId, opts.message)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('spaces')
  .description('List spaces in your workspace')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (opts: { json?: boolean }) => {
    try {
      const config = loadConfig()
      const client = new ClickUpClient(config)
      const spaces = await client.getSpaces(config.teamId)
      if (!opts.json && isTTY()) {
        spaces.forEach(s => console.log(`${s.id}  ${s.name}`))
      } else {
        console.log(JSON.stringify(spaces, null, 2))
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('inbox')
  .description('Recently updated tasks assigned to me (last 7 days)')
  .option('--json', 'Force JSON output even in terminal')
  .action(async (opts: { json?: boolean }) => {
    try {
      const config = loadConfig()
      const tasks = await fetchInbox(config)
      printTasks(tasks, opts.json ?? false)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

process.on('SIGINT', () => {
  process.stderr.write('\nInterrupted\n')
  process.exit(130)
})

program.parse()
