import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Config {
  apiToken: string
  teamId: string
  lists: string[]
}

const CONFIG_PATH = join(homedir(), '.config', 'cu', 'config.json')

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found at ${CONFIG_PATH}.\nCreate it with:\n{\n  "apiToken": "pk_...",\n  "teamId": "...",\n  "lists": ["list_id_1", "list_id_2"]\n}`
    )
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<Config>

  if (!parsed.apiToken) throw new Error('Config missing required field: apiToken')
  if (!parsed.teamId) throw new Error('Config missing required field: teamId')
  if (!parsed.lists) throw new Error('Config missing required field: lists')

  return {
    apiToken: parsed.apiToken,
    teamId: parsed.teamId,
    lists: parsed.lists
  }
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
