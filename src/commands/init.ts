import { password, confirm } from '@inquirer/prompts'
import { ClickUpClient } from '../api.js'
import { getConfigPath, writeConfig } from '../config.js'
import { selectLists } from './select-lists.js'
import fs from 'fs'

export async function runInitCommand(): Promise<void> {
  const configPath = getConfigPath()

  if (fs.existsSync(configPath)) {
    const overwrite = await confirm({
      message: `Config already exists at ${configPath}. Overwrite?`,
      default: false
    })
    if (!overwrite) {
      process.stdout.write('Aborted.\n')
      return
    }
  }

  const apiToken = (await password({ message: 'ClickUp API token (pk_...):' })).trim()

  if (!apiToken.startsWith('pk_')) {
    throw new Error('Token must start with pk_')
  }

  const client = new ClickUpClient({ apiToken })

  let username: string
  try {
    const me = await client.getMe()
    username = me.username
  } catch (err) {
    throw new Error(`Invalid token: ${err instanceof Error ? err.message : String(err)}`)
  }

  process.stdout.write(`Authenticated as @${username}\n`)

  const lists = await selectLists(client, [])

  writeConfig({ apiToken, teamId: lists[0] ?? '' })
  process.stdout.write(`Config written to ${configPath} (${lists.length} list${lists.length === 1 ? '' : 's'})\n`)
}
