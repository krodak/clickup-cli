import chalk from 'chalk'
import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

interface SpaceTag {
  name: string
  tag_fg: string
  tag_bg: string
}

export async function listSpaceTags(config: Config, spaceId: string): Promise<SpaceTag[]> {
  const client = new ClickUpClient(config)
  return client.getSpaceTags(spaceId)
}

export function formatTags(tags: SpaceTag[]): string {
  if (tags.length === 0) return 'No tags found'
  return tags.map(t => chalk.bold(t.name)).join(', ')
}

export function formatTagsMarkdown(tags: SpaceTag[]): string {
  if (tags.length === 0) return 'No tags found'
  return tags.map(t => `- ${t.name}`).join('\n')
}
