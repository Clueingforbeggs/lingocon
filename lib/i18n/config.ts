export const defaultLocale = 'en'
// Natural languages shipped with the platform. Conlangs are loaded dynamically
// from the DB and use the `conlang:<id>` prefix in the cookie.
//   - 'free-ru': "Russian" — modern standard Russian. (The `free-ru` code is
//     retained so existing locale cookies keep working; the display label and
//     content are plain modern Russian.)
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
