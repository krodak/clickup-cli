import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Config {
  apiToken: string
  teamId?: string
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
  let parsed: Partial<Config>
  try {
    parsed = JSON.parse(raw) as Partial<Config>
  } catch {
    throw new Error(`Config file at ${CONFIG_PATH} contains invalid JSON. Please check the file syntax.`)
  }

  const apiToken = parsed.apiToken?.trim()
  if (!apiToken) throw new Error('Config missing required field: apiToken')
  if (!apiToken.startsWith('pk_')) {
    throw new Error('Config apiToken must start with pk_ (found: ' + apiToken.slice(0, 8) + '...)')
  }

  if (!parsed.lists || !Array.isArray(parsed.lists) || parsed.lists.length === 0) {
    throw new Error('Config missing required field: lists (must be a non-empty array of list IDs)')
  }

  return {
    apiToken,
    ...(parsed.teamId ? { teamId: parsed.teamId } : {}),
    lists: parsed.lists
  }
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
