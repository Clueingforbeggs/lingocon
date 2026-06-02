/**
 * Language permission catalogue — shared between server (auth-helpers) and client (UI components).
 * Keep this file free of server-only imports.
 */

export const EDITOR_DEFAULT_PERMISSIONS = [
  "write:dictionary",
  "write:grammar",
  "write:alphabet",
  "write:phonology",
  "write:paradigms",
  "write:articles",
  "write:texts",
  "write:settings",
  "manage:modules",
  "draft:articles",
  "draft:texts",
] as const

export type LanguagePermission = (typeof EDITOR_DEFAULT_PERMISSIONS)[number]

export const PERMISSION_LABELS: Record<LanguagePermission, string> = {
  "write:dictionary": "Dictionary",
  "write:grammar": "Grammar",
  "write:alphabet": "Alphabet / Script",
  "write:phonology": "Phonology & Sound Changes",
  "write:paradigms": "Paradigms",
  "write:articles": "Articles",
  "write:texts": "Texts",
  "write:settings": "Language Settings",
  "manage:modules": "Modules",
  "draft:articles": "Submit article drafts",
  "draft:texts": "Submit text drafts",
}

/** Permissions granted to a Full Editor collaborator. */
export const FULL_EDITOR_PERMISSIONS: LanguagePermission[] = [
  "write:dictionary",
  "write:grammar",
  "write:alphabet",
  "write:phonology",
  "write:paradigms",
  "write:articles",
  "write:texts",
  "write:settings",
  "manage:modules",
]
