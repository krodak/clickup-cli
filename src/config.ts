import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Config {
  apiToken: string
  teamId: string
}

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return join(xdg, 'cu')
  return join(homedir(), '.config', 'cu')
}

function configPath(): string {
  return join(configDir(), 'config.json')
}

export function loadConfig(): Config {
  const envToken = process.env.CU_API_TOKEN?.trim()
  const envTeamId = process.env.CU_TEAM_ID?.trim()

  let fileToken: string | undefined
  let fileTeamId: string | undefined

  const path = configPath()
  if (fs.existsSync(path)) {
    const raw = fs.readFileSync(path, 'utf-8')
    let parsed: Partial<Config>
    try {
      parsed = JSON.parse(raw) as Partial<Config>
    } catch {
      throw new Error(`Config file at ${path} contains invalid JSON. Please check the file syntax.`)
    }
    fileToken = parsed.apiToken?.trim()
    fileTeamId = parsed.teamId?.trim()
  }

  const apiToken = envToken || fileToken
  if (!apiToken) {
    throw new Error('Config missing required field: apiToken.\nSet CU_API_TOKEN or run: cu init')
  }
  if (!apiToken.startsWith('pk_')) {
    throw new Error('Config apiToken must start with pk_. The configured token does not.')
  }

  const teamId = envTeamId || fileTeamId
  if (!teamId) {
    throw new Error('Config missing required field: teamId.\nSet CU_TEAM_ID or run: cu init')
  }

  return { apiToken, teamId }
}

export function getConfigPath(): string {
  return configPath()
}

export function writeConfig(config: Config): void {
  const dir = configDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8')
}
