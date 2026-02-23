import { ClickUpClient } from '../api.js'
import { loadConfig, writeConfig } from '../config.js'
import { selectLists } from './select-lists.js'

export async function runListsCommand(): Promise<void> {
  let config
  try {
    config = loadConfig()
  } catch {
    throw new Error('No config found. Run cu init first.')
  }

  const client = new ClickUpClient(config)
  const selected = await selectLists(client, config.lists)

  writeConfig({ ...config, lists: selected })
  process.stdout.write(`Config updated: ${selected.length} list${selected.length === 1 ? '' : 's'} tracked\n`)
}
