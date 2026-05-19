import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { parseTimeEstimate } from './update.js'

interface TimeEstimateByUserOptions {
  replace?: boolean
}

export async function timeEstimateByUserCommand(
  config: Config,
  taskId: string,
  userId: string,
  duration: string,
  opts: TimeEstimateByUserOptions,
): Promise<{ total_time_estimate: number }> {
  const client = new ClickUpClient(config)
  const timeMs = parseTimeEstimate(duration)
  const estimates = [{ assignee: userId, time: timeMs }]

  if (opts.replace) {
    return client.replaceTimeEstimatesByUser(taskId, estimates)
  }
  return client.updateTimeEstimatesByUser(taskId, estimates)
}
