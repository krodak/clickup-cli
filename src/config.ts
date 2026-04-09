import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface FilterEntry {
  command: string[]
  description?: string
}

export type FiltersMap = Record<string, FilterEntry>

export type FavoriteType = 'sprint-folder' | 'space' | 'list' | 'folder' | 'view' | 'task'

const VALID_FAVORITE_TYPES: ReadonlySet<FavoriteType> = new Set<FavoriteType>([
  'sprint-folder',
  'space',
  'list',
  'folder',
  'view',
  'task',
])

export interface FavoriteEntry {
  type: FavoriteType
  id: string
  name?: string
}

export type FavoritesMap = Record<string, FavoriteEntry>

export interface Config {
  apiToken: string
  teamId: string
  sprintFolderId?: string
}

export interface ProfileData {
  apiToken?: string
  teamId?: string
  sprintFolderId?: string
  filters?: FiltersMap
  favorites?: FavoritesMap
}

export interface MultiProfileConfig {
  defaultProfile: string
  profiles: Record<string, ProfileData>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFilterEntry(v: unknown): v is FilterEntry {
  if (!isRecord(v)) return false
  if (!Array.isArray(v.command)) return false
  if (!v.command.every(c => typeof c === 'string')) return false
  if (v.description !== undefined && typeof v.description !== 'string') return false
  return true
}

function parseFiltersMap(raw: unknown): FiltersMap {
  if (!isRecord(raw)) return {}
  const out: FiltersMap = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isFilterEntry(value)) out[key] = value
  }
  return out
}

function isFavoriteEntry(v: unknown): v is FavoriteEntry {
  if (!isRecord(v)) return false
  if (typeof v.type !== 'string') return false
  if (!VALID_FAVORITE_TYPES.has(v.type as FavoriteType)) return false
  if (typeof v.id !== 'string') return false
  if (v.name !== undefined && typeof v.name !== 'string') return false
  return true
}

function parseFavoritesMap(raw: unknown): FavoritesMap {
  if (!isRecord(raw)) return {}
  const out: FavoritesMap = {}
  for (const [key, value] of Object.entries(raw)) {
    if (isFavoriteEntry(value)) out[key] = value
  }
  return out
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
): ProfileData {
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

function migrateToMultiProfile(
  parsed: Record<string, unknown>,
  filePath: string,
): MultiProfileConfig {
  if (typeof parsed.apiToken === 'string' && !parsed.profiles) {
    const profile: ProfileData = {}
    const token = trimConfigValue(parsed.apiToken)
    if (token) profile.apiToken = token
    const team = typeof parsed.teamId === 'string' ? trimConfigValue(parsed.teamId) : undefined
    if (team) profile.teamId = team
    const sprint =
      typeof parsed.sprintFolderId === 'string' ? trimConfigValue(parsed.sprintFolderId) : undefined
    if (sprint) profile.sprintFolderId = sprint
    const migrated: MultiProfileConfig = {
      defaultProfile: 'default',
      profiles: { default: profile },
    }
    const dir = configDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    }
    fs.writeFileSync(join(dir, 'config.json'), JSON.stringify(migrated, null, 2) + '\n', {
      encoding: 'utf-8',
      mode: 0o600,
    })
    return migrated
  }

  if (isRecord(parsed.profiles)) {
    const profiles: Record<string, ProfileData> = {}
    for (const [name, value] of Object.entries(parsed.profiles)) {
      if (isRecord(value)) {
        const p: ProfileData = {}
        if (typeof value.apiToken === 'string' && value.apiToken.trim())
          p.apiToken = value.apiToken.trim()
        if (typeof value.teamId === 'string' && value.teamId.trim()) p.teamId = value.teamId.trim()
        if (typeof value.sprintFolderId === 'string' && value.sprintFolderId.trim())
          p.sprintFolderId = value.sprintFolderId.trim()
        if (value.filters !== undefined) p.filters = parseFiltersMap(value.filters)
        if (value.favorites !== undefined) p.favorites = parseFavoritesMap(value.favorites)
        profiles[name] = p
      }
    }
    return {
      defaultProfile: typeof parsed.defaultProfile === 'string' ? parsed.defaultProfile : '',
      profiles,
    }
  }

  throw new Error(`Config file at ${filePath} has unrecognized format.`)
}

function parseRawConfig(filePath: string): { parsed: Record<string, unknown>; raw: string } {
  const raw = fs.readFileSync(filePath, 'utf-8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      `Config file at ${filePath} contains invalid JSON. Please check the file syntax.`,
    )
  }
  if (!isRecord(parsed)) {
    throw new Error(`Config file at ${filePath} must contain a JSON object.`)
  }
  return { parsed, raw }
}

function isOldFormat(parsed: Record<string, unknown>): boolean {
  return typeof parsed.apiToken === 'string' && !parsed.profiles
}

export function loadConfig(profileName?: string): Config {
  migrateFromLegacy()
  const envToken = process.env.CU_API_TOKEN?.trim()
  const envTeamId = process.env.CU_TEAM_ID?.trim()

  if (envToken && envTeamId) {
    if (!envToken.startsWith('pk_')) {
      throw new Error('CU_API_TOKEN must start with pk_.')
    }
    return { apiToken: envToken, teamId: envTeamId }
  }

  const path = configPath()
  if (!fs.existsSync(path)) {
    if (envToken || envTeamId) {
      throw new Error('Both CU_API_TOKEN and CU_TEAM_ID must be set, or run: cup init')
    }
    throw new Error(
      'No ClickUp CLI configuration found.\n\n' +
        'To get started:\n' +
        '  cup init\n\n' +
        'For scripts or AI agents:\n' +
        '  cup init --token pk_YOUR_TOKEN --team YOUR_TEAM_ID\n\n' +
        'Get your API token: https://app.clickup.com/settings/apps',
    )
  }

  const { parsed } = parseRawConfig(path)

  if (isOldFormat(parsed)) {
    const fileConfig = parseConfigFile(JSON.stringify(parsed), path, true)
    const apiToken = envToken ?? fileConfig.apiToken
    if (!apiToken) {
      throw new Error('Config missing required field: apiToken.\nSet CU_API_TOKEN or run: cup init')
    }
    if (!apiToken.startsWith('pk_')) {
      throw new Error('Config apiToken must start with pk_. The configured token does not.')
    }
    const teamId = envTeamId ?? fileConfig.teamId
    if (!teamId) {
      throw new Error('Config missing required field: teamId.\nSet CU_TEAM_ID or run: cup init')
    }

    migrateToMultiProfile(parsed, path)

    return {
      apiToken,
      teamId,
      ...(fileConfig.sprintFolderId ? { sprintFolderId: fileConfig.sprintFolderId } : {}),
    }
  }

  const multi = loadMultiProfileConfig()

  const resolvedProfile = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile
  if (!resolvedProfile) {
    throw new Error('No default profile set. Run: cup profile use <name>')
  }

  const profile = multi.profiles[resolvedProfile]
  if (!profile) {
    const available = Object.keys(multi.profiles).join(', ')
    throw new Error(`Profile "${resolvedProfile}" not found. Available: ${available}`)
  }

  const apiToken = envToken ?? profile.apiToken?.trim()
  if (!apiToken) {
    throw new Error(
      `Profile "${resolvedProfile}" missing apiToken. Run: cup profile add ${resolvedProfile}`,
    )
  }
  if (!apiToken.startsWith('pk_')) {
    throw new Error('Config apiToken must start with pk_. The configured token does not.')
  }

  const teamId = envTeamId ?? profile.teamId?.trim()
  if (!teamId) {
    throw new Error(`Profile "${resolvedProfile}" missing teamId.`)
  }

  return {
    apiToken,
    teamId,
    ...(profile.sprintFolderId ? { sprintFolderId: profile.sprintFolderId } : {}),
  }
}

export function loadMultiProfileConfig(): MultiProfileConfig {
  migrateFromLegacy()
  const path = configPath()
  if (!fs.existsSync(path)) {
    return { defaultProfile: '', profiles: {} }
  }
  let parsed: unknown
  try {
    const raw = fs.readFileSync(path, 'utf-8')
    parsed = JSON.parse(raw)
  } catch {
    return { defaultProfile: '', profiles: {} }
  }
  if (!isRecord(parsed)) return { defaultProfile: '', profiles: {} }
  if (isOldFormat(parsed)) {
    return migrateToMultiProfile(parsed, path)
  }
  return migrateToMultiProfile(parsed, path)
}

export function saveMultiProfileConfig(config: MultiProfileConfig): void {
  const dir = configDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  fs.writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n', {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

export function addProfile(name: string, profile: ProfileData): void {
  const multi = loadMultiProfileConfig()
  multi.profiles[name] = profile
  if (!multi.defaultProfile) multi.defaultProfile = name
  saveMultiProfileConfig(multi)
}

export function removeProfile(name: string): void {
  const multi = loadMultiProfileConfig()
  if (!multi.profiles[name]) {
    throw new Error(`Profile "${name}" not found.`)
  }
  const keys = Object.keys(multi.profiles)
  if (keys.length <= 1) {
    throw new Error('Cannot remove the last profile.')
  }
  delete multi.profiles[name]
  if (multi.defaultProfile === name) {
    multi.defaultProfile = Object.keys(multi.profiles)[0] ?? ''
  }
  saveMultiProfileConfig(multi)
}

export function setDefaultProfile(name: string): void {
  const multi = loadMultiProfileConfig()
  if (!multi.profiles[name]) {
    const available = Object.keys(multi.profiles).join(', ')
    throw new Error(`Profile "${name}" not found. Available: ${available}`)
  }
  multi.defaultProfile = name
  saveMultiProfileConfig(multi)
}

export function listProfiles(): Array<{ name: string; isDefault: boolean; teamId?: string }> {
  const multi = loadMultiProfileConfig()
  return Object.entries(multi.profiles).map(([name, profile]) => ({
    name,
    isDefault: name === multi.defaultProfile,
    teamId: profile.teamId,
  }))
}

export function loadRawConfig(profileName?: string): ProfileData {
  migrateFromLegacy()
  const path = configPath()
  if (!fs.existsSync(path)) return {}

  let parsed: unknown
  try {
    const raw = fs.readFileSync(path, 'utf-8')
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!isRecord(parsed)) {
    throw new Error(`Config file at ${path} must contain a JSON object.`)
  }

  if (isOldFormat(parsed)) {
    return parseConfigFile(JSON.stringify(parsed), path, false, true)
  }

  const multi = migrateToMultiProfile(parsed, path)
  const name = profileName || multi.defaultProfile || 'default'
  return multi.profiles[name] ?? {}
}

export function getConfigPath(): string {
  migrateFromLegacy()
  return configPath()
}

export function getFilters(profileName?: string): FiltersMap {
  const multi = loadMultiProfileConfig()
  const name = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile
  const profile = name ? (multi.profiles[name] ?? {}) : {}
  return profile.filters ?? {}
}

export function saveFilter(name: string, entry: FilterEntry, profileName?: string): void {
  const multi = loadMultiProfileConfig()
  const pName = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile ?? 'default'
  const profile = multi.profiles[pName] ?? {}
  const filters: FiltersMap = { ...(profile.filters ?? {}), [name]: entry }
  multi.profiles[pName] = { ...profile, filters }
  if (!multi.defaultProfile) multi.defaultProfile = pName
  saveMultiProfileConfig(multi)
}

export function deleteFilter(name: string, profileName?: string): void {
  const multi = loadMultiProfileConfig()
  const pName = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile ?? 'default'
  const profile = multi.profiles[pName] ?? {}
  const filters: FiltersMap = { ...(profile.filters ?? {}) }
  if (!(name in filters)) {
    throw new Error(`Filter "${name}" not found.`)
  }
  delete filters[name]
  multi.profiles[pName] = { ...profile, filters }
  saveMultiProfileConfig(multi)
}

export function getFavorites(profileName?: string): FavoritesMap {
  const multi = loadMultiProfileConfig()
  const name = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile
  const profile = name ? (multi.profiles[name] ?? {}) : {}
  return profile.favorites ?? {}
}

export function saveFavorite(alias: string, entry: FavoriteEntry, profileName?: string): void {
  const multi = loadMultiProfileConfig()
  const pName = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile ?? 'default'
  const profile = multi.profiles[pName] ?? {}
  const favorites: FavoritesMap = { ...(profile.favorites ?? {}), [alias]: entry }
  multi.profiles[pName] = { ...profile, favorites }
  if (!multi.defaultProfile) multi.defaultProfile = pName
  saveMultiProfileConfig(multi)
}

export function deleteFavorite(alias: string, profileName?: string): void {
  const multi = loadMultiProfileConfig()
  const pName = profileName ?? process.env.CU_PROFILE?.trim() ?? multi.defaultProfile ?? 'default'
  const profile = multi.profiles[pName] ?? {}
  const favorites: FavoritesMap = { ...(profile.favorites ?? {}) }
  if (!(alias in favorites)) {
    throw new Error(`Favorite "${alias}" not found.`)
  }
  delete favorites[alias]
  multi.profiles[pName] = { ...profile, favorites }
  saveMultiProfileConfig(multi)
}

export function writeConfig(config: ProfileData, profileName?: string): void {
  const multi = loadMultiProfileConfig()
  const name = profileName || multi.defaultProfile || 'default'

  const apiToken = trimConfigValue(config.apiToken) ?? undefined
  const teamId = trimConfigValue(config.teamId) ?? undefined
  const sprintFolderId = trimConfigValue(config.sprintFolderId)
  const normalizedConfig: ProfileData = {
    ...(apiToken ? { apiToken } : {}),
    ...(teamId ? { teamId } : {}),
    ...(sprintFolderId ? { sprintFolderId } : {}),
  }

  multi.profiles[name] = {
    ...multi.profiles[name],
    ...normalizedConfig,
  }
  if (!multi.defaultProfile) multi.defaultProfile = name
  saveMultiProfileConfig(multi)
}
