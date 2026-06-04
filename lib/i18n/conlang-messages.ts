import { prisma } from '@/lib/prisma';
import { getTotalKeyCount } from './config';

// Fetches translations for a specific conlang and formats them
// back into the nested object structure expected by next-intl.
// Only returns data for PUBLIC languages to prevent leaking PRIVATE content
// via the NEXT_LOCALE cookie.
export async function getConlangMessages(languageId: string): Promise<Record<string, any>> {
  const language = await prisma.language.findUnique({
    where: { id: languageId },
    select: { visibility: true },
  });

  if (!language || language.visibility !== 'PUBLIC') return {};

  const translations = await prisma.conlangTranslation.findMany({
    where: { languageId }
  });

  const messages: Record<string, any> = {};

  for (const { key, value } of translations) {
    // Split key by dot notation (e.g. "nav.home" -> ["nav", "home"])
    const parts = key.split('.');
    let current = messages;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  return messages;
}

// Deep merges a partial overlay onto a base message object
export function mergeMessages(base: Record<string, any>, overlay: Record<string, any>): Record<string, any> {
  const result = { ...base };

  for (const key in overlay) {
    if (typeof overlay[key] === 'object' && overlay[key] !== null) {
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = mergeMessages(result[key], overlay[key]);
      } else {
        result[key] = { ...overlay[key] };
      }
    } else {
      result[key] = overlay[key];
    }
  }

  return result;
}

// Calculates translation completion percentage
export function getTranslationCompletionPercent(base: Record<string, any>, overlay: Record<string, any>): number {
  const totalKeys = getTotalKeyCount(base);
  if (totalKeys === 0) return 0;

  const translatedKeys = getTotalKeyCount(overlay);
  return Math.round((translatedKeys / totalKeys) * 100);
}
