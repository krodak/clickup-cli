import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { syncQuickReferenceSection } from '../src/commands/metadata.js'

const commandsDocsPath = resolve('docs/commands.md')
const currentDocs = readFileSync(commandsDocsPath, 'utf8')
const nextDocs = syncQuickReferenceSection(currentDocs)

if (nextDocs !== currentDocs) {
  writeFileSync(commandsDocsPath, nextDocs)
}
