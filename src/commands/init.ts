import { password, select, confirm } from '@inquirer/prompts'
import { ClickUpClient } from '../api.js'
import { getConfigPath, writeConfig } from '../config.js'
import fs from 'fs'

export interface InitOptions {
  token?: string
  team?: string
}

const TOKEN_URL = 'https://app.clickup.com/settings/apps'

const TOKEN_HELP = `
How to get a ClickUp API token:
  1. Open ${TOKEN_URL}
  2. Find the "API Token" section, click "Generate" (or copy the existing one)
  3. The token starts with "pk_"
`

const NON_TTY_HELP = `cup init requires an interactive terminal.

For scripts, CI, or AI agents, use flags:
  cup init --token pk_YOUR_TOKEN --team YOUR_TEAM_ID

Or set environment variables:
  export CU_API_TOKEN=pk_YOUR_TOKEN
  export CU_TEAM_ID=YOUR_TEAM_ID
${TOKEN_HELP}`

const NEXT_STEPS = `
Next steps:
  cup auth      # verify setup
  cup tasks     # list your assigned tasks
  cup sprint    # show current sprint
  cup --help    # see all commands
`

function validateTokenFormat(token: string): void {
  if (!token.startsWith('pk_')) {
    throw new Error(`Invalid token format. Personal API tokens start with "pk_".\n${TOKEN_HELP}`)
  }
}

async function verifyToken(apiToken: string): Promise<string> {
  const client = new ClickUpClient({ apiToken })
  try {
    const me = await client.getMe()
    return me.username
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Token verification failed: ${msg}\n\nCheck the token is correct and not expired.\n${TOKEN_HELP}`,
      { cause: err },
    )
  }
}

export async function runInitCommand(opts?: InitOptions): Promise<void> {
  if (opts?.token && opts?.team) {
    const apiToken = opts.token.trim()
    validateTokenFormat(apiToken)
    const username = await verifyToken(apiToken)
    process.stdout.write(`Authenticated as @${username}\n`)
    writeConfig({ apiToken, teamId: opts.team })
    process.stdout.write(`Config written to ${getConfigPath()}\n${NEXT_STEPS}`)
    return
  }

  if (opts?.token || opts?.team) {
    throw new Error('Both --token and --team are required for non-interactive setup')
  }

  if (!process.stdin.isTTY) {
    throw new Error(NON_TTY_HELP)
  }

  const configPath = getConfigPath()

  process.stdout.write('\nWelcome to ClickUp CLI!\n')
  process.stdout.write(TOKEN_HELP)
  process.stdout.write('\n')

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

  const apiToken = (
    await password({
      message: 'Paste your ClickUp API token (starts with pk_):',
    })
  ).trim()
  validateTokenFormat(apiToken)

  const username = await verifyToken(apiToken)
  process.stdout.write(`Authenticated as @${username}\n`)

  const client = new ClickUpClient({ apiToken })
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
      theme: { keybindings: ['vim'] as const },
    })
  }

  writeConfig({ apiToken, teamId })
  process.stdout.write(`\nConfig written to ${configPath}\n${NEXT_STEPS}`)
}
