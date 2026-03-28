import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'
import { formatTable, isTTY } from '../output.js'
import type { Column } from '../output.js'

interface SpaceTag {
  name: string
  tag_fg: string
  tag_bg: string
}

interface TagRow {
  name: string
  fg: string
  bg: string
}

const TAG_COLUMNS: Column<TagRow>[] = [
  { key: 'name', label: 'Name', maxWidth: 40 },
  { key: 'fg', label: 'FG', maxWidth: 10 },
  { key: 'bg', label: 'BG', maxWidth: 10 },
]

export async function listSpaceTags(config: Config, spaceId: string): Promise<SpaceTag[]> {
  const client = new ClickUpClient(config)
  return client.getSpaceTags(spaceId)
}

export async function createSpaceTag(
  config: Config,
  spaceId: string,
  name: string,
  fg?: string,
  bg?: string,
): Promise<void> {
  const client = new ClickUpClient(config)
  await client.createSpaceTag(spaceId, name, fg, bg)
}

export async function deleteSpaceTag(
  config: Config,
  spaceId: string,
  tagName: string,
): Promise<void> {
  const client = new ClickUpClient(config)
  await client.deleteSpaceTag(spaceId, tagName)
}

export async function updateSpaceTag(
  config: Config,
  spaceId: string,
  tagName: string,
  updates: { name: string; fg?: string; bg?: string },
): Promise<void> {
  const client = new ClickUpClient(config)
  await client.updateSpaceTag(spaceId, tagName, {
    name: updates.name,
    tag_fg: updates.fg,
    tag_bg: updates.bg,
  })
}

export function formatTags(tags: SpaceTag[]): string {
  if (tags.length === 0) return 'No tags found'
  if (isTTY()) {
    const rows: TagRow[] = tags.map(t => ({
      name: t.tag_bg
        ? chalk.bgHex(t.tag_bg).hex(t.tag_fg || '#ffffff')(` ${t.name} `)
        : chalk.bold(t.name),
      fg: t.tag_fg || '',
      bg: t.tag_bg || '',
    }))
    return formatTable(rows, TAG_COLUMNS)
  }
  return tags.map(t => chalk.bold(t.name)).join(', ')
}

export function formatTagsMarkdown(tags: SpaceTag[]): string {
  if (tags.length === 0) return 'No tags found'
  return tags
    .map(t => {
      const colors = t.tag_bg ? ` (bg: ${t.tag_bg}${t.tag_fg ? `, fg: ${t.tag_fg}` : ''})` : ''
      return `- ${t.name}${colors}`
    })
    .join('\n')
}
