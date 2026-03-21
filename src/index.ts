import { basename } from 'path'
import { Command } from 'commander'
import { createRequire } from 'module'
import { ClickUpClient } from './api.js'
import { loadConfig } from './config.js'
import { fetchMyTasks, printTasks } from './commands/tasks.js'
import { updateTask, buildUpdatePayload, resolveAssigneeId } from './commands/update.js'
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
import {
  viewChecklists,
  createChecklist,
  deleteChecklist,
  addChecklistItem,
  editChecklistItem,
  deleteChecklistItem,
  formatChecklists,
  formatChecklistsMarkdown,
} from './commands/checklist.js'
import { editComment } from './commands/comment-edit.js'
import { deleteComment } from './commands/comment-delete.js'
import {
  getReplies,
  createReply,
  formatReplies,
  formatRepliesMarkdown,
} from './commands/replies.js'
import { manageTaskLink } from './commands/link.js'
import { attachFile } from './commands/attach.js'
import { listDocs, formatDocs, formatDocsMarkdown } from './commands/docs.js'
import {
  getDocInfo,
  formatDocInfo,
  formatDocInfoMarkdown,
  getDocPage,
  getAllDocPages,
  formatDocPages,
  formatDocPagesMarkdown,
  createDoc,
  createDocPage,
  editDocPage,
} from './commands/doc.js'
import { listFolders, formatFolders, formatFoldersMarkdown } from './commands/folders.js'
import {
  startTimer,
  stopTimer,
  timerStatus,
  logTime,
  listTimeEntries,
  updateTimeEntry,
  deleteTimeEntry,
  formatTimeEntries,
  formatTimeEntry,
  formatTimeEntryMarkdown,
  formatTimeEntriesMarkdown,
} from './commands/time.js'
import {
  listSpaceTags,
  formatTags,
  formatTagsMarkdown,
  createSpaceTag,
  deleteSpaceTag,
} from './commands/tags.js'
import { listMembers, formatMembers, formatMembersMarkdown } from './commands/members.js'
import { listFields, formatFields, formatFieldsMarkdown } from './commands/fields.js'
import { duplicateTask } from './commands/duplicate.js'
import { bulkUpdateStatus } from './commands/bulk.js'
import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  listKeyResults,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
  formatGoals,
  formatGoalsMarkdown,
  formatKeyResults,
  formatKeyResultsMarkdown,
} from './commands/goals.js'
import { deleteDoc, deleteDocPage } from './commands/doc.js'
import { updateSpaceTag } from './commands/tags.js'
import { listTaskTypes, formatTaskTypes, formatTaskTypesMarkdown } from './commands/task-types.js'
import { listTemplates, formatTemplates, formatTemplatesMarkdown } from './commands/templates.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

const programName = basename(process.argv[1] ?? 'cup')

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
  type?: string
  includeClosed?: boolean
  json?: boolean
}

const program = new Command()

program
  .name(programName)
  .description('ClickUp CLI for AI agents')
  .version(version)
  .allowExcessArguments(false)

program
  .command('init')
  .description(`Set up ${programName} for the first time`)
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
  .option(
    '--type <type>',
    'Filter by task type (e.g. "task", "initiative", or custom type name/ID)',
  )
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: TaskFilterOpts) => {
      const config = loadConfig()
      const tasks = await fetchMyTasks(config, {
        typeFilter: opts.type,
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
  .option('--assignee <userId>', 'Add assignee by user ID or "me"')
  .option('--parent <taskId>', 'Set parent task (makes this a subtask)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: UpdateCommandOptions & { json?: boolean }) => {
      const config = loadConfig()
      if (opts.assignee === 'me') {
        const client = new ClickUpClient(config)
        opts.assignee = String(await resolveAssigneeId(client, 'me'))
      }
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
  .option('--assignee <userId>', 'Assignee user ID or "me"')
  .option('--tags <tags>', 'Comma-separated tag names')
  .option('--custom-item-id <id>', 'Custom task type ID (use to create initiatives)')
  .option('--time-estimate <duration>', 'Time estimate (e.g. "2h", "30m", "1h30m")')
  .option('--template <id>', 'Create from a task template')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: CreateOptions & { json?: boolean }) => {
      const config = loadConfig()
      if (opts.assignee === 'me') {
        const client = new ClickUpClient(config)
        opts.assignee = String(await resolveAssigneeId(client, 'me'))
      }
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
  .option('--folder <folderId>', 'Sprint folder ID (overrides config and auto-detection)')
  .option('--include-closed', 'Include done/closed tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (opts: {
        status?: string
        space?: string
        folder?: string
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
  .option('--notify-all', 'Notify all assignees')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (taskId: string, opts: { message: string; notifyAll?: boolean; json?: boolean }) => {
        const config = loadConfig()
        const result = await postComment(config, taskId, opts.message, opts.notifyAll)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(formatCommentConfirmation(result.id))
        }
      },
    ),
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
  .command('comment-edit <commentId>')
  .description('Edit an existing comment')
  .requiredOption('-m, --message <text>', 'New comment text')
  .option('--resolved', 'Mark comment as resolved')
  .option('--unresolved', 'Mark comment as unresolved')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        commentId: string,
        opts: { message: string; resolved?: boolean; unresolved?: boolean; json?: boolean },
      ) => {
        const config = loadConfig()
        let resolved: boolean | undefined
        if (opts.resolved) resolved = true
        if (opts.unresolved) resolved = false
        await editComment(config, commentId, opts.message, resolved)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, commentId }, null, 2))
        } else {
          console.log(`Comment ${commentId} updated`)
        }
      },
    ),
  )

program
  .command('comment-delete <commentId>')
  .description('Delete a comment')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (commentId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteComment(config, commentId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, commentId }, null, 2))
      } else {
        console.log(`Deleted comment ${commentId}`)
      }
    }),
  )

program
  .command('replies <commentId>')
  .description('List threaded replies on a comment')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (commentId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const replies = await getReplies(config, commentId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(replies, null, 2))
      } else if (isTTY()) {
        console.log(formatReplies(replies))
      } else {
        console.log(formatRepliesMarkdown(replies))
      }
    }),
  )

program
  .command('reply <commentId>')
  .description('Reply to a comment')
  .requiredOption('-m, --message <text>', 'Reply text')
  .option('--notify-all', 'Notify all assignees')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (commentId: string, opts: { message: string; notifyAll?: boolean; json?: boolean }) => {
        const config = loadConfig()
        await createReply(config, commentId, opts.message, opts.notifyAll)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, commentId }, null, 2))
        } else {
          console.log(`Replied to comment ${commentId}`)
        }
      },
    ),
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
  .command('link <taskId> <linksTo>')
  .description('Add or remove a link between two tasks')
  .option('--remove', 'Remove the link instead of adding it')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (taskId: string, linksTo: string, opts: { remove?: boolean; json?: boolean }) => {
        const config = loadConfig()
        const result = await manageTaskLink(config, taskId, linksTo, opts.remove ?? false)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(
            JSON.stringify(
              { success: true, taskId, linksTo, action: opts.remove ? 'removed' : 'added' },
              null,
              2,
            ),
          )
        } else {
          console.log(result)
        }
      },
    ),
  )

program
  .command('attach <taskId> <filePath>')
  .description('Upload a file attachment to a task')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, filePath: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await attachFile(config, taskId, filePath)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Uploaded "${result.title}" to task ${taskId}`)
        console.log(`  ${result.url}`)
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

const checklistCmd = program.command('checklist').description('Manage checklists on a task')

checklistCmd
  .command('view <taskId>')
  .description('View checklists on a task')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const checklists = await viewChecklists(config, taskId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(checklists, null, 2))
      } else if (isTTY()) {
        console.log(formatChecklists(checklists))
      } else {
        console.log(formatChecklistsMarkdown(checklists))
      }
    }),
  )

checklistCmd
  .command('create <taskId> <name>')
  .description('Create a checklist on a task')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, name: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await createChecklist(config, taskId, name)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Created checklist "${result.name}" (id: ${result.id})`)
      }
    }),
  )

checklistCmd
  .command('delete <checklistId>')
  .description('Delete a checklist')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (checklistId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await deleteChecklist(config, checklistId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Deleted checklist ${result.checklistId}`)
      }
    }),
  )

checklistCmd
  .command('add-item <checklistId> <name>')
  .description('Add an item to a checklist')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (checklistId: string, name: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await addChecklistItem(config, checklistId, name)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Added item "${name}" to checklist ${checklistId}`)
      }
    }),
  )

checklistCmd
  .command('edit-item <checklistId> <checklistItemId>')
  .description('Edit a checklist item')
  .option('--name <name>', 'New item name')
  .option('--resolved', 'Mark item as resolved')
  .option('--unresolved', 'Mark item as unresolved')
  .option('--assignee <userId>', 'Assign user by ID (use "null" to unassign)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        checklistId: string,
        checklistItemId: string,
        opts: {
          name?: string
          resolved?: boolean
          unresolved?: boolean
          assignee?: string
          json?: boolean
        },
      ) => {
        const config = loadConfig()
        const updates: { name?: string; resolved?: boolean; assignee?: number | null } = {}
        if (opts.name) updates.name = opts.name
        if (opts.resolved) updates.resolved = true
        if (opts.unresolved) updates.resolved = false
        if (opts.assignee !== undefined) {
          updates.assignee = opts.assignee === 'null' ? null : Number(opts.assignee)
        }
        const result = await editChecklistItem(config, checklistId, checklistItemId, updates)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Updated checklist item ${checklistItemId}`)
        }
      },
    ),
  )

checklistCmd
  .command('delete-item <checklistId> <checklistItemId>')
  .description('Delete a checklist item')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (checklistId: string, checklistItemId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await deleteChecklistItem(config, checklistId, checklistItemId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Deleted checklist item ${result.checklistItemId}`)
      }
    }),
  )

const timeCmd = program.command('time').description('Track time on tasks')

timeCmd
  .command('start <taskId>')
  .description('Start tracking time on a task')
  .option('-d, --description <text>', 'Description for the time entry')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { description?: string; json?: boolean }) => {
      const config = loadConfig()
      const result = await startTimer(config, taskId, opts.description)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        const taskName = result.task?.name ?? taskId
        console.log(`Started timer on "${taskName}"`)
      }
    }),
  )

timeCmd
  .command('stop')
  .description('Stop the running timer')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await stopTimer(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else if (isTTY()) {
        console.log(formatTimeEntry(result))
      } else {
        console.log(formatTimeEntryMarkdown(result))
      }
    }),
  )

timeCmd
  .command('status')
  .description('Show the currently running timer')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await timerStatus(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else if (!result) {
        console.log('No timer running')
      } else if (isTTY()) {
        console.log(formatTimeEntry(result))
      } else {
        console.log(formatTimeEntryMarkdown(result))
      }
    }),
  )

timeCmd
  .command('log <taskId> <duration>')
  .description('Log a manual time entry (e.g. "2h", "30m", "1h30m")')
  .option('-d, --description <text>', 'Description for the time entry')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (taskId: string, duration: string, opts: { description?: string; json?: boolean }) => {
        const config = loadConfig()
        const result = await logTime(config, taskId, duration, opts.description)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Logged ${duration} on task ${taskId}`)
        }
      },
    ),
  )

timeCmd
  .command('list')
  .description('List recent time entries (default: last 7 days)')
  .option('--days <n>', 'Number of days to look back', '7')
  .option('--task <taskId>', 'Filter by task ID')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { days?: string; task?: string; json?: boolean }) => {
      const config = loadConfig()
      const days = opts.days ? Number(opts.days) : 7
      if (!Number.isFinite(days) || days <= 0) {
        throw new Error('--days must be a positive number')
      }
      const entries = await listTimeEntries(config, { days, taskId: opts.task })
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(entries, null, 2))
      } else if (isTTY()) {
        console.log(formatTimeEntries(entries))
      } else {
        console.log(formatTimeEntriesMarkdown(entries))
      }
    }),
  )

timeCmd
  .command('update <timeEntryId>')
  .description('Update a time entry')
  .option('-d, --description <text>', 'New description')
  .option('--duration <duration>', 'New duration (e.g. "2h", "30m")')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        timeEntryId: string,
        opts: { description?: string; duration?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        const entry = await updateTimeEntry(config, timeEntryId, {
          description: opts.description,
          duration: opts.duration,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(entry, null, 2))
        } else if (isTTY()) {
          console.log(formatTimeEntry(entry))
        } else {
          console.log(formatTimeEntryMarkdown(entry))
        }
      },
    ),
  )

timeCmd
  .command('delete <timeEntryId>')
  .description('Delete a time entry')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (timeEntryId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteTimeEntry(config, timeEntryId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ deleted: timeEntryId }))
      } else {
        console.log(`Deleted time entry ${timeEntryId}`)
      }
    }),
  )

program
  .command('tags <spaceId>')
  .description('List tags in a space')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (spaceId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const tags = await listSpaceTags(config, spaceId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(tags, null, 2))
      } else if (isTTY()) {
        console.log(formatTags(tags))
      } else {
        console.log(formatTagsMarkdown(tags))
      }
    }),
  )

program
  .command('tag-create <spaceId> <name>')
  .description('Create a tag in a space')
  .option('--fg <color>', 'Foreground color (hex)')
  .option('--bg <color>', 'Background color (hex)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (spaceId: string, name: string, opts: { fg?: string; bg?: string; json?: boolean }) => {
        const config = loadConfig()
        await createSpaceTag(config, spaceId, name, opts.fg, opts.bg)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, spaceId, tag: name }, null, 2))
        } else {
          console.log(`Created tag "${name}" in space ${spaceId}`)
        }
      },
    ),
  )

program
  .command('tag-delete <spaceId> <name>')
  .description('Delete a tag from a space')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (spaceId: string, name: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteSpaceTag(config, spaceId, name)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, spaceId, tag: name }, null, 2))
      } else {
        console.log(`Deleted tag "${name}" from space ${spaceId}`)
      }
    }),
  )

program
  .command('members')
  .description('List workspace members')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const members = await listMembers(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(members, null, 2))
      } else if (isTTY()) {
        console.log(formatMembers(members))
      } else {
        console.log(formatMembersMarkdown(members))
      }
    }),
  )

program
  .command('fields <listId>')
  .description('List custom fields for a list')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (listId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const fields = await listFields(config, listId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(fields, null, 2))
      } else if (isTTY()) {
        console.log(formatFields(fields))
      } else {
        console.log(formatFieldsMarkdown(fields))
      }
    }),
  )

program
  .command('duplicate <taskId>')
  .description('Duplicate a task')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (taskId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await duplicateTask(config, taskId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Duplicated as "${result.name}" (${result.id})`)
      }
    }),
  )

const bulkCmd = program.command('bulk').description('Bulk task operations')

bulkCmd
  .command('status <status> <taskIds...>')
  .description('Update status of multiple tasks')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (status: string, taskIds: string[], opts: { json?: boolean }) => {
      const config = loadConfig()
      const result = await bulkUpdateStatus(config, taskIds, status)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Updated ${result.updated} tasks to "${status}"`)
        if (result.failed.length > 0) {
          for (const f of result.failed) {
            console.log(`  Failed ${f.id}: ${f.reason}`)
          }
        }
      }
    }),
  )

program
  .command('goals')
  .description('List goals in your workspace')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const goals = await listGoals(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(goals, null, 2))
      } else if (isTTY()) {
        console.log(formatGoals(goals))
      } else {
        console.log(formatGoalsMarkdown(goals))
      }
    }),
  )

program
  .command('goal-create <name>')
  .description('Create a goal')
  .option('-d, --description <text>', 'Goal description')
  .option('--color <hex>', 'Goal color (hex)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (name: string, opts: { description?: string; color?: string; json?: boolean }) => {
        const config = loadConfig()
        const goal = await createGoal(config, name, {
          description: opts.description,
          color: opts.color,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(goal, null, 2))
        } else {
          console.log(`Created goal "${goal.name}" (${goal.id})`)
        }
      },
    ),
  )

program
  .command('goal-update <goalId>')
  .description('Update a goal')
  .option('-n, --name <text>', 'New goal name')
  .option('-d, --description <text>', 'New description')
  .option('--color <hex>', 'New color (hex)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        goalId: string,
        opts: { name?: string; description?: string; color?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        const goal = await updateGoal(config, goalId, {
          name: opts.name,
          description: opts.description,
          color: opts.color,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(goal, null, 2))
        } else {
          console.log(`Updated goal "${goal.name}" (${goal.id})`)
        }
      },
    ),
  )

program
  .command('goal-delete <goalId>')
  .description('Delete a goal')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (goalId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteGoal(config, goalId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, goalId }, null, 2))
      } else {
        console.log(`Deleted goal ${goalId}`)
      }
    }),
  )

program
  .command('key-results <goalId>')
  .description('List key results for a goal')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (goalId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const krs = await listKeyResults(config, goalId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(krs, null, 2))
      } else if (isTTY()) {
        console.log(formatKeyResults(krs))
      } else {
        console.log(formatKeyResultsMarkdown(krs))
      }
    }),
  )

program
  .command('key-result-create <goalId> <name>')
  .description('Create a key result on a goal')
  .option('--type <type>', 'Key result type (number or percentage)', 'number')
  .option('--target <n>', 'Target value', '100')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        goalId: string,
        name: string,
        opts: { type?: string; target?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        const target = Number(opts.target ?? 100)
        if (!Number.isFinite(target) || target <= 0) {
          throw new Error('--target must be a positive number')
        }
        const kr = await createKeyResult(config, goalId, name, opts.type ?? 'number', target)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(kr, null, 2))
        } else {
          console.log(`Created key result "${kr.name}" (${kr.id})`)
        }
      },
    ),
  )

program
  .command('key-result-update <keyResultId>')
  .description('Update a key result')
  .option('--progress <n>', 'Current progress value')
  .option('--note <text>', 'Progress note')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (keyResultId: string, opts: { progress?: string; note?: string; json?: boolean }) => {
        const config = loadConfig()
        const updates: { progress?: number; note?: string } = {}
        if (opts.progress !== undefined) {
          const p = Number(opts.progress)
          if (!Number.isFinite(p)) throw new Error('--progress must be a number')
          updates.progress = p
        }
        if (opts.note !== undefined) updates.note = opts.note
        const kr = await updateKeyResult(config, keyResultId, updates)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(kr, null, 2))
        } else {
          console.log(`Updated key result "${kr.name}" (${kr.id})`)
        }
      },
    ),
  )

program
  .command('key-result-delete <keyResultId>')
  .description('Delete a key result')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (keyResultId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteKeyResult(config, keyResultId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, keyResultId }, null, 2))
      } else {
        console.log(`Deleted key result ${keyResultId}`)
      }
    }),
  )

program
  .command('docs [query]')
  .description('List workspace docs (optionally filter by name)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (query: string | undefined, opts: { json?: boolean }) => {
      const config = loadConfig()
      const docs = await listDocs(config, query)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(docs, null, 2))
      } else if (isTTY()) {
        console.log(formatDocs(docs))
      } else {
        console.log(formatDocsMarkdown(docs))
      }
    }),
  )

program
  .command('doc <docId> [pageId]')
  .description('View a doc (metadata + page tree) or a specific page')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (docId: string, pageId: string | undefined, opts: { json?: boolean }) => {
      const config = loadConfig()
      if (pageId) {
        const page = await getDocPage(config, docId, pageId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(page, null, 2))
        } else {
          if (page.name) console.log(`# ${page.name}\n`)
          console.log(page.content ?? '')
        }
      } else {
        const { doc, pages } = await getDocInfo(config, docId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ ...doc, pages }, null, 2))
        } else if (isTTY()) {
          console.log(formatDocInfo(doc, pages))
        } else {
          console.log(formatDocInfoMarkdown(doc, pages))
        }
      }
    }),
  )

program
  .command('doc-pages <docId>')
  .description('List all pages in a doc with content')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (docId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      const pages = await getAllDocPages(config, docId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(pages, null, 2))
      } else if (isTTY()) {
        console.log(formatDocPages(pages))
      } else {
        console.log(formatDocPagesMarkdown(pages))
      }
    }),
  )

program
  .command('folders <spaceId>')
  .description('List folders in a space (with their lists)')
  .option('--name <partial>', 'Filter folders by partial name match')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (spaceId: string, opts: { name?: string; json?: boolean }) => {
      const config = loadConfig()
      const folders = await listFolders(config, spaceId, opts.name)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(folders, null, 2))
      } else if (isTTY()) {
        console.log(formatFolders(folders))
      } else {
        console.log(formatFoldersMarkdown(folders))
      }
    }),
  )

program
  .command('doc-create <title>')
  .description('Create a new doc')
  .option('-c, --content <text>', 'Initial content (markdown)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (title: string, opts: { content?: string; json?: boolean }) => {
      const config = loadConfig()
      const result = await createDoc(config, title, opts.content)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(result, null, 2))
      } else {
        console.log(`Created doc "${result.title}" (${result.id})`)
      }
    }),
  )

program
  .command('doc-page-create <docId> <name>')
  .description('Create a page in a doc')
  .option('-c, --content <text>', 'Page content (markdown)')
  .option('--parent-page <pageId>', 'Parent page ID for nesting')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        docId: string,
        name: string,
        opts: { content?: string; parentPage?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        const page = await createDocPage(config, docId, name, opts.content, opts.parentPage)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(page, null, 2))
        } else {
          console.log(`Created page "${page.name}" (${page.id}) in doc ${docId}`)
        }
      },
    ),
  )

program
  .command('doc-page-edit <docId> <pageId>')
  .description('Edit a doc page')
  .option('--name <text>', 'New page name')
  .option('-c, --content <text>', 'New page content (markdown)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        docId: string,
        pageId: string,
        opts: { name?: string; content?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        const page = await editDocPage(config, docId, pageId, {
          name: opts.name,
          content: opts.content,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(page, null, 2))
        } else {
          console.log(`Updated page "${page.name}" (${page.id})`)
        }
      },
    ),
  )

program
  .command('doc-delete <docId>')
  .description('Delete a doc')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (docId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteDoc(config, docId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, docId }, null, 2))
      } else {
        console.log(`Deleted doc ${docId}`)
      }
    }),
  )

program
  .command('doc-page-delete <docId> <pageId>')
  .description('Delete a doc page')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (docId: string, pageId: string, opts: { json?: boolean }) => {
      const config = loadConfig()
      await deleteDocPage(config, docId, pageId)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify({ success: true, docId, pageId }, null, 2))
      } else {
        console.log(`Deleted page ${pageId} from doc ${docId}`)
      }
    }),
  )

program
  .command('tag-update <spaceId> <tagName>')
  .description('Update a tag in a space')
  .requiredOption('--name <newName>', 'New tag name')
  .option('--fg <color>', 'New foreground color (hex)')
  .option('--bg <color>', 'New background color (hex)')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(
      async (
        spaceId: string,
        tagName: string,
        opts: { name: string; fg?: string; bg?: string; json?: boolean },
      ) => {
        const config = loadConfig()
        await updateSpaceTag(config, spaceId, tagName, {
          name: opts.name,
          fg: opts.fg,
          bg: opts.bg,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(
            JSON.stringify(
              { success: true, spaceId, oldName: tagName, newName: opts.name },
              null,
              2,
            ),
          )
        } else {
          console.log(`Renamed tag "${tagName}" to "${opts.name}" in space ${spaceId}`)
        }
      },
    ),
  )

program
  .command('task-types')
  .description('List custom task types in your workspace')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const types = await listTaskTypes(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(types, null, 2))
      } else if (isTTY()) {
        console.log(formatTaskTypes(types))
      } else {
        console.log(formatTaskTypesMarkdown(types))
      }
    }),
  )

program
  .command('templates')
  .description('List task templates in your workspace')
  .option('--json', 'Force JSON output even in terminal')
  .action(
    wrapAction(async (opts: { json?: boolean }) => {
      const config = loadConfig()
      const templates = await listTemplates(config)
      if (shouldOutputJson(opts.json ?? false)) {
        console.log(JSON.stringify(templates, null, 2))
      } else if (isTTY()) {
        console.log(formatTemplates(templates))
      } else {
        console.log(formatTemplatesMarkdown(templates))
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
      const script = generateCompletion(shell, programName)
      process.stdout.write(script)
    }),
  )

process.on('SIGINT', () => {
  process.stderr.write('\nInterrupted\n')
  process.exit(130)
})

program.parse()
