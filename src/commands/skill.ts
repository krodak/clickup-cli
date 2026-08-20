import { readFileSync, realpathSync, mkdirSync, copyFileSync, existsSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import chalk from 'chalk'
import { isTTY } from '../output.js'

function skillPath(): string {
  if (!process.argv[1]) {
    throw new Error('Cannot determine install path. Run with: cup skill')
  }
  const entryPoint = realpathSync(process.argv[1])
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
    const selected = await checkbox<string>({
      message: 'Install skill for which agents?',
      choices: targets.map(t => ({
        name: `${t.name}${t.detected ? chalk.dim(' (detected)') : ''}`,
        value: t.name,
        checked: t.detected,
      })),
      theme: { keybindings: ['vim'] as const },
    })

    if (selected.length === 0) {
      throw new Error('No agents selected')
    }

    for (const name of selected) {
      const target = targets.find(t => t.name === name)
      if (!target) continue
      const dest = join(target.dir, 'SKILL.md')
      copySkillFiles(source, dest)
      installed.push(`${target.name}: ${dest}`)
    }
  } else {
    const detected = targets.filter(t => t.detected)
    if (detected.length === 0) {
      throw new Error(
        'No agents detected. Use --path to specify install location:\n  cup skill --path ~/.claude/skills/clickup/SKILL.md',
      )
    }
    for (const target of detected) {
      const dest = join(target.dir, 'SKILL.md')
      copySkillFiles(source, dest)
      installed.push(`${target.name}: ${dest}`)
    }
  }

  return installed
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
