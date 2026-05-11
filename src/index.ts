import { realpathSync } from 'fs'
import { basename, resolve } from 'path'
import { Command } from 'commander'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { ClickUpClient } from './api.js'
import {
  loadConfig,
  addProfile,
  removeProfile,
  setDefaultProfile,
  listProfiles,
  getFilters,
  saveFilter,
  deleteFilter,
  getFavorites,
  saveFavorite,
  deleteFavorite,
} from './config.js'
import type { FilterEntry, FavoriteEntry } from './config.js'
import { fetchMyTasks, printTasks } from './commands/tasks.js'
import { updateTask, buildUpdatePayload, resolveAssigneeId } from './commands/update.js'
import type { UpdateCommandOptions } from './commands/update.js'
import { createTask } from './commands/create.js'
import type { CreateOptions } from './commands/create.js'
import { getTask } from './commands/get.js'
import { runInitCommand } from './commands/init.js'
import { runSprintCommand, resolveActiveSprintListId } from './commands/sprint.js'
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
import { fetchTimeInStatus, printTimeInStatus } from './commands/time-in-status.js'
import { generateCompletion } from './commands/completion.js'
import { printSkill, installSkillInteractive, installSkillTo } from './commands/skill.js'
import { checkAuth } from './commands/auth.js'
import { searchTasks, resolveSpaceNameToId } from './commands/search.js'
import { manageDependency } from './commands/depend.js'
import type { DependOptions } from './commands/depend.js'
import { moveTask } from './commands/move.js'
import type { MoveOptions } from './commands/move.js'
import { setCustomField, findFieldByName, parseFieldValue } from './commands/field.js'
import { deleteTaskCommand } from './commands/delete.js'
import { archiveTaskCommand } from './commands/archive.js'
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
import { deleteComment, deleteCommentByTaskSelection } from './commands/comment-delete.js'
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
import {
  bulkUpdateStatus,
  bulkAssign,
  bulkDueDate,
  bulkTag,
  bulkPriority,
  bulkField,
  bulkMove,
} from './commands/bulk.js'
import type { BulkResult } from './commands/bulk.js'
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
import {
  listListTemplates,
  formatListTemplates,
  formatListTemplatesMarkdown,
} from './commands/list-templates.js'
import {
  listFolderTemplates,
  formatFolderTemplates,
  formatFolderTemplatesMarkdown,
} from './commands/folder-templates.js'
import { createListFromTemplate } from './commands/list-from-template.js'
import { listViews, formatViews, formatViewsMarkdown } from './commands/views.js'
import {
  formatChannelsTable,
  formatChannelsMarkdown,
  formatChannelDetail,
  formatChatMembers,
  formatChatMembersMarkdown,
} from './commands/chat.js'
import { formatMessages, formatMessagesMarkdown } from './commands/chat-message.js'
import { formatReactions, formatReactionsMarkdown } from './commands/chat-reaction.js'
import { getView as getViewDetail, formatView, formatViewMarkdown } from './commands/view.js'
import { createView } from './commands/view-create.js'
import { updateView as updateViewCommand } from './commands/view-update.js'
import { deleteViewCommand } from './commands/view-delete.js'
import {
  runFilter,
  isAllowedFilterCommand,
  ALLOWED_FILTER_COMMANDS,
  formatFiltersTable,
  formatFiltersMarkdown,
  formatFilterDetail,
} from './commands/filter.js'
import { createListWithOptions } from './commands/list-create.js'
import { renameList } from './commands/list-rename.js'
import { renameFolder } from './commands/folder-rename.js'
import { renameSpace } from './commands/space-rename.js'
import {
  validateFavoriteType,
  slugify,
  formatFavoritesTable,
  formatFavoritesMarkdown,
} from './commands/favorite.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

function wrapAction<T extends unknown[]>(
  fn: (...args: T) => Promise<void>,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    await fn(...args).catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    })
  }
}

interface TaskFilterOpts {
  status?: string
  list?: string
  space?: string
  name?: string
  type?: string
  all?: boolean
  includeClosed?: boolean
  assignee?: string
  tag?: string
  dueBefore?: string
  dueAfter?: string
  createdAfter?: string
  createdBefore?: string
  field?: string[]
  json?: boolean
}

function parseOptionalNumberOption(value: string, optionName: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${optionName} must be a number or "null"`)
  }
  return parsed
}

export function buildProgram(programName = basename(process.argv[1] ?? 'cup')): Command {
  const program = new Command()

  program
    .name(programName)
    .description('ClickUp CLI for AI agents')
    .version(version)
    .allowExcessArguments(false)
    .option('-p, --profile <name>', 'Use a specific profile')

  function getProfileName(): string | undefined {
    return program.opts<{ profile?: string }>().profile
  }

  program
    .command('init')
    .description(
      `Set up ${programName} (interactive). Use --token and --team for non-interactive/agent setup`,
    )
    .option('--token <token>', 'API token (pk_...) for non-interactive setup')
    .option('--team <teamId>', 'Workspace/team ID for non-interactive setup')
    .action(
      wrapAction(async (opts: { token?: string; team?: string }) => {
        await runInitCommand(opts)
      }),
    )

  program
    .command('auth')
    .description('Validate API token and show current user')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
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
    .description('List tasks assigned to you by default. Use --all to search across all assignees.')
    .option('--status <status>', 'Filter by status (e.g. "in progress")')
    .option('--list <listId>', 'Filter by list ID')
    .option('--space <spaceId|name>', 'Filter by space ID or name (partial match)')
    .option('--name <partial>', 'Filter by name (case-insensitive contains)')
    .option(
      '--type <type>',
      'Filter by task type (e.g. "task", "initiative", or custom type name/ID)',
    )
    .option('--all', 'Include all tasks, not just mine')
    .option('--include-closed', 'Include done/closed tasks')
    .option('--assignee <userId>', 'Filter by assignee (user ID or "me")')
    .option('--tag <tag>', 'Filter by tag name')
    .option('--due-before <date>', 'Tasks due before date (YYYY-MM-DD)')
    .option('--due-after <date>', 'Tasks due after date (YYYY-MM-DD)')
    .option('--created-after <date>', 'Tasks created after date (YYYY-MM-DD)')
    .option('--created-before <date>', 'Tasks created before date (YYYY-MM-DD)')
    .option('--field <nameAndValue...>', 'Filter by custom field: --field "Name" value')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: TaskFilterOpts) => {
        const config = loadConfig(getProfileName())

        let assigneeIds: number[] | undefined
        if (opts.assignee) {
          if (opts.assignee === 'me') {
            const client = new ClickUpClient(config)
            const me = await client.getMe()
            assigneeIds = [me.id]
          } else {
            assigneeIds = [Number(opts.assignee)]
          }
        }

        let resolvedSpaceId: string | undefined
        if (opts.space) {
          resolvedSpaceId = await resolveSpaceNameToId(config, opts.space)
        }

        const parseDateFilter = (d: string): number => {
          const parts = d.split('-')
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
        }

        let customFields: Array<{ field_id: string; operator: string; value?: unknown }> | undefined
        if (opts.field?.length) {
          if (opts.field.length % 2 !== 0) {
            throw new Error('--field requires pairs: --field "Name" value')
          }
          if (!opts.list) {
            throw new Error('--field filtering requires --list to resolve field names')
          }
          const client = new ClickUpClient(config)
          const fields = await client.getListCustomFields(opts.list)
          customFields = []
          for (let i = 0; i < opts.field.length; i += 2) {
            const fieldName = opts.field[i]!
            const fieldValue = opts.field[i + 1]!
            const match = fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase())
            if (!match) {
              const available = fields.map(f => f.name).join(', ')
              throw new Error(`Field "${fieldName}" not found. Available: ${available}`)
            }
            customFields.push({
              field_id: match.id,
              operator: '=',
              value: fieldValue,
            })
          }
        }

        const tasks = await fetchMyTasks(config, {
          typeFilter: opts.type,
          statuses: opts.status ? [opts.status] : undefined,
          listIds: opts.list ? [opts.list] : undefined,
          spaceIds: resolvedSpaceId ? [resolvedSpaceId] : undefined,
          name: opts.name,
          all: opts.all,
          assignees: assigneeIds,
          tags: opts.tag ? [opts.tag] : undefined,
          dueDateLt: opts.dueBefore ? parseDateFilter(opts.dueBefore) : undefined,
          dueDateGt: opts.dueAfter ? parseDateFilter(opts.dueAfter) : undefined,
          dateCreatedGt: opts.createdAfter ? parseDateFilter(opts.createdAfter) : undefined,
          dateCreatedLt: opts.createdBefore ? parseDateFilter(opts.createdBefore) : undefined,
          customFields,
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
        const config = loadConfig(getProfileName())
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
    .option(
      '-s, --status <status>',
      'New status (fuzzy matched, e.g. "prog" matches "in progress")',
    )
    .option('--priority <level>', 'Priority: urgent, high, normal, low (or 1-4)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD, or "none"/"clear" to remove)')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option(
      '--time-estimate <duration>',
      'Time estimate (e.g. "2h", "30m", "1h30m", "0" or "none" to clear)',
    )
    .option('--assignee <userId>', 'Add assignee by user ID or "me"')
    .option('--remove-assignee <userId>', 'Remove assignee by user ID or "me"')
    .option('--parent <taskId>', 'Set parent task (makes this a subtask)')
    .option('--detach', 'Remove parent task (promote subtask to top-level)')
    .option('--archive', 'Archive the task')
    .option('--unarchive', 'Unarchive the task')
    .option('--type <type>', 'Change task type (name or custom_item_id)')
    .option('--field <nameAndValue...>', 'Set custom field: --field "Name" value')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          taskId: string,
          opts: UpdateCommandOptions & { field?: string[]; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const client = new ClickUpClient(config)
          const [timezone] = await Promise.all([
            client.getUserTimezone(),
            opts.assignee === 'me'
              ? resolveAssigneeId(client, 'me').then(id => {
                  opts.assignee = String(id)
                })
              : Promise.resolve(),
            opts.removeAssignee === 'me'
              ? resolveAssigneeId(client, 'me').then(id => {
                  opts.removeAssignee = String(id)
                })
              : Promise.resolve(),
          ])
          const payload = buildUpdatePayload(opts, timezone)
          const hasFields = (opts.field?.length ?? 0) > 0
          const hasTypeName = opts.type !== undefined
          if (!hasFields && !hasTypeName && Object.keys(payload).length === 0) {
            throw new Error(
              'Provide at least one of: --name, --description, --status, --priority, --due-date, --time-estimate, --assignee, --remove-assignee, --parent, --archive, --unarchive, --type, --field',
            )
          }
          let result: { id: string; name: string } | undefined
          if (Object.keys(payload).length > 0 || hasTypeName) {
            result = await updateTask(config, taskId, payload, opts.type)
          }
          if (hasFields) {
            if ((opts.field?.length ?? 0) % 2 !== 0) {
              throw new Error('--field requires pairs: --field "Name" value')
            }
            for (let i = 0; i < (opts.field?.length ?? 0); i += 2) {
              await setCustomField(config, taskId, { set: [opts.field![i]!, opts.field![i + 1]!] })
            }
            if (!result) {
              const client = new ClickUpClient(config)
              const task = await client.getTask(taskId)
              result = { id: task.id, name: task.name }
            }
          }
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(formatUpdateConfirmation(result!.id, result!.name))
          }
        },
      ),
    )

  program
    .command('create')
    .description('Create a new task')
    .option('-l, --list <listId>', 'Target list ID or "sprint:current" for active sprint')
    .requiredOption('-n, --name <name>', 'Task name')
    .option('-d, --description <text>', 'Task description (markdown supported)')
    .option('-p, --parent <taskId>', 'Parent task ID (list auto-detected from parent)')
    .option('-s, --status <status>', 'Initial status')
    .option('--priority <level>', 'Priority: urgent, high, normal, low (or 1-4)')
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .option('--assignee <userId>', 'Assignee user ID or "me"')
    .option('--tags <tags>', 'Comma-separated tag names')
    .option('--custom-item-id <id>', 'Custom task type ID (use to create initiatives)')
    .option('--time-estimate <duration>', 'Time estimate (e.g. "2h", "30m", "1h30m")')
    .option('--template <id>', 'Create from a task template (find IDs with cup templates)')
    .option('--field <nameAndValue...>', 'Set custom field: --field "Name" value (can repeat)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: CreateOptions & { field?: string[]; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        if (opts.list === 'sprint:current') {
          opts.list = await resolveActiveSprintListId(config)
        }
        if (opts.assignee === 'me') {
          const client = new ClickUpClient(config)
          opts.assignee = String(await resolveAssigneeId(client, 'me'))
        }
        if (opts.field?.length) {
          if (opts.field.length % 2 !== 0) {
            throw new Error('--field requires pairs: --field "Name" value')
          }
          let listId = opts.list
          if (!listId && opts.parent) {
            const client = new ClickUpClient(config)
            const parentTask = await client.getTask(opts.parent)
            listId = parentTask.list.id
            opts.list = listId
          }
          if (!listId) {
            throw new Error('--field requires --list or --parent to resolve custom field names')
          }
          const client = new ClickUpClient(config)
          const fields = await client.getListCustomFields(listId)
          const customFields: Array<{ id: string; value: unknown }> = []
          for (let i = 0; i < opts.field.length; i += 2) {
            const fieldName = opts.field[i]!
            const rawValue = opts.field[i + 1]!
            const field = findFieldByName(fields, fieldName)
            const value = parseFieldValue(field, rawValue)
            customFields.push({ id: field.id, value })
          }
          opts.customFields = customFields
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
        const comments = await fetchComments(config, taskId)
        printComments(comments, opts.json ?? false)
      }),
    )

  program
    .command('comment-edit <commentId>')
    .description('Edit an existing comment')
    .option('-m, --message <text>', 'New comment text')
    .option('--resolved', 'Mark comment as resolved')
    .option('--unresolved', 'Mark comment as unresolved')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          commentId: string,
          opts: { message?: string; resolved?: boolean; unresolved?: boolean; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
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
    .command('comment-delete [commentId]')
    .description(
      'Delete a comment by ID, or use --task with --mine to find and delete your comment',
    )
    .option('--task <taskId>', 'Task to search for your comment (requires --mine)')
    .option('--mine', 'Delete one of my comments from the specified task')
    .option('--match <text>', 'Only match comments containing this text (requires --mine)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          commentId: string | undefined,
          opts: { task?: string; mine?: boolean; match?: string; json?: boolean },
        ) => {
          if (opts.mine && !opts.task) {
            throw new Error('--mine requires --task <taskId>')
          }
          if (opts.match && !opts.mine) {
            throw new Error('--match requires --mine')
          }
          const config = loadConfig(getProfileName())
          let result: { commentId: string; taskId?: string }
          if (opts.task) {
            if (!opts.mine) {
              throw new Error('--task requires --mine')
            }
            result = await deleteCommentByTaskSelection(config, opts.task, {
              mine: opts.mine,
              match: opts.match,
            })
          } else if (commentId) {
            await deleteComment(config, commentId)
            result = { commentId }
          } else {
            throw new Error('Provide a comment ID or use --task <taskId> --mine')
          }

          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify({ success: true, ...result }, null, 2))
          } else {
            console.log(
              result.taskId
                ? `Deleted comment ${result.commentId} from task ${result.taskId}`
                : `Deleted comment ${result.commentId}`,
            )
          }
        },
      ),
    )

  program
    .command('replies <commentId>')
    .description('List threaded replies on a comment')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (commentId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
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
        async (
          commentId: string,
          opts: { message: string; notifyAll?: boolean; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
        const result = await fetchActivity(config, taskId)
        printActivity(result, opts.json ?? false)
      }),
    )

  program
    .command('time-in-status <taskId>')
    .description('Show how long a task has been in each status')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await fetchTimeInStatus(config, taskId)
        printTimeInStatus(result, opts.json ?? false)
      }),
    )

  program
    .command('lists <spaceId>')
    .description('List all lists in a space (including lists inside folders)')
    .option('--name <partial>', 'Filter by name (case-insensitive contains)')
    .option('--archived', 'Include only archived items (default: active items)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (spaceId: string, opts: { name?: string; archived?: boolean; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          const lists = await fetchLists(config, spaceId, {
            name: opts.name,
            archived: opts.archived,
          })
          printLists(lists, opts.json ?? false)
        },
      ),
    )

  program
    .command('spaces')
    .description('List spaces in your workspace')
    .option('--name <partial>', 'Filter spaces by name (case-insensitive contains)')
    .option('--my', 'Show only spaces where I have assigned tasks')
    .option('--archived', 'Include only archived items (default: active items)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (opts: { name?: string; my?: boolean; archived?: boolean; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          await listSpaces(config, opts)
        },
      ),
    )

  program
    .command('inbox')
    .description('Recently updated tasks grouped by time period')
    .option('--include-closed', 'Include done/closed tasks')
    .option('--json', 'Force JSON output even in terminal')
    .option('--days <n>', 'Lookback period in days', '30')
    .action(
      wrapAction(async (opts: { includeClosed?: boolean; json?: boolean; days?: string }) => {
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
        await runAssignedCommand(config, opts)
      }),
    )

  program
    .command('open <query>')
    .description('Open a task in the browser by ID or name')
    .option('--json', 'Output task JSON instead of opening')
    .action(
      wrapAction(async (query: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        await openTask(config, query, opts)
      }),
    )

  program
    .command('search <query>')
    .description(
      'Search tasks assigned to you by default. Use --all to search across all assignees.',
    )
    .option('--status <status>', 'Filter by status')
    .option('--list <listId>', 'Filter by list ID')
    .option('--space <spaceId|name>', 'Filter by space ID or name (partial match)')
    .option('--all', 'Search all tasks, not just mine')
    .option('--include-closed', 'Include done/closed tasks in search')
    .option('--assignee <userId>', 'Filter by assignee (user ID or "me")')
    .option('--tag <tag>', 'Filter by tag name')
    .option('--due-before <date>', 'Tasks due before date (YYYY-MM-DD)')
    .option('--due-after <date>', 'Tasks due after date (YYYY-MM-DD)')
    .option('--created-after <date>', 'Tasks created after date (YYYY-MM-DD)')
    .option('--created-before <date>', 'Tasks created before date (YYYY-MM-DD)')
    .option('--field <nameAndValue...>', 'Filter by custom field: --field "Name" value')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          query: string,
          opts: {
            status?: string
            list?: string
            space?: string
            all?: boolean
            includeClosed?: boolean
            assignee?: string
            tag?: string
            dueBefore?: string
            dueAfter?: string
            createdAfter?: string
            createdBefore?: string
            field?: string[]
            json?: boolean
          },
        ) => {
          const config = loadConfig(getProfileName())

          let assigneeIds: number[] | undefined
          if (opts.assignee) {
            if (opts.assignee === 'me') {
              const client = new ClickUpClient(config)
              const me = await client.getMe()
              assigneeIds = [me.id]
            } else {
              assigneeIds = [Number(opts.assignee)]
            }
          }

          let resolvedSpaceId: string | undefined
          if (opts.space) {
            resolvedSpaceId = await resolveSpaceNameToId(config, opts.space)
          }

          const parseDateFilter = (d: string): number => {
            const parts = d.split('-')
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
          }

          let customFields:
            | Array<{ field_id: string; operator: string; value?: unknown }>
            | undefined
          if (opts.field?.length) {
            if (opts.field.length % 2 !== 0) {
              throw new Error('--field requires pairs: --field "Name" value')
            }
            if (!opts.list) {
              throw new Error('--field filtering requires --list to resolve field names')
            }
            const client = new ClickUpClient(config)
            const fields = await client.getListCustomFields(opts.list)
            customFields = []
            for (let i = 0; i < opts.field.length; i += 2) {
              const fieldName = opts.field[i]!
              const fieldValue = opts.field[i + 1]!
              const match = fields.find(f => f.name.toLowerCase() === fieldName.toLowerCase())
              if (!match) {
                const available = fields.map(f => f.name).join(', ')
                throw new Error(`Field "${fieldName}" not found. Available: ${available}`)
              }
              customFields.push({
                field_id: match.id,
                operator: '=',
                value: fieldValue,
              })
            }
          }

          const tasks = await searchTasks(config, query, {
            status: opts.status,
            all: opts.all,
            includeClosed: opts.includeClosed,
            listIds: opts.list ? [opts.list] : undefined,
            spaceIds: resolvedSpaceId ? [resolvedSpaceId] : undefined,
            assignees: assigneeIds,
            tags: opts.tag ? [opts.tag] : undefined,
            dueDateLt: opts.dueBefore ? parseDateFilter(opts.dueBefore) : undefined,
            dueDateGt: opts.dueAfter ? parseDateFilter(opts.dueAfter) : undefined,
            dateCreatedGt: opts.createdAfter ? parseDateFilter(opts.createdAfter) : undefined,
            dateCreatedLt: opts.createdBefore ? parseDateFilter(opts.createdBefore) : undefined,
            customFields,
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
        const config = loadConfig(getProfileName())
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
    .option('--all', 'Include all tasks, not just mine')
    .option('--include-closed', 'Include done/closed overdue tasks')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { all?: boolean; includeClosed?: boolean; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const tasks = await fetchOverdueTasks(config, {
          all: opts.all,
          includeClosed: opts.includeClosed,
        })
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
    .option('--to <listId>', 'Add task to this list (or "sprint:current" for active sprint)')
    .option('--remove <listId>', 'Remove task from this list')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskId: string, opts: MoveOptions & { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        if (opts.to === 'sprint:current') {
          opts.to = await resolveActiveSprintListId(config)
        }
        const message = await moveTask(config, taskId, opts)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(
            JSON.stringify({ taskId, to: opts.to, remove: opts.remove, message }, null, 2),
          )
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
        const result = await deleteTaskCommand(config, taskId, opts)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Deleted task ${result.taskId}`)
        }
      }),
    )

  program
    .command('archive <taskId>')
    .description('Archive a task (or unarchive with --unarchive)')
    .option('--unarchive', 'Unarchive instead of archiving')
    .option('--confirm', 'Skip confirmation prompt (required in non-interactive mode)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          taskId: string,
          opts: { unarchive?: boolean; confirm?: boolean; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const result = await archiveTaskCommand(config, taskId, opts)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`${result.archived ? 'Archived' : 'Unarchived'} task ${result.taskId}`)
          }
        },
      ),
    )

  program
    .command('tag <taskId>')
    .description('Add or remove tags from a task')
    .option('--add <tags>', 'Comma-separated tag names to add')
    .option('--remove <tags>', 'Comma-separated tag names to remove')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (taskId: string, opts: { add?: string; remove?: string; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          const result = await manageTags(config, taskId, opts)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            const parts: string[] = []
            if (result.added.length > 0) parts.push(`Added tags: ${result.added.join(', ')}`)
            if (result.removed.length > 0) parts.push(`Removed tags: ${result.removed.join(', ')}`)
            console.log(parts.join('; '))
          }
        },
      ),
    )

  const checklistCmd = program.command('checklist').description('Manage checklists on a task')

  checklistCmd
    .command('view <taskId>')
    .description('View checklists on a task')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
    .option('--parent <itemId>', 'Nest under a parent checklist item ID')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (checklistId: string, name: string, opts: { parent?: string; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          const result = await addChecklistItem(config, checklistId, name, opts.parent)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Added item "${name}" to checklist ${checklistId}`)
          }
        },
      ),
    )

  checklistCmd
    .command('edit-item <checklistId> <checklistItemId>')
    .description('Edit a checklist item')
    .option('--name <name>', 'New item name')
    .option('--resolved', 'Mark item as resolved')
    .option('--unresolved', 'Mark item as unresolved')
    .option('--assignee <userId>', 'Assign user by ID (use "null" to unassign)')
    .option(
      '--parent <itemId>',
      'Reparent item under another checklist item ID (use "null" to unnest)',
    )
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
            parent?: string
            json?: boolean
          },
        ) => {
          const config = loadConfig(getProfileName())
          const updates: {
            name?: string
            resolved?: boolean
            assignee?: number | null
            parent?: string | null
          } = {}
          if (opts.name) updates.name = opts.name
          if (opts.resolved) updates.resolved = true
          if (opts.unresolved) updates.resolved = false
          if (opts.assignee !== undefined) {
            updates.assignee =
              opts.assignee === 'null'
                ? null
                : parseOptionalNumberOption(opts.assignee, '--assignee')
          }
          if (opts.parent !== undefined) {
            updates.parent = opts.parent === 'null' ? null : opts.parent
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        async (
          taskId: string,
          duration: string,
          opts: { description?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
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
    .description('List my recent time entries (use --all for team entries)')
    .option('--days <n>', 'Number of days to look back', '7')
    .option('--task <taskId>', 'Filter by task ID')
    .option('--space <spaceId>', 'Filter by space ID')
    .option('--list <listId>', 'Filter by list ID')
    .option('--assignee <userId>', 'Filter by assignee user ID')
    .option('--all', 'Show all team entries (default: only mine)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (opts: {
          days?: string
          task?: string
          space?: string
          list?: string
          assignee?: string
          all?: boolean
          json?: boolean
        }) => {
          const config = loadConfig(getProfileName())
          const days = opts.days ? Number(opts.days) : 7
          if (!Number.isFinite(days) || days <= 0) {
            throw new Error('--days must be a positive number')
          }
          const entries = await listTimeEntries(config, {
            days,
            taskId: opts.task,
            spaceId: opts.space,
            listId: opts.list,
            assigneeId: opts.assignee,
            all: opts.all,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(entries, null, 2))
          } else if (isTTY()) {
            console.log(formatTimeEntries(entries))
          } else {
            console.log(formatTimeEntriesMarkdown(entries))
          }
        },
      ),
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        async (
          spaceId: string,
          name: string,
          opts: { fg?: string; bg?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
    .command('field-create <name>')
    .description('Create a custom field in your workspace')
    .requiredOption(
      '-t, --type <type>',
      'Field type (text, number, date, checkbox, drop_down, labels, email, phone, url, currency, short_text)',
    )
    .option('-d, --description <text>', 'Field description')
    .option('--options <items>', 'Comma-separated options for drop_down or labels types')
    .option('--required', 'Make the field required')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          name: string,
          opts: {
            type: string
            description?: string
            options?: string
            required?: boolean
            json?: boolean
          },
        ) => {
          if (!name.trim()) throw new Error('Field name cannot be empty')
          const validTypes = [
            'text',
            'short_text',
            'number',
            'date',
            'checkbox',
            'drop_down',
            'labels',
            'email',
            'phone',
            'url',
            'currency',
          ]
          if (!validTypes.includes(opts.type)) {
            throw new Error(
              `Invalid field type "${opts.type}". Valid types: ${validTypes.join(', ')}`,
            )
          }
          const config = loadConfig(getProfileName())
          const client = new ClickUpClient(config)
          const options = opts.options
            ? opts.options
                .split(',')
                .map(o => o.trim())
                .filter(Boolean)
            : undefined
          if ((opts.type === 'drop_down' || opts.type === 'labels') && !options?.length) {
            throw new Error(
              `--options is required for ${opts.type} fields (comma-separated values)`,
            )
          }
          const field = await client.createCustomField(config.teamId, name, opts.type, {
            description: opts.description,
            required: opts.required,
            options,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(field, null, 2))
          } else {
            console.log(`Created field "${field.name}" (${field.id}) type: ${field.type}`)
          }
        },
      ),
    )

  program
    .command('duplicate <taskId>')
    .description('Duplicate a task')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await duplicateTask(config, taskId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Duplicated as "${result.name}" (${result.id})`)
        }
      }),
    )

  function outputBulkResult(result: BulkResult, forceJson: boolean, operation: string): void {
    if (shouldOutputJson(forceJson)) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(
        `${operation}: ${result.updated} updated${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`,
      )
      for (const f of result.failed) {
        console.error(`  ${f.id}: ${f.reason}`)
      }
    }
  }

  const bulkCmd = program.command('bulk').description('Bulk task operations')

  bulkCmd
    .command('status <status> <taskIds...>')
    .description('Update status of multiple tasks')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (status: string, taskIds: string[], opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await bulkUpdateStatus(config, taskIds, status)
        outputBulkResult(result, opts.json ?? false, `status ${status}`)
      }),
    )

  bulkCmd
    .command('assign <taskIds...>')
    .description('Bulk assign or unassign a user from tasks')
    .option('--to <userId>', 'Add this user (user ID or "me")')
    .option('--remove <userId>', 'Remove this user (user ID or "me")')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (taskIds: string[], opts: { to?: string; remove?: string; json?: boolean }) => {
          if (!opts.to && !opts.remove)
            throw new Error('Provide --to <userId> or --remove <userId>')
          if (opts.to && opts.remove) throw new Error('Cannot use --to and --remove together')
          const config = loadConfig(getProfileName())
          const userId = opts.to ?? opts.remove!
          const action = opts.remove ? 'remove' : 'add'
          const result = await bulkAssign(config, userId, taskIds, action)
          outputBulkResult(result, opts.json ?? false, `assign ${action}`)
        },
      ),
    )

  bulkCmd
    .command('due-date <date> <taskIds...>')
    .description('Bulk set due date on tasks (use "none" to clear)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (date: string, taskIds: string[], opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await bulkDueDate(config, date, taskIds)
        outputBulkResult(result, opts.json ?? false, 'due-date')
      }),
    )

  bulkCmd
    .command('tag <tagName> <taskIds...>')
    .description('Bulk add or remove a tag on tasks (default: add)')
    .option('--remove', 'Remove tag instead of adding')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (tagName: string, taskIds: string[], opts: { remove?: boolean; json?: boolean }) => {
          const action = opts.remove ? 'remove' : 'add'
          const config = loadConfig(getProfileName())
          const result = await bulkTag(config, tagName, taskIds, action)
          outputBulkResult(result, opts.json ?? false, `tag ${action}`)
        },
      ),
    )

  bulkCmd
    .command('priority <taskIds...>')
    .description('Bulk set priority on tasks (urgent/high/normal/low or 1-4)')
    .requiredOption('--to <priority>', 'Priority to set (urgent, high, normal, low, or 1-4)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskIds: string[], opts: { to: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await bulkPriority(config, opts.to, taskIds)
        outputBulkResult(result, opts.json ?? false, `priority ${opts.to}`)
      }),
    )

  bulkCmd
    .command('field <taskIds...>')
    .description('Bulk set the same custom field value on tasks')
    .requiredOption('--set <nameAndValue...>', 'Set field: --set "Field Name" value')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskIds: string[], opts: { set: string[]; json?: boolean }) => {
        if (opts.set.length !== 2) {
          throw new Error('--set requires exactly two arguments: field name and value')
        }
        const config = loadConfig(getProfileName())
        const result = await bulkField(config, opts.set[0]!, opts.set[1]!, taskIds)
        outputBulkResult(result, opts.json ?? false, `field "${opts.set[0]}"`)
      }),
    )

  bulkCmd
    .command('move <taskIds...>')
    .description('Move multiple tasks to a single destination list')
    .requiredOption('--to <listId>', 'Destination list ID')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (taskIds: string[], opts: { to: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await bulkMove(config, opts.to, taskIds)
        outputBulkResult(result, opts.json ?? false, `move to list ${opts.to}`)
      }),
    )

  program
    .command('goals')
    .description('List goals in your workspace')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
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
    .option('--due-date <date>', 'Due date (YYYY-MM-DD)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          name: string,
          opts: { description?: string; color?: string; dueDate?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const goal = await createGoal(config, name, {
            description: opts.description,
            color: opts.color,
            dueDate: opts.dueDate,
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
    .option('--archived', 'Include only archived items (default: active items)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (spaceId: string, opts: { name?: string; archived?: boolean; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          const folders = await listFolders(config, spaceId, opts.name, opts.archived)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(folders, null, 2))
          } else if (isTTY()) {
            console.log(formatFolders(folders))
          } else {
            console.log(formatFoldersMarkdown(folders))
          }
        },
      ),
    )

  program
    .command('space-create <name>')
    .description('Create a new space in your workspace')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (name: string, opts: { json?: boolean }) => {
        if (!name.trim()) throw new Error('Space name cannot be empty')
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const space = await client.createSpace(config.teamId, name)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(space, null, 2))
        } else {
          console.log(`Created space "${space.name}" (${space.id})`)
        }
      }),
    )

  program
    .command('list-create <spaceId> <name>')
    .description('Create a new list in a space')
    .option('--folder <folderId>', 'Create the list inside a folder')
    .option('--copy-statuses-from <id>', 'Copy status set from this list or space ID')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          spaceId: string,
          name: string,
          opts: { folder?: string; copyStatusesFrom?: string; json?: boolean },
        ) => {
          if (!name.trim()) throw new Error('List name cannot be empty')
          const config = loadConfig(getProfileName())
          const result = await createListWithOptions(config, spaceId, name, {
            folder: opts.folder,
            copyStatusesFrom: opts.copyStatusesFrom,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Created list "${result.name}" (${result.id})`)
            if (result.statusesCopied) {
              console.log(
                `  Copied ${result.statusesCopied} statuses from ${opts.copyStatusesFrom}`,
              )
            }
          }
        },
      ),
    )

  program
    .command('folder-create <spaceId> <name>')
    .description('Create a new folder in a space')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (spaceId: string, name: string, opts: { json?: boolean }) => {
        if (!name.trim()) throw new Error('Folder name cannot be empty')
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const folder = await client.createFolder(spaceId, name)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(folder, null, 2))
        } else {
          console.log(`Created folder "${folder.name}" (${folder.id})`)
        }
      }),
    )

  program
    .command('list-rename <listId> <newName>')
    .description('Rename a list')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (listId: string, newName: string, opts: { json?: boolean }) => {
        if (!newName.trim()) throw new Error('List name cannot be empty')
        const config = loadConfig(getProfileName())
        const result = await renameList(config, listId, newName)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Renamed list ${result.id} to "${result.name}"`)
        }
      }),
    )

  program
    .command('folder-rename <folderId> <newName>')
    .description('Rename a folder')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (folderId: string, newName: string, opts: { json?: boolean }) => {
        if (!newName.trim()) throw new Error('Folder name cannot be empty')
        const config = loadConfig(getProfileName())
        const result = await renameFolder(config, folderId, newName)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Renamed folder ${result.id} to "${result.name}"`)
        }
      }),
    )

  program
    .command('space-rename <spaceId> <newName>')
    .description('Rename a space')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (spaceId: string, newName: string, opts: { json?: boolean }) => {
        if (!newName.trim()) throw new Error('Space name cannot be empty')
        const config = loadConfig(getProfileName())
        const result = await renameSpace(config, spaceId, newName)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Renamed space ${result.id} to "${result.name}"`)
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
        const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
          const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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
    .option('--name <newName>', 'New tag name')
    .option('--fg <color>', 'New foreground color (hex)')
    .option('--bg <color>', 'New background color (hex)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          spaceId: string,
          tagName: string,
          opts: { name?: string; fg?: string; bg?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          await updateSpaceTag(config, spaceId, tagName, {
            name: opts.name,
            fg: opts.fg,
            bg: opts.bg,
          })
          const newName = opts.name ?? tagName
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(
              JSON.stringify({ success: true, spaceId, oldName: tagName, newName }, null, 2),
            )
          } else if (opts.name && opts.name !== tagName) {
            console.log(`Renamed tag "${tagName}" to "${opts.name}" in space ${spaceId}`)
          } else {
            console.log(`Updated tag "${tagName}" in space ${spaceId}`)
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
        const config = loadConfig(getProfileName())
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
        const config = loadConfig(getProfileName())
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

  program
    .command('list-templates')
    .description('List list templates in your workspace')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const templates = await listListTemplates(config)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(templates, null, 2))
        } else if (isTTY()) {
          console.log(formatListTemplates(templates))
        } else {
          console.log(formatListTemplatesMarkdown(templates))
        }
      }),
    )

  program
    .command('folder-templates')
    .description('List folder templates in your workspace')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const templates = await listFolderTemplates(config)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(templates, null, 2))
        } else if (isTTY()) {
          console.log(formatFolderTemplates(templates))
        } else {
          console.log(formatFolderTemplatesMarkdown(templates))
        }
      }),
    )

  program
    .command('list-from-template <name>')
    .description('Create a list from a list template')
    .requiredOption('--template <id>', 'Template ID (find with list-templates)')
    .option('--space <spaceId>', 'Create in this space')
    .option('--folder <folderId>', 'Create in this folder')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          name: string,
          opts: { template: string; space?: string; folder?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const result = await createListFromTemplate(config, name, opts)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Created list "${name}" (${result.id}) from template`)
          }
        },
      ),
    )

  program
    .command('views <id>')
    .description('List views on a list, space, folder, or workspace')
    .option('--space', 'Treat <id> as a space ID')
    .option('--folder', 'Treat <id> as a folder ID')
    .option('--workspace', 'List workspace-level views (ignores <id>)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          id: string,
          opts: { space?: boolean; folder?: boolean; workspace?: boolean; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const container = opts.workspace
            ? 'workspace'
            : opts.space
              ? 'space'
              : opts.folder
                ? 'folder'
                : 'list'
          const views = await listViews(config, id, container)
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(views, null, 2))
          } else if (isTTY()) {
            console.log(formatViews(views))
          } else {
            console.log(formatViewsMarkdown(views))
          }
        },
      ),
    )

  program
    .command('view <viewId>')
    .description('Get view details')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (viewId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const view = await getViewDetail(config, viewId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(view, null, 2))
        } else if (!isTTY()) {
          console.log(formatViewMarkdown(view))
        } else {
          console.log(formatView(view))
        }
      }),
    )

  program
    .command('view-create <listId> <name>')
    .description('Create a view on a list')
    .requiredOption(
      '-t, --type <type>',
      'View type (list, board, calendar, gantt, table, timeline)',
    )
    .option(
      '--group-by <field>',
      'Group by field (status, assignee, priority, due_date, tag, sprint)',
    )
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          listId: string,
          name: string,
          opts: { type: string; groupBy?: string; json?: boolean },
        ) => {
          const config = loadConfig(getProfileName())
          const view = await createView(config, listId, name, {
            type: opts.type,
            groupBy: opts.groupBy,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(view, null, 2))
          } else {
            console.log(`Created view "${view.name}" (${view.id}) type: ${view.type}`)
          }
        },
      ),
    )

  program
    .command('view-update <viewId>')
    .description('Update a view')
    .option('-n, --name <text>', 'New view name')
    .option(
      '--group-by <field>',
      'Group by field (status, assignee, priority, due_date, tag, sprint)',
    )
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (viewId: string, opts: { name?: string; groupBy?: string; json?: boolean }) => {
          const config = loadConfig(getProfileName())
          const view = await updateViewCommand(config, viewId, {
            name: opts.name,
            groupBy: opts.groupBy,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(view, null, 2))
          } else {
            console.log(`Updated view "${view.name}" (${view.id})`)
          }
        },
      ),
    )

  program
    .command('view-delete <viewId>')
    .description('Delete a view (requires confirmation)')
    .option('--confirm', 'Skip confirmation prompt (required in non-interactive mode)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (viewId: string, opts: { confirm?: boolean; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const result = await deleteViewCommand(config, viewId, opts)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Deleted view ${result.viewId}`)
        }
      }),
    )

  const filterCmd = program.command('filter').description('Manage saved command shortcuts')

  filterCmd
    .command('save <name> [args...]')
    .description('Save a command shortcut')
    .option('-d, --description <text>', 'Description for this filter')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (name: string, args: string[], opts: { description?: string; json?: boolean }) => {
          if (args.length === 0) {
            throw new Error(
              'Provide a command to save, e.g.: cup filter save my-sprint tasks --status "in progress"',
            )
          }
          if (!isAllowedFilterCommand(args)) {
            const allowed = [...ALLOWED_FILTER_COMMANDS, 'time list'].join(', ')
            throw new Error(
              `Command "${args[0]}" is not allowed in saved filters. Allowed: ${allowed}`,
            )
          }
          const entry: FilterEntry = { command: args }
          if (opts.description) entry.description = opts.description
          saveFilter(name, entry, getProfileName())
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify({ name, ...entry }, null, 2))
          } else {
            console.log(`Saved filter "${name}": ${args.join(' ')}`)
          }
        },
      ),
    )

  filterCmd
    .command('run <name>')
    .description('Run a saved command shortcut')
    .action(
      wrapAction(async (name: string) => {
        const filters = getFilters(getProfileName())
        const entry = filters[name]
        if (!entry) {
          throw new Error(`Filter "${name}" not found. Use: cup filter list`)
        }
        runFilter(name, entry)
      }),
    )

  filterCmd
    .command('list')
    .description('List all saved command shortcuts')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const filters = getFilters(getProfileName())
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(filters, null, 2))
        } else if (isTTY()) {
          console.log(formatFiltersTable(filters))
        } else {
          console.log(formatFiltersMarkdown(filters))
        }
      }),
    )

  filterCmd
    .command('delete <name>')
    .description('Delete a saved command shortcut')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (name: string, opts: { json?: boolean }) => {
        deleteFilter(name, getProfileName())
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, name }, null, 2))
        } else {
          console.log(`Deleted filter "${name}"`)
        }
      }),
    )

  filterCmd
    .command('show <name>')
    .description('Show details of a saved command shortcut')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (name: string, opts: { json?: boolean }) => {
        const filters = getFilters(getProfileName())
        const entry = filters[name]
        if (!entry) {
          throw new Error(`Filter "${name}" not found. Use: cup filter list`)
        }
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ name, ...entry }, null, 2))
        } else {
          console.log(formatFilterDetail(name, entry))
        }
      }),
    )

  const favoriteCmd = program
    .command('favorite')
    .description('Manage local favorites (sprint folders, spaces, lists, etc.)')

  favoriteCmd
    .command('add <type> <id> [alias]')
    .description('Add a favorite (types: sprint-folder, space, list, folder, view, task)')
    .option('-n, --name <name>', 'Display name for the favorite')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          type: string,
          id: string,
          alias: string | undefined,
          opts: { name?: string; json?: boolean },
        ) => {
          validateFavoriteType(type)
          const resolvedAlias = alias ?? slugify(opts.name ?? id)
          const entry: FavoriteEntry = { type, id, ...(opts.name ? { name: opts.name } : {}) }
          saveFavorite(resolvedAlias, entry, getProfileName())
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify({ alias: resolvedAlias, ...entry }, null, 2))
          } else {
            console.log(`Added favorite "${resolvedAlias}" (${type} ${id})`)
          }
        },
      ),
    )

  favoriteCmd
    .command('remove <alias>')
    .description('Remove a favorite by alias')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (alias: string, opts: { json?: boolean }) => {
        deleteFavorite(alias, getProfileName())
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, alias }, null, 2))
        } else {
          console.log(`Removed favorite "${alias}"`)
        }
      }),
    )

  favoriteCmd
    .command('list')
    .description('List saved favorites')
    .option('--type <type>', 'Filter by entity type')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { type?: string; json?: boolean }) => {
        let favorites = getFavorites(getProfileName())
        if (opts.type) {
          favorites = Object.fromEntries(
            Object.entries(favorites).filter(([, entry]) => entry.type === opts.type),
          )
        }
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(favorites, null, 2))
        } else if (isTTY()) {
          console.log(formatFavoritesTable(favorites))
        } else {
          console.log(formatFavoritesMarkdown(favorites))
        }
      }),
    )

  const profileCmd = program.command('profile').description('Manage profiles')

  profileCmd
    .command('list')
    .description('List all profiles')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { json?: boolean }) => {
        const profiles = listProfiles()
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(profiles, null, 2))
        } else {
          for (const p of profiles) {
            const marker = p.isDefault ? ' (default)' : ''
            console.log(`${p.name}${marker}${p.teamId ? ` [team: ${p.teamId}]` : ''}`)
          }
          if (profiles.length === 0)
            console.log('No profiles configured. Run: cup profile add <name>')
        }
      }),
    )

  profileCmd
    .command('add <name>')
    .description('Add a new profile')
    .action(
      wrapAction(async (name: string) => {
        const { password, select } = await import('@inquirer/prompts')
        const apiToken = (await password({ message: 'ClickUp API token (pk_...):' })).trim()
        if (!apiToken.startsWith('pk_')) throw new Error('Token must start with pk_')

        const client = new ClickUpClient({ apiToken })
        const me = await client.getMe()
        process.stdout.write(`Authenticated as @${me.username}\n`)

        const teams = await client.getTeams()
        if (teams.length === 0) throw new Error('No workspaces found for this token.')

        let teamId: string
        if (teams.length === 1) {
          teamId = teams[0]!.id
          process.stdout.write(`Workspace: ${teams[0]!.name}\n`)
        } else {
          teamId = await select({
            message: 'Select workspace:',
            choices: teams.map(t => ({ name: t.name, value: t.id })),
            theme: { keybindings: ['vim'] as const },
          })
        }

        addProfile(name, { apiToken, teamId })
        process.stdout.write(`Profile "${name}" added.\n`)
      }),
    )

  profileCmd
    .command('remove <name>')
    .description('Remove a profile')
    .action(
      wrapAction(async (name: string) => {
        removeProfile(name)
        console.log(`Removed profile "${name}"`)
      }),
    )

  profileCmd
    .command('use <name>')
    .description('Set the default profile')
    .action(
      wrapAction(async (name: string) => {
        setDefaultProfile(name)
        console.log(`Default profile set to "${name}"`)
      }),
    )

  const configCmd = program.command('config').description('Manage CLI configuration')

  configCmd
    .command('get <key>')
    .description('Print a config value')
    .action(
      wrapAction(async (key: string) => {
        const value = getConfigValue(key, getProfileName())
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
        setConfigValue(key, value, getProfileName())
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

  const chatCmd = program.command('chat').description('Chat channels and messaging')

  chatCmd
    .command('channels')
    .description('List chat channels you follow')
    .option('--all', 'List all channels, not just ones you follow')
    .option('--type <type>', 'Filter by type (channel, dm, group_dm)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (opts: { all?: boolean; type?: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const channels = await client.getChatChannels({
          isFollower: opts.all ? undefined : true,
          channelTypes: opts.type,
        })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(channels, null, 2))
        } else if (isTTY()) {
          console.log(formatChannelsTable(channels))
        } else {
          console.log(formatChannelsMarkdown(channels))
        }
      }),
    )

  chatCmd
    .command('channel <channelId>')
    .description('Show channel details')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (channelId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const channel = await client.getChatChannel(channelId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(channel, null, 2))
        } else {
          console.log(formatChannelDetail(channel))
        }
      }),
    )

  chatCmd
    .command('send <channelId>')
    .description('Send a message to a channel')
    .requiredOption('-m, --message <text>', 'Message content (markdown supported)')
    .option('--post', 'Send as a post instead of a message')
    .option('--title <title>', 'Post title (requires --post)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          channelId: string,
          opts: { message: string; post?: boolean; title?: string; json?: boolean },
        ) => {
          if (opts.title && !opts.post) {
            throw new Error('--title requires --post')
          }
          const config = loadConfig(getProfileName())
          const client = new ClickUpClient(config)
          const result = await client.sendChatMessage(channelId, opts.message, {
            type: opts.post ? 'post' : 'message',
            postTitle: opts.title,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Sent ${result.type} ${result.id} to channel ${channelId}`)
          }
        },
      ),
    )

  chatCmd
    .command('messages <channelId>')
    .description('List recent messages in a channel')
    .option('--limit <n>', 'Max messages to show (default: 25)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (channelId: string, opts: { limit?: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const limit = opts.limit ? Number(opts.limit) : 25
        if (!Number.isFinite(limit) || limit <= 0) {
          throw new Error('--limit must be a positive number')
        }
        const messages = await client.getChatMessages(channelId, { limit })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(messages, null, 2))
        } else if (isTTY()) {
          console.log(formatMessages(messages))
        } else {
          console.log(formatMessagesMarkdown(messages))
        }
      }),
    )

  chatCmd
    .command('channel-create <name>')
    .description('Create a new chat channel')
    .option('--private', 'Create as private channel')
    .option('--topic <topic>', 'Channel topic')
    .option('--space <spaceId>', 'Create on a specific space')
    .option('--folder <folderId>', 'Create on a specific folder')
    .option('--list <listId>', 'Create on a specific list')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          name: string,
          opts: {
            private?: boolean
            topic?: string
            space?: string
            folder?: string
            list?: string
            json?: boolean
          },
        ) => {
          if (!name.trim()) throw new Error('Channel name cannot be empty')
          const config = loadConfig(getProfileName())
          const client = new ClickUpClient(config)
          let result
          if (opts.space || opts.folder || opts.list) {
            const location = opts.space
              ? { id: opts.space, type: 'space' as const }
              : opts.folder
                ? { id: opts.folder, type: 'folder' as const }
                : { id: opts.list!, type: 'list' as const }
            result = await client.createLocationChannel(location, {
              topic: opts.topic,
              visibility: opts.private ? 'PRIVATE' : undefined,
            })
          } else {
            result = await client.createChatChannel(name, {
              visibility: opts.private ? 'PRIVATE' : undefined,
              topic: opts.topic,
            })
          }
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Created channel "${result.name}" (${result.id})`)
          }
        },
      ),
    )

  chatCmd
    .command('dm <userIds...>')
    .description('Create or open a direct message')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (userIds: string[], opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const result = await client.createDirectMessage(userIds)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`DM channel: ${result.id}`)
        }
      }),
    )

  chatCmd
    .command('channel-update <channelId>')
    .description('Update a channel')
    .option('--name <name>', 'New name')
    .option('--topic <topic>', 'New topic')
    .option('--description <desc>', 'New description')
    .option('--visibility <v>', 'PUBLIC or PRIVATE')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(
        async (
          channelId: string,
          opts: {
            name?: string
            topic?: string
            description?: string
            visibility?: string
            json?: boolean
          },
        ) => {
          const config = loadConfig(getProfileName())
          const client = new ClickUpClient(config)
          const result = await client.updateChatChannel(channelId, {
            name: opts.name,
            topic: opts.topic,
            description: opts.description,
            visibility: opts.visibility as 'PUBLIC' | 'PRIVATE' | undefined,
          })
          if (shouldOutputJson(opts.json ?? false)) {
            console.log(JSON.stringify(result, null, 2))
          } else {
            console.log(`Updated channel "${result.name}" (${result.id})`)
          }
        },
      ),
    )

  chatCmd
    .command('channel-delete <channelId>')
    .description('Delete a channel')
    .option('--confirm', 'Skip confirmation prompt')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (channelId: string, opts: { confirm?: boolean; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        if (!opts.confirm) {
          if (!isTTY()) {
            throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
          }
          const channel = await client.getChatChannel(channelId)
          const { confirm } = await import('@inquirer/prompts')
          const confirmed = await confirm({
            message: `Delete channel "${channel.name}"?`,
            default: false,
          })
          if (!confirmed) throw new Error('Cancelled')
        }
        await client.deleteChatChannel(channelId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, channelId }, null, 2))
        } else {
          console.log(`Deleted channel ${channelId}`)
        }
      }),
    )

  chatCmd
    .command('members <channelId>')
    .description('List channel members')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (channelId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const members = await client.getChatChannelMembers(channelId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(members, null, 2))
        } else if (isTTY()) {
          console.log(formatChatMembers(members))
        } else {
          console.log(formatChatMembersMarkdown(members))
        }
      }),
    )

  chatCmd
    .command('followers <channelId>')
    .description('List channel followers')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (channelId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const followers = await client.getChatChannelFollowers(channelId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(followers, null, 2))
        } else if (isTTY()) {
          console.log(formatChatMembers(followers))
        } else {
          console.log(formatChatMembersMarkdown(followers))
        }
      }),
    )

  chatCmd
    .command('reply <messageId>')
    .description('Reply to a message')
    .requiredOption('-m, --message <text>', 'Reply content (markdown supported)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { message: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const result = await client.createChatMessageReply(messageId, opts.message)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Reply sent (id: ${result.id})`)
        }
      }),
    )

  chatCmd
    .command('replies <messageId>')
    .description('List replies to a message')
    .option('--limit <n>', 'Max replies (default: 50)')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { limit?: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const limit = opts.limit ? Number(opts.limit) : undefined
        if (opts.limit && (!Number.isFinite(limit) || (limit ?? 0) <= 0)) {
          throw new Error('--limit must be a positive number')
        }
        const replies = await client.getChatMessageReplies(messageId, { limit })
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(replies, null, 2))
        } else if (isTTY()) {
          console.log(formatMessages(replies))
        } else {
          console.log(formatMessagesMarkdown(replies))
        }
      }),
    )

  chatCmd
    .command('react <messageId>')
    .description('Add a reaction to a message')
    .requiredOption('--emoji <name>', 'Emoji name (e.g. "thumbsup", "heart")')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { emoji: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const result = await client.createChatMessageReaction(messageId, opts.emoji)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Added :${opts.emoji}: reaction`)
        }
      }),
    )

  chatCmd
    .command('unreact <messageId>')
    .description('Remove a reaction from a message')
    .requiredOption('--emoji <name>', 'Emoji name to remove')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { emoji: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        await client.deleteChatMessageReaction(messageId, opts.emoji)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, emoji: opts.emoji }, null, 2))
        } else {
          console.log(`Removed :${opts.emoji}: reaction`)
        }
      }),
    )

  chatCmd
    .command('reactions <messageId>')
    .description('List reactions on a message')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const reactions = await client.getChatMessageReactions(messageId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(reactions, null, 2))
        } else if (isTTY()) {
          console.log(formatReactions(reactions))
        } else {
          console.log(formatReactionsMarkdown(reactions))
        }
      }),
    )

  chatCmd
    .command('message-update <messageId>')
    .description('Edit a message')
    .requiredOption('-m, --message <text>', 'New message content')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { message: string; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        const client = new ClickUpClient(config)
        const result = await client.updateChatMessage(messageId, opts.message)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(`Message ${messageId} updated`)
        }
      }),
    )

  chatCmd
    .command('message-delete <messageId>')
    .description('Delete a message')
    .option('--confirm', 'Skip confirmation prompt')
    .option('--json', 'Force JSON output even in terminal')
    .action(
      wrapAction(async (messageId: string, opts: { confirm?: boolean; json?: boolean }) => {
        const config = loadConfig(getProfileName())
        if (!opts.confirm) {
          if (!isTTY()) {
            throw new Error('Destructive operation requires --confirm flag in non-interactive mode')
          }
          const { confirm } = await import('@inquirer/prompts')
          const confirmed = await confirm({
            message: `Delete message ${messageId}? This cannot be undone.`,
            default: false,
          })
          if (!confirmed) throw new Error('Cancelled')
        }
        const client = new ClickUpClient(config)
        await client.deleteChatMessage(messageId)
        if (shouldOutputJson(opts.json ?? false)) {
          console.log(JSON.stringify({ success: true, id: messageId }, null, 2))
        } else {
          console.log(`Message ${messageId} deleted`)
        }
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

  program
    .command('skill')
    .description('Install the agent skill file for your coding agents')
    .option('--print', 'Print the skill file content instead of installing')
    .option('--path <path>', 'Install to a specific path')
    .action(
      wrapAction(async (opts: { print?: boolean; path?: string }) => {
        if (opts.print) {
          process.stdout.write(printSkill())
          return
        }
        if (opts.path) {
          const dest = installSkillTo(opts.path)
          console.log(`Installed to ${dest}`)
          return
        }
        const installed = await installSkillInteractive()
        console.log('')
        for (const entry of installed) {
          console.log(`  Installed: ${entry}`)
        }
      }),
    )

  return program
}

export async function run(argv = process.argv): Promise<void> {
  const programName = basename(argv[1] ?? 'cup')
  const program = buildProgram(programName)
  await program.parseAsync(argv)
}

process.on('SIGINT', () => {
  process.stderr.write('\nInterrupted\n')
  process.exitCode = 130
})

function checkDirectExecution(): boolean {
  try {
    return (
      process.argv[1] !== undefined &&
      fileURLToPath(import.meta.url) === realpathSync(resolve(process.argv[1]))
    )
  } catch {
    return false
  }
}

const isDirectExecution = checkDirectExecution()

if (isDirectExecution) {
  await run()
}
