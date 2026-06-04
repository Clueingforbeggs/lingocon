export const defaultLocale = 'en'
export const locales = ['en'] as const // Natural languages; conlangs are dynamic
export type Locale = typeof locales[number]

// Cookie name for storing locale preference
export const LOCALE_COOKIE = 'NEXT_LOCALE'

// Total translatable key count (used for percentage calculation)
export function getTotalKeyCount(messages: Record<string, any>): number {
  let count = 0;
  for (const key in messages) {
    if (typeof messages[key] === 'object' && messages[key] !== null) {
      count += getTotalKeyCount(messages[key]);
    } else if (typeof messages[key] === 'string') {
      count++;
    }
  }
  return count;
}
