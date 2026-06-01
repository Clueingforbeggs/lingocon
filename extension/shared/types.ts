export interface Language {
  id: string
  name: string
  slug: string
  fontFamily: string | null
  fontUrl: string | null
  fontScale: number
  entryCount: number
}

export interface DictionaryEntry {
  id: string
  lemma: string
  gloss: string
  ipa: string | null
  partOfSpeech: string | null
  tags: string[] | null
}

export interface ScriptSymbol {
  id: string
  symbol: string
  capitalSymbol: string | null
  ipa: string | null
  latin: string | null
  order: number
}

export interface LanguageMeta {
  id: string
  name: string
  slug: string
  fontUrl: string | null
  fontFamily: string | null
  fontScale: number
  allowsDiacritics: boolean
  metadata: Record<string, unknown> | null
}

/** Stored in chrome.storage.local */
export interface ExtensionSettings {
  token: string | null
  activeLanguageId: string | null
  displayMode: "replace" | "bilingual" | "hover"
  showIpa: boolean
  showOriginal: boolean
  applyCustomFont: boolean
  sourceLanguage: string // e.g. "en"
  disabledSites: string[] // hostname list
  siteLanguageOverrides: Record<string, string> // hostname → languageId
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  token: null,
  activeLanguageId: null,
  displayMode: "replace",
  showIpa: true,
  showOriginal: true,
  applyCustomFont: true,
  sourceLanguage: "en",
  disabledSites: [],
  siteLanguageOverrides: {},
}

// Messages between content script <-> service worker
export type Message =
  | { type: "TRANSLATE_WORDS"; words: string[] }
  | { type: "TRANSLATE_WORDS_RESULT"; translations: Record<string, TranslationResult> }
  | { type: "GET_SETTINGS" }
  | { type: "SETTINGS_RESULT"; settings: ExtensionSettings }
  | { type: "SET_ACTIVE_LANGUAGE"; languageId: string }
  | { type: "TOGGLE_SITE"; hostname: string; disabled: boolean }
  | { type: "PAGE_STATS"; total: number; translated: number; missing: string[] }

export interface TranslationResult {
  lemma: string
  ipa: string | null
  partOfSpeech: string | null
}

export interface CacheEntry {
  entries: DictionaryEntry[]
  etag: string
  syncedAt: string
  total: number
}

export interface ScriptCacheEntry {
  symbols: ScriptSymbol[]
  etag: string
  syncedAt: string
}
