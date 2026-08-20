export interface DeltaOp {
  insert: string | Record<string, unknown>
  attributes?: Record<string, unknown>
}

export type ListKind = 'bullet' | 'ordered' | 'checked' | 'unchecked' | 'toggled' | 'none'

export function textOp(text: string, attributes?: Record<string, unknown>): DeltaOp {
  if (attributes && Object.keys(attributes).length > 0) {
    return { insert: text, attributes }
  }
  return { insert: text }
}

export function newlineOp(attributes?: Record<string, unknown>): DeltaOp {
  if (attributes && Object.keys(attributes).length > 0) {
    return { insert: '\n', attributes }
  }
  return { insert: '\n' }
}

export function embedOp(
  embed: Record<string, unknown>,
  attributes?: Record<string, unknown>,
): DeltaOp {
  if (attributes && Object.keys(attributes).length > 0) {
    return { insert: embed, attributes }
  }
  return { insert: embed }
}

export function listAttr(
  kind: ListKind,
  extra?: Record<string, unknown>,
): { list: Record<string, unknown> } {
  return { list: { list: kind, ...extra } }
}

export function isTextInsert(insert: DeltaOp['insert']): insert is string {
  return typeof insert === 'string'
}

export function embedType(insert: DeltaOp['insert']): string | undefined {
  if (typeof insert !== 'object' || insert === null) return undefined
  const keys = Object.keys(insert)
  return keys[0]
}
