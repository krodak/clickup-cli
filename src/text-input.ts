import { readFileSync, readSync } from 'node:fs'

/** How long to keep retrying an EAGAIN-ing stdin before giving up. */
const STDIN_TIMEOUT_MS = 30_000
/** Backoff between EAGAIN retries when reading stdin. */
const STDIN_RETRY_MS = 5

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

/** Block the current thread briefly, without spinning the CPU. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * Read all of stdin synchronously.
 *
 * `readFileSync(0)` intermittently throws EAGAIN when stdin is a non-blocking
 * pipe (the writer has not produced data yet), so read in a loop and retry on
 * EAGAIN with a short backoff instead of failing the command.
 */
function readStdin(fileFlag: string): string {
  const chunks: Buffer[] = []
  const buffer = Buffer.alloc(64 * 1024)
  const deadline = Date.now() + STDIN_TIMEOUT_MS

  for (;;) {
    let bytesRead: number
    try {
      bytesRead = readSync(0, buffer, 0, buffer.length, null)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code === 'EAGAIN') {
        if (Date.now() > deadline) {
          throw new Error(
            `Timed out reading ${fileFlag} from stdin after ${STDIN_TIMEOUT_MS / 1000}s. ` +
              `Pass a file path instead of "-" if no input is being piped.`,
            { cause: err },
          )
        }
        sleepSync(STDIN_RETRY_MS)
        continue
      }
      // EOF is how some platforms signal end-of-stream for pipes.
      if (code === 'EOF') break
      throw new Error(`Failed to read ${fileFlag} from stdin: ${(err as Error).message}`, {
        cause: err,
      })
    }
    if (bytesRead === 0) break
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)))
  }

  return Buffer.concat(chunks).toString('utf8')
}
