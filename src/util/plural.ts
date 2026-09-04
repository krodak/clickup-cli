/** `1 task`, `2 tasks`; pass an explicit plural for irregular nouns. */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}
