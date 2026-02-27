import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { formatSpacesMarkdown } from '../markdown.js'
import { isTTY, shouldOutputJson, formatTable } from '../output.js'

export async function listSpaces(
  config: Config,
  opts: { name?: string; my?: boolean; json?: boolean },
): Promise<void> {
  const client = new ClickUpClient(config)
  let spaces = await client.getSpaces(config.teamId)

  if (opts.name) {
    const lower = opts.name.toLowerCase()
    spaces = spaces.filter(s => s.name.toLowerCase().includes(lower))
  }

  if (opts.my) {
    const tasks = await client.getMyTasks(config.teamId)
    const mySpaceIds = new Set(
      tasks.map(t => t.space?.id).filter((id): id is string => Boolean(id)),
    )
    spaces = spaces.filter(s => mySpaceIds.has(s.id))
  }

  if (shouldOutputJson(opts.json ?? false)) {
    console.log(JSON.stringify(spaces, null, 2))
  } else if (!isTTY()) {
    console.log(formatSpacesMarkdown(spaces.map(s => ({ id: s.id, name: s.name }))))
  } else {
    const table = formatTable(
      spaces.map(s => ({ id: s.id, name: s.name })),
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'NAME' },
      ],
    )
    console.log(table)
  }
}
