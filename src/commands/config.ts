import { loadRawConfig, writeConfig, getConfigPath } from '../config.js'
import type { Config } from '../config.js'

const VALID_KEYS: ReadonlySet<string> = new Set(['apiToken', 'teamId', 'sprintFolderId'])

function readStoredString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function assertValidKey(key: string): asserts key is keyof Config {
  if (!VALID_KEYS.has(key)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${[...VALID_KEYS].join(', ')}`)
  }
}

export function getConfigValue(key: string, profileName?: string): string | undefined {
  assertValidKey(key)
  const raw = loadRawConfig(profileName)
  return readStoredString(raw[key])
}

export function setConfigValue(key: string, value: string, profileName?: string): void {
  assertValidKey(key)
  const normalizedValue = readStoredString(value)

  if (key === 'apiToken' && (!normalizedValue || !normalizedValue.startsWith('pk_'))) {
    throw new Error('apiToken must start with pk_')
  }
  if (key === 'teamId' && !normalizedValue) {
    throw new Error('teamId must be non-empty')
  }

  const raw = loadRawConfig(profileName)
  const sprintFolderId = readStoredString(raw.sprintFolderId)
  const merged: Partial<Config> = {
    ...(readStoredString(raw.apiToken) ? { apiToken: readStoredString(raw.apiToken) } : {}),
    ...(readStoredString(raw.teamId) ? { teamId: readStoredString(raw.teamId) } : {}),
    ...(sprintFolderId ? { sprintFolderId } : {}),
  }
  if (key === 'sprintFolderId') {
    if (normalizedValue) {
      merged.sprintFolderId = normalizedValue
    } else {
      delete merged.sprintFolderId
    }
  } else {
    merged[key] = normalizedValue
  }
  writeConfig(merged, profileName)
}

export function configPath(): string {
  return getConfigPath()
}
