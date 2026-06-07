export const defaultLocale = 'en'
// Natural languages shipped with the platform. Conlangs are loaded dynamically
// from the DB and use the `conlang:<id>` prefix in the cookie.
//   - 'free-ru': "Free Russian" — pre-1918 reform Russian orthography
//     (yat ѣ, decimal і, hard sign ъ at word-end, -аго/-яго endings, ея).
export const locales = ['en', 'free-ru'] as const
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
