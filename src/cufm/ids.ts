import { randomBytes, randomUUID } from 'node:crypto'

export interface IdFactory {
  short: (prefix: string) => string
  uuid: () => string
}

export function randomIdFactory(): IdFactory {
  return {
    short: prefix => `${prefix}-${randomBytes(3).toString('hex')}`,
    uuid: () => randomUUID(),
  }
}

export function sequentialIdFactory(): IdFactory {
  let n = 0
  return {
    short: prefix => {
      n += 1
      return `${prefix}-${String(n).padStart(4, '0')}`
    },
    uuid: () => {
      n += 1
      const hex = String(n).padStart(12, '0')
      return `00000000-0000-4000-8000-${hex}`
    },
  }
}
