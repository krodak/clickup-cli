import { readFileSync } from 'node:fs'

export interface ResolveTextInputArgs {
  /** Value provided via the inline flag (e.g. -d / -m). */
  inline?: string
  /** Path provided via the file flag (e.g. --description-file / --message-file). "-" means stdin. */
  file?: string
  /** Human-readable inline flag name, used in error messages (e.g. "-d"). */
  inlineFlag: string
  /** Human-readable file flag name, used in error messages (e.g. "--description-file"). */
  fileFlag: string
}

/**
 * Resolve text content from either an inline flag value or a file (or stdin).
 *
 * - Inline and file flags are mutually exclusive.
 * - A file path of "-" reads from stdin.
 * - A single trailing newline is stripped (common editor/heredoc artifact).
 *
 * Returns undefined when neither is provided (caller decides if that is valid).
 */
export function resolveTextInput(args: ResolveTextInputArgs): string | undefined {
  const { inline, file, inlineFlag, fileFlag } = args

  if (inline !== undefined && file !== undefined) {
    throw new Error(`Cannot use ${inlineFlag} and ${fileFlag} together`)
  }

  if (file === undefined) return inline

  const raw = file === '-' ? readStdin(fileFlag) : readTextFile(file, fileFlag)
  return raw.replace(/\r?\n$/, '')
}

function readTextFile(path: string, fileFlag: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    throw new Error(`Cannot read ${fileFlag} "${path}": ${(err as Error).message}`, { cause: err })
  }
}

function readStdin(fileFlag: string): string {
  try {
    return readFileSync(0, 'utf8')
  } catch (err) {
    throw new Error(`Failed to read ${fileFlag} from stdin: ${(err as Error).message}`, {
      cause: err,
    })
  }
}
