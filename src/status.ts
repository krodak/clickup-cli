export function matchStatus(input: string, statuses: string[]): string | null {
  if (!input) return null

  const lower = input.toLowerCase()

  const exact = statuses.find(s => s.toLowerCase() === lower)
  if (exact) return exact

  const startsWith = statuses.find(s => s.toLowerCase().startsWith(lower))
  if (startsWith) return startsWith

  const contains = statuses.find(s => s.toLowerCase().includes(lower))
  if (contains) return contains

  return null
}
