import fs from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'

export interface Config {
  apiToken: string
  teamId: string
}

const CONFIG_PATH = join(homedir(), '.config', 'cu', 'config.json')

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found at ${CONFIG_PATH}.\nRun: cu init`)
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  let parsed: Partial<Config>
  try {
    parsed = JSON.parse(raw) as Partial<Config>
  } catch {
    throw new Error(
      `Config file at ${CONFIG_PATH} contains invalid JSON. Please check the file syntax.`,
    )
  }

  const apiToken = parsed.apiToken?.trim()
  if (!apiToken) throw new Error('Config missing required field: apiToken')
  if (!apiToken.startsWith('pk_')) {
    throw new Error('Config apiToken must start with pk_. The configured token does not.')
  }

  const teamId = parsed.teamId?.trim()
  if (!teamId) {
    throw new Error('Config missing required field: teamId. Run: cu init')
  }

  return { apiToken, teamId }
}

export function getConfigPath(): string {
  return CONFIG_PATH
}

export function writeConfig(config: Config): void {
  const dir = dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8')
}
