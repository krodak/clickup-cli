import type { FavoriteType, FavoritesMap } from '../config.js'
import { formatTable } from '../output.js'
import type { Column } from '../output.js'

const VALID_TYPES = new Set<FavoriteType>([
  'sprint-folder',
  'space',
  'list',
  'folder',
  'view',
  'task',
])

export function validateFavoriteType(type: string): asserts type is FavoriteType {
  if (!VALID_TYPES.has(type as FavoriteType)) {
    throw new Error(`Invalid favorite type: "${type}". Valid types: ${[...VALID_TYPES].join(', ')}`)
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface FavoriteRow {
  alias: string
  type: string
  id: string
  name: string
}

const FAVORITE_COLUMNS: Column<FavoriteRow>[] = [
  { key: 'alias', label: 'ALIAS', maxWidth: 30 },
  { key: 'type', label: 'TYPE', maxWidth: 20 },
  { key: 'id', label: 'ID', maxWidth: 20 },
  { key: 'name', label: 'NAME', maxWidth: 40 },
]

export function formatFavoritesTable(favorites: FavoritesMap): string {
  const entries = Object.entries(favorites)
  if (entries.length === 0) return 'No favorites saved'
  const rows: FavoriteRow[] = entries.map(([alias, entry]) => ({
    alias,
    type: entry.type,
    id: entry.id,
    name: entry.name ?? '',
  }))
  return formatTable(rows, FAVORITE_COLUMNS)
}

export function formatFavoritesMarkdown(favorites: FavoritesMap): string {
  const entries = Object.entries(favorites)
  if (entries.length === 0) return 'No favorites saved'
  const lines = ['| Alias | Type | ID | Name |', '| --- | --- | --- | --- |']
  for (const [alias, entry] of entries) {
    lines.push(`| ${alias} | ${entry.type} | ${entry.id} | ${entry.name ?? ''} |`)
  }
  return lines.join('\n')
}
