import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import type { Goal, KeyResult } from '../api.js'

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
  return goals
    .map(g => {
      const pct = Math.round(g.percent_completed * 100)
      const owner = g.owner ? ` ${chalk.dim(`@${g.owner.username}`)}` : ''
      return `${chalk.bold(g.name)} ${chalk.dim(`(${g.id})`)} ${chalk.cyan(`${pct}%`)}${owner}`
    })
    .join('\n')
}

export function formatGoalsMarkdown(goals: Goal[]): string {
  if (goals.length === 0) return 'No goals found'
  return goals
    .map(g => {
      const pct = Math.round(g.percent_completed * 100)
      const owner = g.owner ? ` - @${g.owner.username}` : ''
      return `- **${g.name}** (${g.id}) - ${pct}%${owner}`
    })
    .join('\n')
}

export function formatKeyResults(keyResults: KeyResult[]): string {
  if (keyResults.length === 0) return 'No key results found'
  return keyResults
    .map(kr => {
      const pct = Math.round(kr.percent_completed * 100)
      return `${chalk.bold(kr.name)} ${chalk.dim(`(${kr.id})`)} ${chalk.cyan(`${kr.steps_current}/${kr.steps_end}`)} ${chalk.dim(`${pct}%`)}`
    })
    .join('\n')
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
