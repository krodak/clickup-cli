import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { syncQuickReferenceSection } from '../src/commands/metadata.js'

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }
  return pkg.version
}

function syncSkillVersion(content: string, version: string): string {
  return content
    .replace(
      /^# ClickUp CLI \(`cup`\) - skill version .+$/m,
      `# ClickUp CLI (\`cup\`) - skill version ${version}`,
    )
    .replace(/older than [^,]+, update with/, `older than ${version}, update with`)
}

function syncPluginVersion(content: string, version: string): string {
  return content.replace(/"version":\s*"[^"]+"/, `"version": "${version}"`)
}

const version = readVersion()

const commandsDocsPath = resolve('docs/commands.md')
const currentDocs = readFileSync(commandsDocsPath, 'utf8')
const nextDocs = syncQuickReferenceSection(currentDocs)
if (nextDocs !== currentDocs) {
  writeFileSync(commandsDocsPath, nextDocs)
}

const skillPath = resolve('skills/clickup-cli/SKILL.md')
const currentSkill = readFileSync(skillPath, 'utf8')
const nextSkill = syncSkillVersion(currentSkill, version)
if (nextSkill !== currentSkill) {
  writeFileSync(skillPath, nextSkill)
}

const pluginPath = resolve('.claude-plugin/plugin.json')
const currentPlugin = readFileSync(pluginPath, 'utf8')
const nextPlugin = syncPluginVersion(currentPlugin, version)
if (nextPlugin !== currentPlugin) {
  writeFileSync(pluginPath, nextPlugin)
}
