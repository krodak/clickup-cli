export type QuickReferenceSection = 'setup' | 'read' | 'write' | 'configuration'

interface QuickReferenceEntry {
  section: QuickReferenceSection
  usage: string
  description: string
}

export interface CommandFlagDefinition {
  short?: string
  long: string
}

export interface CommandMetadata {
  name: string
  description: string
  flags?: readonly string[]
  bashFileCompletion?: boolean
  quickReference?: readonly QuickReferenceEntry[]
}

export const commandMetadata = [
  {
    name: 'init',
    description: 'Set up cup (interactive). Use --token and --team for non-interactive/agent setup',
    flags: ['--token', '--team'],
    quickReference: [
      {
        section: 'setup',
        usage: 'init',
        description: 'First-time setup (interactive, or use --token --team for agents)',
      },
    ],
  },
  {
    name: 'auth',
    description: 'Validate API token and show current user',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'auth', description: 'Check authentication status' },
    ],
  },
  {
    name: 'tasks',
    description: 'List tasks assigned to you by default. Use --all to search across all assignees.',
    flags: [
      '--status',
      '--list',
      '--space',
      '--name',
      '--type',
      '--all',
      '--include-closed',
      '--assignee',
      '--tag',
      '--due-before',
      '--due-after',
      '--created-after',
      '--created-before',
      '--field',
      '--json',
    ],
    quickReference: [
      { section: 'read', usage: 'tasks', description: 'My tasks (--all for all assignees)' },
    ],
  },
  {
    name: 'task',
    description: 'Get task details',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'task <taskId>', description: 'Get task details' }],
  },
  {
    name: 'update',
    description: 'Update a task',
    flags: [
      '-n',
      '--name',
      '-d',
      '--description',
      '--description-file',
      '-s',
      '--status',
      '--priority',
      '--due-date',
      '--start-date',
      '--time-estimate',
      '--assignee',
      '--remove-assignee',
      '--group-assignee',
      '--remove-group-assignee',
      '--parent',
      '--archive',
      '--unarchive',
      '--type',
      '--field',
      '--json',
    ],
    quickReference: [{ section: 'write', usage: 'update <taskId>', description: 'Update a task' }],
  },
  {
    name: 'create',
    description: 'Create a new task',
    flags: [
      '-l',
      '--list',
      '-n',
      '--name',
      '-d',
      '--description',
      '--description-file',
      '-p',
      '--parent',
      '-s',
      '--status',
      '--priority',
      '--due-date',
      '--start-date',
      '--assignee',
      '--group-assignee',
      '--tags',
      '--custom-item-id',
      '--time-estimate',
      '--template',
      '--field',
      '--json',
    ],
    quickReference: [{ section: 'write', usage: 'create', description: 'Create a new task' }],
  },
  {
    name: 'sprint',
    description: 'List my tasks in the current active sprint (auto-detected)',
    flags: ['--status', '--space', '--folder', '--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'sprint', description: 'My tasks in the active sprint' },
    ],
  },
  {
    name: 'sprints',
    description: 'List all sprints in sprint folders',
    flags: ['--space', '--json'],
    quickReference: [
      { section: 'read', usage: 'sprints', description: 'List all sprints across folders' },
    ],
  },
  {
    name: 'subtasks',
    description: 'List subtasks of a task or initiative',
    flags: ['--status', '--name', '--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'subtasks <taskId>', description: 'List subtasks of a task' },
    ],
  },
  {
    name: 'comment',
    description: 'Post a comment on a task',
    flags: ['-m', '--message', '--message-file', '--notify-all', '--mention', '--json'],
    quickReference: [
      { section: 'write', usage: 'comment <taskId>', description: 'Post a comment on a task' },
    ],
  },
  {
    name: 'comment-edit',
    description: 'Edit an existing comment',
    flags: [
      '-m',
      '--message',
      '--message-file',
      '--resolved',
      '--unresolved',
      '--mention',
      '--json',
    ],
    quickReference: [
      {
        section: 'write',
        usage: 'comment-edit <commentId>',
        description: 'Edit an existing comment',
      },
    ],
  },
  {
    name: 'comment-delete',
    description:
      'Delete a comment by ID, or use --task with --mine to find and delete your comment',
    flags: ['--task', '--mine', '--match', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'comment-delete [commentId]',
        description: 'Delete a comment',
      },
    ],
  },
  {
    name: 'comments',
    description: 'List comments on a task',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'comments <taskId>', description: 'List comments on a task' },
    ],
  },
  {
    name: 'replies',
    description: 'List threaded replies on a comment',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'replies <commentId>',
        description: 'List threaded replies on a comment',
      },
    ],
  },
  {
    name: 'reply',
    description: 'Reply to a comment',
    flags: ['-m', '--message', '--message-file', '--notify-all', '--mention', '--json'],
    quickReference: [
      { section: 'write', usage: 'reply <commentId>', description: 'Reply to a comment' },
    ],
  },
  {
    name: 'activity',
    description: 'Show task details and comments combined',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'activity <taskId>',
        description: 'Task details + comment history',
      },
    ],
  },
  {
    name: 'lists',
    description: 'List all lists in a space (including lists inside folders)',
    flags: ['--name', '--archived', '--json'],
    quickReference: [
      { section: 'read', usage: 'lists <spaceId>', description: 'List all lists in a space' },
    ],
  },
  {
    name: 'spaces',
    description: 'List spaces in your workspace',
    flags: ['--name', '--my', '--archived', '--json'],
    quickReference: [{ section: 'read', usage: 'spaces', description: 'List spaces in workspace' }],
  },
  {
    name: 'inbox',
    description: 'Recently updated tasks grouped by time period',
    flags: ['--include-closed', '--json', '--days'],
    quickReference: [
      {
        section: 'read',
        usage: 'inbox',
        description: 'Recently updated tasks assigned to me',
      },
    ],
  },
  {
    name: 'assigned',
    description: 'Show all tasks assigned to me, grouped by status',
    flags: ['--status', '--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'assigned', description: 'My tasks grouped by pipeline stage' },
    ],
  },
  {
    name: 'open',
    description: 'Open a task in the browser by ID or name',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'open <query>', description: 'Open a task in the browser' },
    ],
  },
  {
    name: 'search',
    description:
      'Search tasks by name. Without a query, lists tasks filtered by flags. Defaults to your tasks; use --all for all assignees.',
    flags: [
      '--status',
      '--list',
      '--space',
      '--all',
      '--include-closed',
      '--assignee',
      '--tag',
      '--due-before',
      '--due-after',
      '--created-after',
      '--created-before',
      '--field',
      '--json',
    ],
    quickReference: [
      {
        section: 'read',
        usage: 'search [query]',
        description: 'Search tasks by name or filter by flags (--all for all assignees)',
      },
    ],
  },
  {
    name: 'summary',
    description: 'Daily standup summary: completed, in-progress, overdue',
    flags: ['--hours', '--json'],
    quickReference: [{ section: 'read', usage: 'summary', description: 'Daily standup helper' }],
  },
  {
    name: 'overdue',
    description: 'List tasks that are past their due date',
    flags: ['--all', '--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'overdue', description: 'Tasks past their due date' },
    ],
  },
  {
    name: 'archive',
    description: 'Archive a task (or unarchive with --unarchive)',
    flags: ['--unarchive', '--confirm', '--json'],
    quickReference: [
      { section: 'write', usage: 'archive <taskId>', description: 'Archive or unarchive a task' },
    ],
  },
  {
    name: 'assign',
    description: 'Assign or unassign users and groups from a task',
    flags: ['--to', '--remove', '--group', '--remove-group', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'assign <taskId>',
        description: 'Assign or unassign users and groups',
      },
    ],
  },
  {
    name: 'depend',
    description: 'Add or remove task dependencies',
    flags: ['--on', '--blocks', '--remove', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'depend <taskId>',
        description: 'Add or remove task dependencies',
      },
    ],
  },
  {
    name: 'link',
    description: 'Add or remove a link between two tasks',
    flags: ['--remove', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'link <taskId> <linksTo>',
        description: 'Add or remove a link between tasks',
      },
    ],
  },
  {
    name: 'attach',
    description: 'Upload a file attachment to a task',
    flags: ['--json'],
    bashFileCompletion: true,
    quickReference: [
      {
        section: 'write',
        usage: 'attach <taskId> <filePath>',
        description: 'Upload a file attachment to a task',
      },
    ],
  },
  {
    name: 'move',
    description: 'Add or remove a task from a list',
    flags: ['--to', '--remove', '--json'],
    quickReference: [
      { section: 'write', usage: 'move <taskId>', description: 'Add or remove a task from a list' },
    ],
  },
  {
    name: 'field',
    description: 'Set or remove a custom field value on a task',
    flags: ['--set', '--value-file', '--remove', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'field <taskId>',
        description: 'Set or remove custom field values',
      },
    ],
  },
  {
    name: 'delete',
    description: 'Delete a task (requires confirmation)',
    flags: ['--confirm', '--json'],
    quickReference: [{ section: 'write', usage: 'delete <taskId>', description: 'Delete a task' }],
  },
  {
    name: 'list-delete',
    description: 'Delete a list (requires confirmation)',
    flags: ['--confirm', '--json'],
    quickReference: [
      { section: 'write', usage: 'list-delete <listId>', description: 'Delete a list' },
    ],
  },
  {
    name: 'folder-delete',
    description: 'Delete a folder (requires confirmation)',
    flags: ['--confirm', '--json'],
    quickReference: [
      { section: 'write', usage: 'folder-delete <folderId>', description: 'Delete a folder' },
    ],
  },
  {
    name: 'space-delete',
    description: 'Delete a space (requires confirmation)',
    flags: ['--confirm', '--json'],
    quickReference: [
      { section: 'write', usage: 'space-delete <spaceId>', description: 'Delete a space' },
    ],
  },
  {
    name: 'attachments',
    description: 'List attachments on a task',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'attachments <taskId>',
        description: 'List attachments on a task',
      },
    ],
  },
  {
    name: 'attach-get',
    description: 'Download task attachment(s) by ID or title',
    flags: ['-o', '--output', '--dir', '--all', '--force', '--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'attach-get <taskId> [selector]',
        description: 'Download task attachment(s)',
      },
    ],
  },
  {
    name: 'task-members',
    description: 'List members with access to a task',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'task-members <taskId>',
        description: 'List members with access to a task',
      },
    ],
  },
  {
    name: 'plan',
    description: 'Show workspace plan',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'plan', description: 'Show workspace plan' }],
  },
  {
    name: 'tag',
    description: 'Add or remove tags from a task',
    flags: ['--add', '--remove', '--json'],
    quickReference: [
      { section: 'write', usage: 'tag <taskId>', description: 'Add or remove tags on a task' },
    ],
  },
  {
    name: 'tags',
    description: 'List tags in a space',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'tags <spaceId>', description: 'List tags in a space' },
    ],
  },
  {
    name: 'tag-create',
    description: 'Create a tag in a space',
    flags: ['--fg', '--bg', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'tag-create <spaceId> <name>',
        description: 'Create a tag in a space',
      },
    ],
  },
  {
    name: 'tag-delete',
    description: 'Delete a tag from a space',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'tag-delete <spaceId> <name>',
        description: 'Delete a tag from a space',
      },
    ],
  },
  {
    name: 'tag-update',
    description: 'Update a tag in a space',
    flags: ['--name', '--fg', '--bg', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'tag-update <spaceId> <tagName>',
        description: 'Update a tag in a space',
      },
    ],
  },
  {
    name: 'checklist',
    description: 'Manage checklists on a task',
    quickReference: [
      { section: 'write', usage: 'checklist', description: 'Manage checklists on tasks' },
    ],
  },
  {
    name: 'time',
    description: 'Track time on tasks',
    quickReference: [
      {
        section: 'write',
        usage: 'time start <taskId>',
        description: 'Start tracking time on a task',
      },
      { section: 'write', usage: 'time stop', description: 'Stop the running timer' },
      { section: 'write', usage: 'time status', description: 'Show the currently running timer' },
      {
        section: 'write',
        usage: 'time log <taskId> <duration>',
        description: 'Log a manual time entry',
      },
      {
        section: 'write',
        usage: 'time list',
        description: 'List my recent time entries (--all for team)',
      },
      { section: 'write', usage: 'time update <timeEntryId>', description: 'Update a time entry' },
      { section: 'write', usage: 'time delete <timeEntryId>', description: 'Delete a time entry' },
      {
        section: 'write',
        usage: 'time estimate-by-user <taskId> <userId> <duration>',
        description: 'Set per-user time estimate',
      },
    ],
  },
  {
    name: 'time-in-status',
    description: 'Show how long a task has been in each status',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'time-in-status <taskId>',
        description: 'Show how long a task has been in each status',
      },
    ],
  },
  {
    name: 'docs',
    description: 'List workspace docs (optionally filter by name)',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'docs [query]', description: 'List workspace docs' },
    ],
  },
  {
    name: 'doc',
    description: 'View a doc (metadata + page tree) or a specific page',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'doc <docId> [pageId]', description: 'View a doc or doc page' },
    ],
  },
  {
    name: 'doc-create',
    description: 'Create a new doc',
    flags: ['-c', '--content', '--json'],
    quickReference: [
      { section: 'write', usage: 'doc-create <title>', description: 'Create a new doc' },
    ],
  },
  {
    name: 'doc-pages',
    description: 'List all pages in a doc with content',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'doc-pages <docId>',
        description: 'All pages in a doc with content',
      },
    ],
  },
  {
    name: 'doc-page-create',
    description: 'Create a page in a doc',
    flags: ['-c', '--content', '--parent-page', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'doc-page-create <docId> <name>',
        description: 'Create a page in a doc',
      },
    ],
  },
  {
    name: 'doc-page-edit',
    description: 'Edit a doc page',
    flags: ['--name', '-c', '--content', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'doc-page-edit <docId> <pageId>',
        description: 'Edit a doc page',
      },
    ],
  },
  {
    name: 'doc-delete',
    description: 'Delete a doc',
    flags: ['--json'],
    quickReference: [
      { section: 'write', usage: 'doc-delete <docId>', description: 'Delete a doc' },
    ],
  },
  {
    name: 'doc-page-delete',
    description: 'Delete a doc page',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'doc-page-delete <docId> <pageId>',
        description: 'Delete a doc page',
      },
    ],
  },
  {
    name: 'folders',
    description: 'List folders in a space (with their lists)',
    flags: ['--name', '--archived', '--json'],
    quickReference: [
      { section: 'read', usage: 'folders <spaceId>', description: 'List folders in a space' },
    ],
  },
  {
    name: 'skill',
    description: 'Install the agent skill file for your coding agents',
    flags: ['--print', '--path'],
    quickReference: [
      {
        section: 'setup',
        usage: 'skill',
        description: 'Install skill for your agents',
      },
    ],
  },
  {
    name: 'space-create',
    description: 'Create a new space in your workspace',
    flags: ['--json'],
    quickReference: [
      { section: 'write', usage: 'space-create <name>', description: 'Create a space' },
    ],
  },
  {
    name: 'list-create',
    description: 'Create a new list in a space',
    flags: ['--folder', '--copy-statuses-from', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'list-create <spaceId> <name>',
        description: 'Create a list in a space',
      },
    ],
  },
  {
    name: 'folder-create',
    description: 'Create a new folder in a space',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'folder-create <spaceId> <name>',
        description: 'Create a folder in a space',
      },
    ],
  },
  {
    name: 'list-rename',
    description: 'Rename a list',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'list-rename <listId> <newName>',
        description: 'Rename a list',
      },
    ],
  },
  {
    name: 'folder-rename',
    description: 'Rename a folder',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'folder-rename <folderId> <newName>',
        description: 'Rename a folder',
      },
    ],
  },
  {
    name: 'space-rename',
    description: 'Rename a space',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'space-rename <spaceId> <newName>',
        description: 'Rename a space',
      },
    ],
  },
  {
    name: 'members',
    description: 'List workspace members',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'members', description: 'List workspace members' }],
  },
  {
    name: 'groups',
    description: 'List user groups (teams) in your workspace',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'groups',
        description: 'List user groups (teams) in your workspace',
      },
    ],
  },
  {
    name: 'fields',
    description: 'List custom fields for a list',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'fields <listId>', description: 'List custom fields for a list' },
    ],
  },
  {
    name: 'field-create',
    description: 'Create a custom field in your workspace or on one or more lists',
    flags: [
      '-t',
      '--type',
      '-d',
      '--description',
      '--options',
      '--required',
      '--list',
      '--lists',
      '--json',
    ],
    quickReference: [
      {
        section: 'write',
        usage: 'field-create <name>',
        description: 'Create a custom field in your workspace or on one or more lists',
      },
    ],
  },
  {
    name: 'duplicate',
    description: 'Duplicate a task',
    flags: ['--json'],
    quickReference: [
      { section: 'write', usage: 'duplicate <taskId>', description: 'Duplicate a task' },
    ],
  },
  {
    name: 'bulk',
    description: 'Bulk task operations',
    quickReference: [
      {
        section: 'write',
        usage: 'bulk status <status> <taskIds...>',
        description: 'Bulk update task status',
      },
      {
        section: 'write',
        usage: 'bulk assign <taskIds...>',
        description: 'Bulk assign user to tasks',
      },
      {
        section: 'write',
        usage: 'bulk due-date <date> <taskIds...>',
        description: 'Bulk set due date',
      },
      {
        section: 'write',
        usage: 'bulk tag <tagName> <taskIds...>',
        description: 'Bulk add/remove tag',
      },
      {
        section: 'write',
        usage: 'bulk priority <taskIds...>',
        description: 'Bulk set priority on tasks',
      },
      {
        section: 'write',
        usage: 'bulk field <taskIds...>',
        description: 'Bulk set a custom field value on tasks',
      },
      {
        section: 'write',
        usage: 'bulk move <taskIds...>',
        description: 'Move multiple tasks to a destination list',
      },
    ],
  },
  {
    name: 'goals',
    description: 'List goals in your workspace',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'goals', description: 'List goals in your workspace' },
    ],
  },
  {
    name: 'goal-create',
    description: 'Create a goal',
    flags: ['-d', '--description', '--color', '--due-date', '--json'],
    quickReference: [
      { section: 'write', usage: 'goal-create <name>', description: 'Create a goal' },
    ],
  },
  {
    name: 'goal-update',
    description: 'Update a goal',
    flags: ['-n', '--name', '-d', '--description', '--color', '--json'],
    quickReference: [
      { section: 'write', usage: 'goal-update <goalId>', description: 'Update a goal' },
    ],
  },
  {
    name: 'goal-delete',
    description: 'Delete a goal',
    flags: ['--json'],
    quickReference: [
      { section: 'write', usage: 'goal-delete <goalId>', description: 'Delete a goal' },
    ],
  },
  {
    name: 'key-results',
    description: 'List key results for a goal',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'key-results <goalId>',
        description: 'List key results for a goal',
      },
    ],
  },
  {
    name: 'key-result-create',
    description: 'Create a key result on a goal',
    flags: ['--type', '--target', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'key-result-create <goalId> <name>',
        description: 'Create a key result on a goal',
      },
    ],
  },
  {
    name: 'key-result-update',
    description: 'Update a key result',
    flags: ['--progress', '--note', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'key-result-update <keyResultId>',
        description: 'Update a key result',
      },
    ],
  },
  {
    name: 'key-result-delete',
    description: 'Delete a key result',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'key-result-delete <keyResultId>',
        description: 'Delete a key result',
      },
    ],
  },
  {
    name: 'task-types',
    description: 'List custom task types in your workspace',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'task-types', description: 'List custom task types' },
    ],
  },
  {
    name: 'templates',
    description: 'List task templates in your workspace',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'templates', description: 'List task templates' }],
  },
  {
    name: 'list-templates',
    description: 'List list templates in your workspace',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'list-templates', description: 'List list templates' },
    ],
  },
  {
    name: 'folder-templates',
    description: 'List folder templates in your workspace',
    flags: ['--json'],
    quickReference: [
      { section: 'read', usage: 'folder-templates', description: 'List folder templates' },
    ],
  },
  {
    name: 'list-from-template',
    description: 'Create a list from a list template',
    flags: ['--template', '--space', '--folder', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'list-from-template <name>',
        description: 'Create a list from a template',
      },
    ],
  },
  {
    name: 'views',
    description: 'List views on a list, space, folder, or workspace',
    flags: ['--space', '--folder', '--workspace', '--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'views <id>',
        description: 'List views on a list, space, folder, or workspace',
      },
    ],
  },
  {
    name: 'view',
    description: 'Get view details',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'view <viewId>', description: 'Get view details' }],
  },
  {
    name: 'view-tasks',
    description: 'List tasks in a view',
    flags: ['--me', '--json'],
    quickReference: [
      { section: 'read', usage: 'view-tasks <viewId>', description: 'List tasks in a view' },
    ],
  },
  {
    name: 'view-create',
    description: 'Create a view on a list',
    flags: ['-t', '--type', '--group-by', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'view-create <listId> <name>',
        description: 'Create a view on a list',
      },
    ],
  },
  {
    name: 'view-update',
    description: 'Update a view',
    flags: ['-n', '--name', '--group-by', '--json'],
    quickReference: [
      { section: 'write', usage: 'view-update <viewId>', description: 'Update a view' },
    ],
  },
  {
    name: 'view-delete',
    description: 'Delete a view (requires confirmation)',
    flags: ['--confirm', '--json'],
    quickReference: [
      { section: 'write', usage: 'view-delete <viewId>', description: 'Delete a view' },
    ],
  },
  {
    name: 'filter',
    description: 'Manage saved command shortcuts',
    quickReference: [
      {
        section: 'setup',
        usage: 'filter save <name> [args...]',
        description: 'Save a command shortcut',
      },
      { section: 'read', usage: 'filter list', description: 'List saved shortcuts' },
      { section: 'read', usage: 'filter run <name>', description: 'Run a saved shortcut' },
    ],
  },
  {
    name: 'favorite',
    description: 'Manage local favorites (sprint folders, spaces, lists, etc.)',
    quickReference: [
      {
        section: 'configuration',
        usage: 'favorite add <type> <id> [alias]',
        description: 'Add a favorite',
      },
      {
        section: 'configuration',
        usage: 'favorite remove <alias>',
        description: 'Remove a favorite',
      },
      { section: 'read', usage: 'favorite list', description: 'List saved favorites' },
    ],
  },
  {
    name: 'list-comments',
    description: 'List comments on a list',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'list-comments <listId>',
        description: 'List comments on a list',
      },
    ],
  },
  {
    name: 'list-comment',
    description: 'Post a comment on a list',
    flags: ['-m', '--message', '--message-file', '--notify-all', '--mention', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'list-comment <listId>',
        description: 'Post a comment on a list',
      },
    ],
  },
  {
    name: 'view-comments',
    description: 'List comments on a view',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'view-comments <viewId>',
        description: 'List comments on a view',
      },
    ],
  },
  {
    name: 'view-comment',
    description: 'Post a comment on a view',
    flags: ['-m', '--message', '--message-file', '--notify-all', '--mention', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'view-comment <viewId>',
        description: 'Post a comment on a view',
      },
    ],
  },
  {
    name: 'webhook',
    description: 'Manage webhooks',
    quickReference: [
      { section: 'read', usage: 'webhook list', description: 'List webhooks' },
      {
        section: 'write',
        usage: 'webhook create',
        description: 'Create a webhook',
      },
      { section: 'write', usage: 'webhook update <webhookId>', description: 'Update a webhook' },
      { section: 'write', usage: 'webhook delete <webhookId>', description: 'Delete a webhook' },
    ],
  },
  {
    name: 'merge',
    description: 'Merge a task into another (source becomes subtask of target)',
    flags: ['--confirm', '--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'merge <sourceTaskId> <intoTaskId>',
        description: 'Merge a task into another',
      },
    ],
  },
  {
    name: 'shared',
    description: 'Show shared spaces, folders, and lists',
    flags: ['--json'],
    quickReference: [
      {
        section: 'read',
        usage: 'shared',
        description: 'Show shared spaces, folders, and lists',
      },
    ],
  },
  {
    name: 'chat',
    description: 'Chat channels and messaging',
    quickReference: [
      { section: 'read', usage: 'chat channels', description: 'List chat channels you follow' },
      {
        section: 'read',
        usage: 'chat channel <channelId>',
        description: 'Show channel details',
      },
      {
        section: 'write',
        usage: 'chat send <channelId>',
        description: 'Send a message to a channel',
      },
      {
        section: 'read',
        usage: 'chat messages <channelId>',
        description: 'List recent messages in a channel',
      },
      {
        section: 'write',
        usage: 'chat channel-create <name>',
        description: 'Create a new chat channel',
      },
      { section: 'write', usage: 'chat dm <userIds...>', description: 'Create or open a DM' },
      {
        section: 'write',
        usage: 'chat channel-update <channelId>',
        description: 'Update a channel',
      },
      {
        section: 'write',
        usage: 'chat channel-delete <channelId>',
        description: 'Delete a channel',
      },
      {
        section: 'read',
        usage: 'chat members <channelId>',
        description: 'List channel members',
      },
      {
        section: 'read',
        usage: 'chat followers <channelId>',
        description: 'List channel followers',
      },
      {
        section: 'write',
        usage: 'chat reply <messageId>',
        description: 'Reply to a message',
      },
      {
        section: 'read',
        usage: 'chat replies <messageId>',
        description: 'List replies to a message',
      },
      {
        section: 'write',
        usage: 'chat react <messageId>',
        description: 'Add a reaction to a message',
      },
      {
        section: 'write',
        usage: 'chat unreact <messageId>',
        description: 'Remove a reaction from a message',
      },
      {
        section: 'read',
        usage: 'chat reactions <messageId>',
        description: 'List reactions on a message',
      },
      {
        section: 'write',
        usage: 'chat message-update <messageId>',
        description: 'Edit a message',
      },
      {
        section: 'write',
        usage: 'chat message-delete <messageId>',
        description: 'Delete a message',
      },
    ],
  },
  {
    name: 'profile',
    description: 'Manage profiles',
    quickReference: [
      { section: 'configuration', usage: 'profile', description: 'Manage profiles' },
    ],
  },
  {
    name: 'config',
    description: 'Manage CLI configuration',
    quickReference: [
      { section: 'configuration', usage: 'config', description: 'Manage CLI configuration' },
    ],
  },
  {
    name: 'completion',
    description: 'Output shell completion script (bash, zsh, fish)',
    quickReference: [
      {
        section: 'configuration',
        usage: 'completion <shell>',
        description: 'Output shell completion script',
      },
    ],
  },
] as const satisfies readonly CommandMetadata[]

export function parseCommandFlags(flags: readonly string[] = []): CommandFlagDefinition[] {
  const parsed: CommandFlagDefinition[] = []

  for (const flag of flags) {
    if (flag.startsWith('--')) {
      const previous = parsed.at(-1)
      if (previous && previous.long === '') {
        previous.long = flag
      } else {
        parsed.push({ long: flag })
      }
      continue
    }

    parsed.push({ short: flag, long: '' })
  }

  return parsed.map(flag => ({
    short: flag.short,
    long: flag.long,
  }))
}

function commandDescription(command: CommandMetadata, programName = 'cup'): string {
  if (command.name === 'init') {
    return `Set up ${programName} (interactive). Use --token and --team for non-interactive/agent setup`
  }

  return command.description
}

export function topLevelCommandDefinitions(programName = 'cup'): Array<{
  name: string
  description: string
  flags: CommandFlagDefinition[]
}> {
  return commandMetadata.map(command => ({
    name: command.name,
    description: commandDescription(command, programName),
    flags: parseCommandFlags('flags' in command ? command.flags : []),
  }))
}

const quickReferenceOrder: readonly QuickReferenceSection[] = [
  'setup',
  'read',
  'write',
  'configuration',
]

const quickReferenceStartMarker = '<!-- quick-reference:start -->'
const quickReferenceEndMarker = '<!-- quick-reference:end -->'

function quickReferenceEntries(): QuickReferenceEntry[] {
  return commandMetadata.flatMap(command => [...(command.quickReference ?? [])])
}

function pad(value: string, width: number): string {
  return value.padEnd(width, ' ')
}

export function topLevelCommandNames(): string[] {
  return commandMetadata.map(command => command.name)
}

export function renderQuickReferenceSection(programName = 'cup'): string {
  const entries = quickReferenceEntries()
  const renderedEntries = entries.map(entry => ({
    section: entry.section,
    command: `\`${programName} ${entry.usage}\``,
    description: entry.description,
  }))

  const commandWidth = Math.max(
    'Command'.length,
    ...renderedEntries.map(entry => entry.command.length),
    9,
  )
  const descriptionWidth = Math.max(
    'Description'.length,
    ...renderedEntries.map(entry => entry.description.length),
    11,
  )

  const lines = [
    '## Quick Reference',
    '',
    `| ${pad('Command', commandWidth)} | ${pad('Description', descriptionWidth)} |`,
    `| ${'-'.repeat(commandWidth)} | ${'-'.repeat(descriptionWidth)} |`,
  ]

  for (const section of quickReferenceOrder) {
    const sectionEntries = renderedEntries.filter(entry => entry.section === section)
    if (sectionEntries.length === 0) {
      continue
    }

    if (section !== 'setup') {
      const label = `**${section[0]?.toUpperCase() ?? ''}${section.slice(1)}**`
      lines.push(`| ${pad(label, commandWidth)} | ${pad('', descriptionWidth)} |`)
    }

    for (const entry of sectionEntries) {
      lines.push(
        `| ${pad(entry.command, commandWidth)} | ${pad(entry.description, descriptionWidth)} |`,
      )
    }
  }

  return lines.join('\n')
}

export function syncQuickReferenceSection(document: string, programName = 'cup'): string {
  const start = document.indexOf(quickReferenceStartMarker)
  const end = document.indexOf(quickReferenceEndMarker)

  if (start === -1 || end === -1 || end < start) {
    throw new Error('Quick reference markers are missing or out of order in docs/commands.md')
  }

  const replacement = [
    quickReferenceStartMarker,
    '',
    renderQuickReferenceSection(programName),
    '',
    quickReferenceEndMarker,
  ].join('\n')

  return `${document.slice(0, start)}${replacement}${document.slice(end + quickReferenceEndMarker.length)}`
}
