import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Config {
  apiToken: string
  teamId: string
  sprintFolderId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readConfigString(
  parsed: Record<string, unknown>,
  key: keyof Config,
  path: string,
  strict: boolean,
): string | undefined {
  const value = parsed[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    if (strict) {
      throw new Error(`Config field ${key} must be a string in ${path}.`)
    }
    return undefined
  }
  const trimmed = value.trim()
  return trimmed || undefined
}

function parseConfigFile(
  raw: string,
  path: string,
  strictFields: boolean,
  strictRoot = strictFields,
): Partial<Config> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    if (strictRoot) {
      throw new Error(`Config file at ${path} contains invalid JSON. Please check the file syntax.`)
    }
    return {}
  }

  if (!isRecord(parsed)) {
    if (strictRoot) {
      throw new Error(`Config file at ${path} must contain a JSON object.`)
    }
    return {}
  }

  const apiToken = readConfigString(parsed, 'apiToken', path, strictFields)
  const teamId = readConfigString(parsed, 'teamId', path, strictFields)
  const sprintFolderId = readConfigString(parsed, 'sprintFolderId', path, strictFields)

  return {
    ...(apiToken ? { apiToken } : {}),
    ...(teamId ? { teamId } : {}),
    ...(sprintFolderId ? { sprintFolderId } : {}),
  }
}

function trimConfigValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return join(xdg, 'cup')
  return join(homedir(), '.config', 'cup')
}

function legacyConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  if (xdg) return join(xdg, 'cu')
  return join(homedir(), '.config', 'cu')
}

let migrationChecked = false

function migrateFromLegacy(): void {
  if (migrationChecked) return
  migrationChecked = true
  const legacy = legacyConfigDir()
  const current = configDir()
  if (fs.existsSync(join(legacy, 'config.json')) && !fs.existsSync(join(current, 'config.json'))) {
    fs.mkdirSync(current, { recursive: true, mode: 0o700 })
    fs.copyFileSync(join(legacy, 'config.json'), join(current, 'config.json'))
  }
}

function configPath(): string {
  return join(configDir(), 'config.json')
}

export function loadConfig(): Config {
  migrateFromLegacy()
  const envToken = process.env.CU_API_TOKEN?.trim()
  const envTeamId = process.env.CU_TEAM_ID?.trim()

  let fileToken: string | undefined
  let fileTeamId: string | undefined
  let fileSprintFolderId: string | undefined

  const path = configPath()
  if (fs.existsSync(path)) {
    const raw = fs.readFileSync(path, 'utf-8')
    const parsed = parseConfigFile(raw, path, true)
    fileToken = parsed.apiToken
    fileTeamId = parsed.teamId
    fileSprintFolderId = parsed.sprintFolderId
  }

  const apiToken = envToken || fileToken
  if (!apiToken) {
    throw new Error('Config missing required field: apiToken.\nSet CU_API_TOKEN or run: cup init')
  }
  if (!apiToken.startsWith('pk_')) {
    throw new Error('Config apiToken must start with pk_. The configured token does not.')
  }

  const teamId = envTeamId || fileTeamId
  if (!teamId) {
    throw new Error('Config missing required field: teamId.\nSet CU_TEAM_ID or run: cup init')
  }

  return { apiToken, teamId, ...(fileSprintFolderId ? { sprintFolderId: fileSprintFolderId } : {}) }
}

export function loadRawConfig(): Partial<Config> {
  migrateFromLegacy()
  const path = configPath()
  if (!fs.existsSync(path)) return {}
  return parseConfigFile(fs.readFileSync(path, 'utf-8'), path, false, true)
}

export function getConfigPath(): string {
  migrateFromLegacy()
  return configPath()
}

export function writeConfig(config: Partial<Config>): void {
  const dir = configDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  const filePath = join(dir, 'config.json')
  const apiToken = trimConfigValue(config.apiToken) ?? ''
  const teamId = trimConfigValue(config.teamId) ?? ''
  const sprintFolderId = trimConfigValue(config.sprintFolderId)
  const normalizedConfig: Partial<Config> = {
    ...(apiToken ? { apiToken } : {}),
    ...(teamId ? { teamId } : {}),
    ...(sprintFolderId ? { sprintFolderId } : {}),
  }
  fs.writeFileSync(filePath, JSON.stringify(normalizedConfig, null, 2) + '\n', {
    encoding: 'utf-8',
    mode: 0o600,
  })
}
