import { password, select, confirm } from '@inquirer/prompts'
import { ClickUpClient } from '../api.js'
import { getConfigPath, writeConfig } from '../config.js'
import fs from 'fs'

export interface InitOptions {
  token?: string
  team?: string
}

export async function runInitCommand(opts?: InitOptions): Promise<void> {
  if (opts?.token && opts?.team) {
    const apiToken = opts.token.trim()
    if (!apiToken.startsWith('pk_')) throw new Error('Token must start with pk_')

    const client = new ClickUpClient({ apiToken })
    let username: string
    try {
      const me = await client.getMe()
      username = me.username
    } catch (err) {
      throw new Error(`Invalid token: ${err instanceof Error ? err.message : String(err)}`, {
        cause: err,
      })
    }

    process.stdout.write(`Authenticated as @${username}\n`)
    writeConfig({ apiToken, teamId: opts.team })
    process.stdout.write(`Config written to ${getConfigPath()}\n`)
    return
  }

  if (opts?.token || opts?.team) {
    throw new Error('Both --token and --team are required for non-interactive setup')
  }

  const configPath = getConfigPath()

  if (fs.existsSync(configPath)) {
    const overwrite = await confirm({
      message: `Config already exists at ${configPath}. Overwrite?`,
      default: false,
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
    throw new Error(`Invalid token: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    })
  }

  process.stdout.write(`Authenticated as @${username}\n`)

  const teams = await client.getTeams()
  if (teams.length === 0) throw new Error('No workspaces found for this token.')

  let teamId: string
  if (teams.length === 1) {
    const [team] = teams
    if (!team) throw new Error('No workspaces found for this token.')
    teamId = team.id
    process.stdout.write(`Workspace: ${team.name}\n`)
  } else {
    teamId = await select({
      message: 'Select workspace:',
      choices: teams.map(t => ({ name: t.name, value: t.id })),
    })
  }

  writeConfig({ apiToken, teamId })
  process.stdout.write(`Config written to ${configPath}\n`)
}
