export function resolveGrantedPermissions(
  granted: unknown,
  declared: unknown
): string[] {
  const g = granted as string[] | null
  const d = declared as string[] | null
  if (g && g.length > 0) return g
  return d ?? []
}

export function rulesTextFromData(data: unknown): string {
  if (!data || typeof data !== "object") return ""
  const raw = (data as Record<string, unknown>).rules
  if (Array.isArray(raw)) return raw.map(String).join("\n")
  return typeof raw === "string" ? raw : ""
}
