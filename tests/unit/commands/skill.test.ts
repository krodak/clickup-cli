import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { copySkillFiles, runSkillsAdd, skillsAddNpxArgs } from '../../../src/commands/skill.js'

describe('shipped clickup skill', () => {
  it('requires agents to load the CUFM reference before writing descriptions', () => {
    const skill = readFileSync(resolve('skills/clickup-cli/SKILL.md'), 'utf8')
    expect(skill).toContain('[references/cufm.md](references/cufm.md)')
    expect(skill).toMatch(/Before writing or updating a ClickUp \*\*task description\*\*/)
    const cufm = readFileSync(resolve('skills/clickup-cli/references/cufm.md'), 'utf8')
    expect(cufm).toContain('Read this file before writing or updating a ClickUp task description')
    expect(cufm).toContain('::toggle')
    expect(cufm).toContain('::banner')
    expect(cufm).toContain('::mermaid')
    expect(cufm).toContain('```mermaid')
  })
})

describe('copySkillFiles', () => {
  it('copies SKILL.md and the references directory', async () => {
    const src = await mkdtemp(join(tmpdir(), 'cup-skill-src-'))
    const destDir = join(await mkdtemp(join(tmpdir(), 'cup-skill-dest-')), 'clickup')
    await mkdir(join(src, 'references'))
    await writeFile(
      join(src, 'SKILL.md'),
      '# skill\nread [references/cufm.md](references/cufm.md)\n',
    )
    await writeFile(join(src, 'references', 'cufm.md'), '# CUFM\n')

    const dest = copySkillFiles(join(src, 'SKILL.md'), join(destDir, 'SKILL.md'))
    expect(dest).toBe(join(destDir, 'SKILL.md'))
    expect(await readFile(join(destDir, 'SKILL.md'), 'utf8')).toContain('references/cufm.md')
    expect(await readFile(join(destDir, 'references', 'cufm.md'), 'utf8')).toBe('# CUFM\n')
  })
})

describe('skillsAddNpxArgs', () => {
  const dir = '/opt/clickup-cli/skills/clickup-cli'

  it('invokes npx skills add against the shipped skill directory', () => {
    expect(skillsAddNpxArgs(dir, {}, [], true)).toEqual(['--yes', 'skills', 'add', dir])
  })

  it('forwards installer flags', () => {
    expect(
      skillsAddNpxArgs(
        dir,
        {
          global: true,
          yes: true,
          copy: true,
          all: true,
          list: true,
          agent: ['claude-code', 'universal'],
        },
        ['--full-depth'],
        true,
      ),
    ).toEqual([
      '--yes',
      'skills',
      'add',
      dir,
      '--global',
      '--yes',
      '--copy',
      '--all',
      '--list',
      '--agent',
      'claude-code',
      '--agent',
      'universal',
      '--full-depth',
    ])
  })

  it('adds --yes when stdout is not a TTY so the installer cannot hang', () => {
    expect(skillsAddNpxArgs(dir, {}, [], false)).toEqual(['--yes', 'skills', 'add', dir, '--yes'])
  })

  it('does not duplicate --yes when skip-prompt flags are already present', () => {
    expect(skillsAddNpxArgs(dir, { yes: true }, [], false)).toEqual([
      '--yes',
      'skills',
      'add',
      dir,
      '--yes',
    ])
    expect(skillsAddNpxArgs(dir, { all: true }, [], false)).toEqual([
      '--yes',
      'skills',
      'add',
      dir,
      '--all',
    ])
    expect(skillsAddNpxArgs(dir, {}, ['-y'], false)).toEqual(['--yes', 'skills', 'add', dir, '-y'])
  })
})

describe('runSkillsAdd', () => {
  const dir = '/opt/clickup-cli/skills/clickup-cli'

  it('spawns npx with inherited stdio', () => {
    const spawn = vi.fn().mockReturnValue({ status: 0, error: undefined, signal: null })
    runSkillsAdd(dir, { global: true }, [], { tty: true, spawn })
    expect(spawn).toHaveBeenCalledWith('npx', ['--yes', 'skills', 'add', dir, '--global'], {
      stdio: 'inherit',
    })
  })

  it('throws an actionable error when npx is missing', () => {
    const error = Object.assign(new Error('spawn npx ENOENT'), { code: 'ENOENT' })
    const spawn = vi.fn().mockReturnValue({ status: null, error, signal: null })
    expect(() => runSkillsAdd(dir, {}, [], { tty: true, spawn })).toThrow(
      /cup skill --path ~\/\.agents\/skills\/clickup\/SKILL\.md/,
    )
  })

  it('propagates a non-zero installer exit code', () => {
    const previous = process.exitCode
    const spawn = vi.fn().mockReturnValue({ status: 2, error: undefined, signal: null })
    try {
      process.exitCode = undefined
      runSkillsAdd(dir, {}, [], { tty: true, spawn })
      expect(process.exitCode).toBe(2)
    } finally {
      process.exitCode = previous
    }
  })
})
