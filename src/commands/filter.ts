import { spawnSync } from 'child_process'
import type { FilterEntry, FiltersMap } from '../config.js'
import { formatTable, isTTY } from '../output.js'
import type { Column } from '../output.js'

export const ALLOWED_FILTER_COMMANDS = new Set([
  'tasks',
  'search',
  'sprint',
  'assigned',
  'overdue',
  'inbox',
  'summary',
  'views',
  'lists',
  'spaces',
  'folders',
  'members',
  'tags',
  'goals',
  'key-results',
  'task-types',
  'templates',
  'list-templates',
  'folder-templates',
  'docs',
])

export function isAllowedFilterCommand(tokens: string[]): boolean {
  if (tokens.length === 0) return false
  if (tokens[0] === 'time' && tokens[1] === 'list') return true
  return ALLOWED_FILTER_COMMANDS.has(tokens[0]!)
}

export function runFilter(_name: string, entry: FilterEntry): void {
  const result = spawnSync(process.execPath, [process.argv[1]!, ...entry.command], {
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== null && result.status !== 0) {
    process.exitCode = result.status
  }
}

interface FilterRow {
  name: string
  command: string
  description: string
}

const FILTER_COLUMNS: Column<FilterRow>[] = [
  { key: 'name', label: 'NAME', maxWidth: 30 },
  { key: 'command', label: 'COMMAND', maxWidth: 60 },
  { key: 'description', label: 'DESCRIPTION', maxWidth: 50 },
]

export function formatFiltersTable(filters: FiltersMap): string {
  const entries = Object.entries(filters)
  if (entries.length === 0) return 'No filters saved'
  const rows: FilterRow[] = entries.map(([name, entry]) => ({
    name,
    command: entry.command.join(' '),
    description: entry.description ?? '',
  }))
  return formatTable(rows, FILTER_COLUMNS)
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|')
}

export function formatFiltersMarkdown(filters: FiltersMap): string {
  const entries = Object.entries(filters)
  if (entries.length === 0) return 'No filters saved'
  const lines = ['| Name | Command | Description |', '| --- | --- | --- |']
  for (const [name, entry] of entries) {
    const command = escapeMarkdownCell(entry.command.join(' '))
    const description = escapeMarkdownCell(entry.description ?? '')
    lines.push(`| ${escapeMarkdownCell(name)} | ${command} | ${description} |`)
  }
  return lines.join('\n')
}

export function formatFilterDetail(name: string, entry: FilterEntry): string {
  if (isTTY()) {
    const lines = [`Name:    ${name}`, `Command: ${entry.command.join(' ')}`]
    if (entry.description) lines.push(`Description: ${entry.description}`)
    return lines.join('\n')
  }
  const lines = [`**${name}**`, ``, `Command: \`${entry.command.join(' ')}\``]
  if (entry.description) lines.push(`Description: ${entry.description}`)
  return lines.join('\n')
}
