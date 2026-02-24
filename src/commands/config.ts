import { loadRawConfig, writeConfig, getConfigPath } from '../config.js'
import type { Config } from '../config.js'

const VALID_KEYS: ReadonlySet<string> = new Set(['apiToken', 'teamId'])

function assertValidKey(key: string): asserts key is keyof Config {
  if (!VALID_KEYS.has(key)) {
    throw new Error(`Unknown config key: ${key}. Valid keys: ${[...VALID_KEYS].join(', ')}`)
  }
}

export function getConfigValue(key: string): string | undefined {
  assertValidKey(key)
  const raw = loadRawConfig()
  const value = raw[key]?.trim()
  return value || undefined
}

export function setConfigValue(key: string, value: string): void {
  assertValidKey(key)

  if (key === 'apiToken' && !value.startsWith('pk_')) {
    throw new Error('apiToken must start with pk_')
  }
  if (key === 'teamId' && value.trim() === '') {
    throw new Error('teamId must be non-empty')
  }

  const raw = loadRawConfig()
  const merged: Config = {
    apiToken: raw.apiToken ?? '',
    teamId: raw.teamId ?? '',
    ...{ [key]: value },
  }
  writeConfig(merged)
}

export function configPath(): string {
  return getConfigPath()
}
