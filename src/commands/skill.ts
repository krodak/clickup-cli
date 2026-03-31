import { readFileSync, realpathSync, mkdirSync, copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import chalk from 'chalk'
import { isTTY } from '../output.js'

function skillPath(): string {
  const entryPoint = realpathSync(process.argv[1] ?? '')
  const packageRoot = dirname(dirname(entryPoint))
  const candidate = join(packageRoot, 'skills', 'clickup-cli', 'SKILL.md')
  if (existsSync(candidate)) return candidate
  const altCandidate = join(dirname(entryPoint), '..', 'skills', 'clickup-cli', 'SKILL.md')
  if (existsSync(altCandidate)) return altCandidate
  throw new Error('SKILL.md not found. Reinstall with: npm install -g @krodak/clickup-cli')
}

export function printSkill(): string {
  return readFileSync(skillPath(), 'utf-8')
}

interface AgentTarget {
  name: string
  dir: string
  detected: boolean
}

function getAgentTargets(): AgentTarget[] {
  const home = homedir()
  const targets = [
    { name: 'Claude Code', dir: join(home, '.claude', 'skills', 'clickup') },
    { name: 'Codex', dir: join(home, '.agents', 'skills', 'clickup') },
    { name: 'OpenCode', dir: join(home, '.config', 'opencode', 'skills', 'clickup') },
  ]
  return targets.map(t => ({
    ...t,
    detected: existsSync(dirname(t.dir)),
  }))
}

export async function installSkillInteractive(): Promise<string[]> {
  const targets = getAgentTargets()
  const source = skillPath()
  const installed: string[] = []

  if (isTTY()) {
    const { checkbox } = await import('@inquirer/prompts')
    const preselected = targets.filter(t => t.detected).map(t => t.name)

    const selected = await checkbox<string>({
      message: 'Install skill for which agents?',
      choices: targets.map(t => ({
        name: `${t.name}${t.detected ? chalk.dim(' (detected)') : ''}`,
        value: t.name,
        checked: t.detected,
      })),
    })

    if (selected.length === 0) {
      throw new Error('No agents selected')
    }

    for (const name of selected) {
      const target = targets.find(t => t.name === name)!
      if (!existsSync(target.dir)) mkdirSync(target.dir, { recursive: true })
      const dest = join(target.dir, 'SKILL.md')
      copyFileSync(source, dest)
      installed.push(`${target.name}: ${dest}`)
    }
  } else {
    for (const target of targets.filter(t => t.detected)) {
      if (!existsSync(target.dir)) mkdirSync(target.dir, { recursive: true })
      const dest = join(target.dir, 'SKILL.md')
      copyFileSync(source, dest)
      installed.push(`${target.name}: ${dest}`)
    }
    if (installed.length === 0) {
      const fallback = targets[0]!
      mkdirSync(fallback.dir, { recursive: true })
      const dest = join(fallback.dir, 'SKILL.md')
      copyFileSync(source, dest)
      installed.push(`${fallback.name}: ${dest}`)
    }
  }

  return installed
}

export function installSkillTo(path: string): string {
  const source = skillPath()
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  copyFileSync(source, path)
  return path
}
