import { Command } from 'commander'
import { loadConfig } from './config.js'
import { fetchMyTasks } from './commands/tasks.js'
import { updateDescription } from './commands/update.js'
import { createTask } from './commands/create.js'
import type { CreateOptions } from './commands/create.js'

const program = new Command()

program
  .name('cu')
  .description('ClickUp CLI for AI agents')
  .version('0.1.0')

program
  .command('tasks')
  .description('List tasks assigned to me')
  .action(async () => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config)
      console.log(JSON.stringify(tasks, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('initiatives')
  .description('List initiatives assigned to me')
  .action(async () => {
    try {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, 'Initiative')
      console.log(JSON.stringify(tasks, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('update <taskId>')
  .description('Update task description')
  .requiredOption('-d, --description <text>', 'New description (markdown supported)')
  .action(async (taskId: string, opts: { description: string }) => {
    try {
      const config = loadConfig()
      const result = await updateDescription(config, taskId, opts.description)
      console.log(JSON.stringify(result, null, 2))
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  })

program
  .command('create')
  .description('Create a new task')
  .requiredOption('-l, --list <listId>', 'Target list ID')
  .requiredOption('-n, --name <name>', 'Task name')
  .option('-d, --description <text>', 'Task description')
  .option('-p, --parent <taskId>', 'Parent initiative task ID')
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

program.parse()
