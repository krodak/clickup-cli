import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { readFileSync, realpathSync, mkdirSync, copyFileSync, existsSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { isTTY } from '../output.js'

export interface SkillInstallOptions {
  print?: boolean
  path?: string
  global?: boolean
  yes?: boolean
  copy?: boolean
  all?: boolean
  agent?: string[]
  list?: boolean
}

export type SkillsSpawn = (
  command: string,
  args: readonly string[],
  options: { stdio: 'inherit' },
) => Pick<SpawnSyncReturns<Buffer>, 'status' | 'error' | 'signal'>

function skillDir(): string {
  if (!process.argv[1]) {
    throw new Error('Cannot determine install path. Run with: cup skill')
  }
  const entryPoint = realpathSync(process.argv[1])
  const packageRoot = dirname(dirname(entryPoint))
  const candidates = [
    join(packageRoot, 'skills', 'clickup-cli'),
    join(dirname(entryPoint), '..', 'skills', 'clickup-cli'),
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, 'SKILL.md'))) return dir
  }
  throw new Error('SKILL.md not found. Reinstall with: npm install -g @krodak/clickup-cli')
}

function skillPath(): string {
  return join(skillDir(), 'SKILL.md')
}

export function printSkill(): string {
  return readFileSync(skillPath(), 'utf-8')
}

function hasSkipPromptFlag(args: readonly string[]): boolean {
  return args.includes('--yes') || args.includes('-y') || args.includes('--all')
}

export function skillsAddNpxArgs(
  skillDirectory: string,
  opts: SkillInstallOptions,
  extra: readonly string[],
  tty: boolean,
): string[] {
  const forwarded: string[] = []
  if (opts.global) forwarded.push('--global')
  if (opts.yes) forwarded.push('--yes')
  if (opts.copy) forwarded.push('--copy')
  if (opts.all) forwarded.push('--all')
  if (opts.list) forwarded.push('--list')
  for (const agent of opts.agent ?? []) {
    forwarded.push('--agent', agent)
  }
  forwarded.push(...extra)
  if (!tty && !hasSkipPromptFlag(forwarded)) {
    forwarded.push('--yes')
  }
  return ['--yes', 'skills', 'add', skillDirectory, ...forwarded]
}

function isEnoent(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
}

export function runSkillsAdd(
  skillDirectory: string,
  opts: SkillInstallOptions,
  extra: readonly string[] = [],
  options: { tty: boolean; spawn?: SkillsSpawn },
): void {
  const spawn = options.spawn ?? spawnSync
  const args = skillsAddNpxArgs(skillDirectory, opts, extra, options.tty)
  const result = spawn('npx', args, { stdio: 'inherit' })
  if (result.error) {
    const reason = isEnoent(result.error) ? 'npx was not found' : result.error.message
    throw new Error(
      `Could not run \`npx skills add\`: ${reason}\n\n` +
        'Fix: install Node.js (includes npx), or copy the skill with:\n' +
        '  cup skill --path ~/.agents/skills/clickup/SKILL.md',
    )
  }
  if (result.status !== null && result.status !== 0) {
    process.exitCode = result.status
  }
}

export function installSkillViaSkillsCli(
  opts: SkillInstallOptions,
  extra: readonly string[] = [],
): void {
  runSkillsAdd(skillDir(), opts, extra, { tty: isTTY() })
}

export function installSkillTo(path: string): string {
  return copySkillFiles(skillPath(), path)
}

export function copySkillFiles(sourceSkillMd: string, destSkillMd: string): string {
  const destDir = dirname(destSkillMd)
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  copyFileSync(sourceSkillMd, destSkillMd)
  const srcRefs = join(dirname(sourceSkillMd), 'references')
  if (existsSync(srcRefs)) {
    cpSync(srcRefs, join(destDir, 'references'), { recursive: true })
  }
  return destSkillMd
}
