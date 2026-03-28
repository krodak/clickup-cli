import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Goal, KeyResult } from '../api.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'
import { formatDateISO } from '../date.js'

interface GoalRow {
  name: string
  id: string
  progress: string
  owner: string
  due_date: string
}

interface KeyResultRow {
  name: string
  id: string
  progress: string
  current: string
}

export function colorProgress(value: string): string {
  const num = parseInt(value, 10)
  if (isNaN(num)) return value
  if (num >= 75) return chalk.green(value)
  if (num >= 25) return chalk.yellow(value)
  return chalk.red(value)
}

const GOAL_COLUMNS: Column<GoalRow>[] = [
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'name', label: 'Name', maxWidth: 40 },
  { key: 'progress', label: 'Progress', maxWidth: 10, format: v => colorProgress(v) },
  { key: 'owner', label: 'Owner', maxWidth: 20 },
  { key: 'due_date', label: 'Due', maxWidth: 12 },
]

const KEY_RESULT_COLUMNS: Column<KeyResultRow>[] = [
  { key: 'id', label: 'ID', maxWidth: 15 },
  { key: 'name', label: 'Name', maxWidth: 40 },
  { key: 'progress', label: 'Progress', maxWidth: 10, format: v => colorProgress(v) },
  { key: 'current', label: 'Current/Target', maxWidth: 15 },
]

export async function listGoals(config: Config): Promise<Goal[]> {
  const client = new ClickUpClient(config)
  return client.getGoals(config.teamId)
}

export async function createGoal(
  config: Config,
  name: string,
  opts?: { description?: string; dueDate?: string; color?: string },
): Promise<Goal> {
  const client = new ClickUpClient(config)
  return client.createGoal(config.teamId, name, opts)
}

export async function updateGoal(
  config: Config,
  goalId: string,
  updates: { name?: string; description?: string; color?: string },
): Promise<Goal> {
  const client = new ClickUpClient(config)
  return client.updateGoal(goalId, updates)
}

export async function deleteGoal(config: Config, goalId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteGoal(goalId)
}

export async function deleteKeyResult(config: Config, keyResultId: string): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteKeyResult(keyResultId)
}

export async function listKeyResults(config: Config, goalId: string): Promise<KeyResult[]> {
  const client = new ClickUpClient(config)
  return client.getKeyResults(goalId)
}

export async function createKeyResult(
  config: Config,
  goalId: string,
  name: string,
  type: string,
  target: number,
): Promise<KeyResult> {
  const client = new ClickUpClient(config)
  return client.createKeyResult(goalId, name, type, target)
}

export async function updateKeyResult(
  config: Config,
  keyResultId: string,
  updates: { progress?: number; note?: string },
): Promise<KeyResult> {
  const client = new ClickUpClient(config)
  return client.updateKeyResult(keyResultId, {
    steps_current: updates.progress,
    note: updates.note,
  })
}

export function formatGoals(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals found'
  const rows: GoalRow[] = goals.map(g => ({
    name: g.name,
    id: g.id,
    progress: `${Math.round(g.percent_completed * 100)}%`,
    owner: g.owner ? `@${g.owner.username}` : '',
    due_date: g.due_date ? formatDateISO(g.due_date) : '',
  }))
  return formatTable(rows, GOAL_COLUMNS)
}

export function formatGoalsMarkdown(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals found'
  return goals
    .map(g => {
      const pct = Math.round(g.percent_completed * 100)
      const owner = g.owner ? ` - @${g.owner.username}` : ''
      const due = g.due_date ? ` - due ${formatDateISO(g.due_date)}` : ''
      return `- **${g.name}** (${g.id}) - ${pct}%${owner}${due}`
    })
    .join('\n')
}

export function formatKeyResults(keyResults: KeyResult[]): string {
  if (keyResults.length === 0) return 'No key results found'
  const rows: KeyResultRow[] = keyResults.map(kr => ({
    name: kr.name,
    id: kr.id,
    progress: `${Math.round(kr.percent_completed * 100)}%`,
    current: `${kr.steps_current}/${kr.steps_end}`,
  }))
  return formatTable(rows, KEY_RESULT_COLUMNS)
}

export function formatKeyResultsMarkdown(keyResults: KeyResult[]): string {
  if (keyResults.length === 0) return 'No key results found'
  return keyResults
    .map(kr => {
      const pct = Math.round(kr.percent_completed * 100)
      return `- **${kr.name}** (${kr.id}) - ${kr.steps_current}/${kr.steps_end} (${pct}%)`
    })
    .join('\n')
}
