import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { loadConfig, writeConfig } from '../config.js'
import { selectLists } from './select-lists.js'

export async function runListsCommand(): Promise<void> {
  let config: Config
  try {
    config = loadConfig()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('not found') || msg.includes('Config file not found')) {
      throw new Error('No config found. Run cu init first.')
    }
    throw err
  }

  const client = new ClickUpClient(config)
  const selected = await selectLists(client, config.lists)

  writeConfig({ ...config, lists: selected })
  process.stdout.write(`Config updated: ${selected.length} list${selected.length === 1 ? '' : 's'} tracked\n`)
}
