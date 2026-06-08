// Shared between the server `browse/page.tsx` (which needs to validate the
// URL param) and the client `category-filter.tsx` (which renders the dropdown).
// Lives in its own module — not the "use client" file — because Next.js can't
// re-export non-function values from a client module into a Server Component.
export const CATEGORY_FILTER_VALUES = [
  "all",
  "CONLANG",
  "NATURAL",
  "ENDANGERED",
  "RESTORED",
  "HISTORICAL",
  "FICTIONAL",
  "AUXILIARY",
  "OTHER",
] as const

export type CategoryFilter = (typeof CATEGORY_FILTER_VALUES)[number]
