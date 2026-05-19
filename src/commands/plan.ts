import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { WorkspacePlan } from '../api.js'
import type { Config } from '../config.js'

export async function getWorkspacePlanCommand(config: Config): Promise<WorkspacePlan> {
  const client = new ClickUpClient(config)
  return client.getWorkspacePlan()
}

export function formatPlan(plan: WorkspacePlan): string {
  return [
    `${chalk.bold('Plan:')}    ${plan.name}`,
    `${chalk.bold('Plan ID:')} ${plan.plan_id}`,
  ].join('\n')
}

export function formatPlanMarkdown(plan: WorkspacePlan): string {
  return [`**Plan:** ${plan.name}`, `**Plan ID:** ${plan.plan_id}`].join('\n')
}
