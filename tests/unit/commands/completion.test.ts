import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { generateCompletion } from '../../../src/commands/completion.js'
import { buildProgram } from '../../../src/index.js'
import {
  commandMetadata,
  parseCommandFlags,
  renderQuickReferenceSection,
  syncQuickReferenceSection,
  topLevelCommandDefinitions,
} from '../../../src/commands/metadata.js'

function topLevelMetadata() {
  return topLevelCommandDefinitions()
    .map(command => ({
      name: command.name,
      description: command.description,
      flags: command.flags.map(flag => ({ short: flag.short, long: flag.long })),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function getProgramCommandMetadata() {
  const program = buildProgram('cup')

  return program.commands
    .map(command => ({
      name: command.name(),
      description: command.description(),
      flags: command.options
        .filter(option => option.long !== '--help')
        .map(option => ({ short: option.short || undefined, long: option.long! })),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function formatRegisteredArgument(arg: { name(): string; required: boolean; variadic: boolean }) {
  const suffix = arg.variadic ? '...' : ''

  return arg.required ? `<${arg.name()}${suffix}>` : `[${arg.name()}${suffix}]`
}

function getProgramCommandSignatures() {
  const program = buildProgram('cup')
  const signatures: string[] = []

  function walk(command: ReturnType<typeof buildProgram>, prefix = '') {
    for (const subcommand of command.commands) {
      const signature = [
        prefix,
        subcommand.name(),
        ...subcommand.registeredArguments.map(formatRegisteredArgument),
      ]
        .filter(Boolean)
        .join(' ')

      signatures.push(signature)
      walk(subcommand, [prefix, subcommand.name()].filter(Boolean).join(' '))
    }
  }

  walk(program)

  return signatures.sort((left, right) => left.localeCompare(right))
}

function getBashTopLevelCommands(script: string): string[] {
  const match = script.match(/local commands="([^"]+)"/)
  return match?.[1]?.split(' ') ?? []
}

function getZshTopLevelCommands(script: string): Array<{ name: string; description: string }> {
  const lines = script.split('\n')
  const start = lines.findIndex(line => line.includes('commands=('))
  const end = lines.findIndex((line, index) => index > start && line.trim() === ')')

  return lines
    .slice(start + 1, end)
    .map(line => line.trim())
    .filter(line => line.startsWith("'"))
    .map(line => {
      const match = line.match(/^'([^:]+):(.*)'$/)
      if (!match) {
        throw new Error(`Unable to parse zsh command definition: ${line}`)
      }

      return { name: match[1]!, description: match[2]! }
    })
}

function getFishTopLevelCommands(
  script: string,
  binaryName = 'cup',
): Array<{ name: string; description: string }> {
  const pattern = new RegExp(
    `^complete -c ${binaryName} -n __fish_use_subcommand -a ([^ ]+) -d '([^']*)'$`,
    'm',
  )

  return script
    .split('\n')
    .map(line => line.trim())
    .filter(line => pattern.test(line))
    .map(line => {
      const match = line.match(pattern)
      if (!match) {
        throw new Error(`Unable to parse fish command definition: ${line}`)
      }

      return { name: match[1]!, description: match[2]! }
    })
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getBashFlagsForCommand(
  script: string,
  commandName: string,
): Array<{ short?: string; long?: string }> {
  const escapedName = escapeRegex(commandName)
  const match = script.match(new RegExp(`^\\s*${escapedName}\\)\\n([\\s\\S]*?)\\n\\s*;;`, 'm'))

  if (!match) {
    return []
  }

  const compgen = match[1]!.match(/compgen -W "([^"]*)"/)
  const tokens = compgen?.[1]?.split(' ').filter(Boolean) ?? []
  return parseCommandFlags(tokens).map(flag => ({ short: flag.short, long: flag.long }))
}

function commandsWithMetadataFlags() {
  return commandMetadata.filter(
    (entry): entry is (typeof commandMetadata)[number] & { flags: readonly string[] } =>
      'flags' in entry && Array.isArray(entry.flags) && entry.flags.length > 0,
  )
}

function getFishFlagsForCommand(script: string, commandName: string, binaryName = 'cup') {
  const commandPattern = `-n '__fish_seen_subcommand_from ${commandName}'`

  const flags = script
    .split('\n')
    .map(line => line.trim())
    .filter(
      line =>
        line.startsWith(`complete -c ${binaryName} `) &&
        line.includes(commandPattern) &&
        (line.includes(' -s ') || line.includes(' -l ')),
    )
    .map(line => ({
      short: line.match(/ -s ([^ ]+)/)?.[1] ? `-${line.match(/ -s ([^ ]+)/)?.[1]}` : undefined,
      long: line.match(/ -l ([^ ]+)/)?.[1] ? `--${line.match(/ -l ([^ ]+)/)?.[1]}` : undefined,
    }))

  return flags.filter(
    (flag, index) =>
      flags.findIndex(
        candidate => candidate.short === flag.short && candidate.long === flag.long,
      ) === index,
  )
}

function getQuickReferenceSection(): string {
  const docs = readFileSync(new URL('../../../docs/commands.md', import.meta.url), 'utf8')
  const start = docs.indexOf('## Quick Reference')
  const endMarker = docs.indexOf('<!-- quick-reference:end -->', start)
  const end = endMarker === -1 ? docs.indexOf('\n---', start) : endMarker

  return docs.slice(start, end).trim()
}

function getQuickReferenceCommands(section = getQuickReferenceSection()): string[] {
  return section
    .split('\n')
    .filter(line => line.startsWith('| `cup '))
    .map(line => {
      const match = line.match(/\| `cup ([^`]+)`\s+\|/)
      if (!match) {
        throw new Error(`Unable to parse quick reference row: ${line}`)
      }

      return match[1]!
    })
}

function getCommandsDocs(): string {
  return readFileSync(new URL('../../../docs/commands.md', import.meta.url), 'utf8')
}

describe('generateCompletion', () => {
  describe('bash', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('bash')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('bash')
      expect(getBashTopLevelCommands(result)).toEqual(commandMetadata.map(command => command.name))
    })

    it('contains key flags', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('--status')
      expect(result).toContain('--json')
      expect(result).toContain('--list')
      expect(result).toContain('--name')
      expect(result).toContain('--priority')
    })

    it('contains priority values', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('urgent')
      expect(result).toContain('high')
      expect(result).toContain('normal')
      expect(result).toContain('low')
    })

    it('contains the complete function registration', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('complete -F')
      expect(result).toContain('cup')
    })

    it('handles missing _init_completion with fallback', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('_init_completion')
      expect(result).toContain('COMP_WORDS')
    })
  })

  describe('zsh', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('zsh')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('zsh')
      expect(getZshTopLevelCommands(result)).toEqual(
        commandMetadata.map(command => ({ name: command.name, description: command.description })),
      )
    })

    it('contains key flags', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('--status')
      expect(result).toContain('--json')
      expect(result).toContain('--list')
      expect(result).toContain('--name')
      expect(result).toContain('--priority')
    })

    it('contains compdef directive', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('#compdef cup')
    })

    it('contains status suggestions', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('open')
      expect(result).toContain('in progress')
      expect(result).toContain('done')
    })
  })

  describe('fish', () => {
    it('returns a non-empty string', () => {
      const result = generateCompletion('fish')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('contains all command names', () => {
      const result = generateCompletion('fish')
      expect(getFishTopLevelCommands(result)).toEqual(
        commandMetadata.map(command => ({ name: command.name, description: command.description })),
      )
    })

    it('contains key flags', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('-l status')
      expect(result).toContain('-l json')
      expect(result).toContain('-l name')
      expect(result).toContain('-l priority')
    })

    it('disables file completions', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('complete -c cup -f')
    })

    it('uses __fish_use_subcommand for top-level commands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('__fish_use_subcommand')
    })

    it('uses __fish_seen_subcommand_from for subcommand flags', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('__fish_seen_subcommand_from')
    })
  })

  describe('custom binary name', () => {
    it('bash uses the provided name for function and registration', () => {
      const result = generateCompletion('bash', 'clickup')
      expect(result).toContain('_clickup_completions()')
      expect(result).toContain('complete -F _clickup_completions clickup')
      expect(result).not.toContain('_cup_completions')
    })

    it('zsh uses the provided name for compdef and function', () => {
      const result = generateCompletion('zsh', 'clickup')
      expect(result).toContain('#compdef clickup')
      expect(result).toContain('_clickup()')
      expect(result).not.toContain('#compdef cup\n')
    })

    it('fish uses the provided name for complete commands', () => {
      const result = generateCompletion('fish', 'clickup')
      expect(result).toContain('complete -c clickup -f')
      expect(result).toContain('complete -c clickup -n __fish_use_subcommand')
      expect(result).not.toContain('complete -c cup ')
    })

    it('keeps init descriptions synchronized across zsh and fish for custom binary names', () => {
      const zshResult = generateCompletion('zsh', 'clickup')
      const fishResult = generateCompletion('fish', 'clickup')

      expect(getZshTopLevelCommands(zshResult)).toContainEqual({
        name: 'init',
        description: 'Set up clickup for the first time',
      })
      expect(getFishTopLevelCommands(fishResult, 'clickup')).toContainEqual({
        name: 'init',
        description: 'Set up clickup for the first time',
      })
    })

    it('defaults to cup when name is not provided', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('_cup_completions()')
      expect(result).toContain('complete -F _cup_completions cup')
    })
  })

  describe('unknown shell', () => {
    it('throws an error for unsupported shell', () => {
      expect(() => generateCompletion('powershell')).toThrow()
    })

    it('includes the shell name in the error message', () => {
      expect(() => generateCompletion('tcsh')).toThrow('tcsh')
    })
  })

  describe('config subcommand completions', () => {
    it('bash includes config subcommands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('get')
      expect(result).toContain('set')
      expect(result).toContain('path')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })

    it('zsh includes config subcommands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('get')
      expect(result).toContain('set')
      expect(result).toContain('path')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })

    it('fish includes config subcommands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('apiToken')
      expect(result).toContain('teamId')
    })
  })

  describe('time subcommand completions', () => {
    it('bash includes update and delete subcommands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('start stop status log list update delete')
    })

    it('zsh includes update and delete subcommands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain("'update:Update a time entry'")
      expect(result).toContain("'delete:Delete a time entry'")
    })

    it('fish includes update and delete subcommands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain("-a update -d 'Update a time entry'")
      expect(result).toContain("-a delete -d 'Delete a time entry'")
    })
  })

  describe('new command completions', () => {
    it('bash includes new commands', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
    })

    it('bash includes --template in create', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('--template')
    })

    it('zsh includes new commands', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
    })

    it('fish includes new commands', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('goal-delete')
      expect(result).toContain('key-result-delete')
      expect(result).toContain('doc-delete')
      expect(result).toContain('doc-page-delete')
      expect(result).toContain('tag-update')
      expect(result).toContain('task-types')
      expect(result).toContain('templates')
    })
  })

  describe('metadata synchronization', () => {
    it('keeps the quick reference section synchronized with command metadata', () => {
      expect(getQuickReferenceSection()).toBe(renderQuickReferenceSection())
    })

    it('uses real CLI command signatures in the quick reference section', () => {
      const commandSignatures = new Set(getProgramCommandSignatures())
      const mismatches = getQuickReferenceCommands().filter(
        command => !commandSignatures.has(command),
      )

      expect(mismatches).toEqual([])
    })

    it('keeps completion command inventories synchronized with command metadata', () => {
      expect(getProgramCommandMetadata()).toEqual(topLevelMetadata())
    })

    it('includes metadata-driven attach flags in bash completion output', () => {
      const result = generateCompletion('bash')

      expect(getBashFlagsForCommand(result, 'attach')).toEqual([{ long: '--json' }])
    })

    it('keeps metadata-driven top-level flags synchronized in bash completion output', () => {
      const result = generateCompletion('bash')

      for (const command of commandsWithMetadataFlags()) {
        expect(getBashFlagsForCommand(result, command.name)).toEqual(
          parseCommandFlags(command.flags).map(flag => ({ short: flag.short, long: flag.long })),
        )
      }
    })

    it('keeps metadata-driven top-level flags synchronized in fish completion output', () => {
      const result = generateCompletion('fish')

      for (const command of commandsWithMetadataFlags()) {
        expect(getFishFlagsForCommand(result, command.name)).toEqual(
          parseCommandFlags(command.flags).map(flag => ({ short: flag.short, long: flag.long })),
        )
      }
    })

    it('derives the quick reference block from metadata using patch-safe markers', () => {
      const docs = getCommandsDocs()

      expect(syncQuickReferenceSection(docs)).toBe(docs)
    })

    it('rewrites only the marked quick reference block when it drifts', () => {
      const docs = getCommandsDocs()
      const driftedDocs = docs.replace('First-time setup wizard', 'Outdated quick reference copy')

      const updatedDocs = syncQuickReferenceSection(driftedDocs)

      expect(updatedDocs).toContain(renderQuickReferenceSection())
      expect(updatedDocs).toContain('All commands support `--help` for full flag details.')
      expect(updatedDocs).toContain('## Read Commands')
      expect(updatedDocs).not.toContain('Outdated quick reference copy')
    })
  })

  describe('completion subcommand completions', () => {
    it('bash includes shell types', () => {
      const result = generateCompletion('bash')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })

    it('zsh includes shell types', () => {
      const result = generateCompletion('zsh')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })

    it('fish includes shell types', () => {
      const result = generateCompletion('fish')
      expect(result).toContain('bash')
      expect(result).toContain('zsh')
      expect(result).toContain('fish')
    })
  })
})
