import { readFileSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { copySkillFiles } from '../../../src/commands/skill.js'

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
