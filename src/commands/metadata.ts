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
    description: 'Set up cup for the first time',
    quickReference: [{ section: 'setup', usage: 'init', description: 'First-time setup wizard' }],
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
    description: 'List tasks assigned to me',
    flags: ['--status', '--list', '--space', '--name', '--type', '--include-closed', '--json'],
    quickReference: [{ section: 'read', usage: 'tasks', description: 'List tasks assigned to me' }],
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
      '-s',
      '--status',
      '--priority',
      '--due-date',
      '--time-estimate',
      '--assignee',
      '--parent',
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
      '-p',
      '--parent',
      '-s',
      '--status',
      '--priority',
      '--due-date',
      '--assignee',
      '--tags',
      '--custom-item-id',
      '--time-estimate',
      '--template',
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
    flags: ['-m', '--message', '--notify-all', '--json'],
    quickReference: [
      { section: 'write', usage: 'comment <taskId>', description: 'Post a comment on a task' },
    ],
  },
  {
    name: 'comment-edit',
    description: 'Edit an existing comment',
    flags: ['-m', '--message', '--resolved', '--unresolved', '--json'],
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
    description: 'Delete a comment',
    flags: ['--json'],
    quickReference: [
      {
        section: 'write',
        usage: 'comment-delete <commentId>',
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
    flags: ['-m', '--message', '--notify-all', '--json'],
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
    flags: ['--name', '--json'],
    quickReference: [
      { section: 'read', usage: 'lists <spaceId>', description: 'List all lists in a space' },
    ],
  },
  {
    name: 'spaces',
    description: 'List spaces in your workspace',
    flags: ['--name', '--my', '--json'],
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
    description: 'Search my tasks by name',
    flags: ['--status', '--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'search <query>', description: 'Search my tasks by name' },
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
    flags: ['--include-closed', '--json'],
    quickReference: [
      { section: 'read', usage: 'overdue', description: 'Tasks past their due date' },
    ],
  },
  {
    name: 'assign',
    description: 'Assign or unassign users from a task',
    flags: ['--to', '--remove', '--json'],
    quickReference: [
      { section: 'write', usage: 'assign <taskId>', description: 'Assign or unassign users' },
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
    flags: ['--set', '--remove', '--json'],
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
      { section: 'write', usage: 'time list', description: 'List recent time entries' },
      { section: 'write', usage: 'time update <timeEntryId>', description: 'Update a time entry' },
      { section: 'write', usage: 'time delete <timeEntryId>', description: 'Delete a time entry' },
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
    flags: ['--name', '--json'],
    quickReference: [
      { section: 'read', usage: 'folders <spaceId>', description: 'List folders in a space' },
    ],
  },
  {
    name: 'members',
    description: 'List workspace members',
    flags: ['--json'],
    quickReference: [{ section: 'read', usage: 'members', description: 'List workspace members' }],
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
    flags: ['-d', '--description', '--color', '--json'],
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
    return `Set up ${programName} for the first time`
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
    renderQuickReferenceSection(programName),
    quickReferenceEndMarker,
  ].join('\n')

  return `${document.slice(0, start)}${replacement}${document.slice(end + quickReferenceEndMarker.length)}`
}
