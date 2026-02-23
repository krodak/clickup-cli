import { password, select, confirm } from '@inquirer/prompts'
import { ClickUpClient } from '../api.js'
import { getConfigPath, writeConfig } from '../config.js'
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
  if (!apiToken.startsWith('pk_')) throw new Error('Token must start with pk_')

  const client = new ClickUpClient({ apiToken })

  let username: string
  try {
    const me = await client.getMe()
    username = me.username
  } catch (err) {
    throw new Error(`Invalid token: ${err instanceof Error ? err.message : String(err)}`)
  }

  process.stdout.write(`Authenticated as @${username}\n`)

  const teams = await client.getTeams()
  if (teams.length === 0) throw new Error('No workspaces found for this token.')

  let teamId: string
  if (teams.length === 1) {
    teamId = teams[0].id
    process.stdout.write(`Workspace: ${teams[0].name}\n`)
  } else {
    teamId = await select({
      message: 'Select workspace:',
      choices: teams.map(t => ({ name: t.name, value: t.id }))
    })
  }

  writeConfig({ apiToken, teamId })
  process.stdout.write(`Config written to ${configPath}\n`)
}
