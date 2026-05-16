/**
 * Extract headings from a TipTap JSON document for use in a
 * Table of Contents component.
 *
 * TipTap heading nodes look like:
 *   { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Introduction" }] }
 */

export interface TipTapHeading {
  id: string
  level: 1 | 2 | 3
  text: string
}

interface TipTapNode {
  type?: string
  text?: string
  content?: TipTapNode[]
  attrs?: Record<string, unknown>
}

function nodeText(node: TipTapNode | null | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.text ?? ""
  if (Array.isArray(node.content)) {
    return node.content.map(nodeText).join("")
  }
  return ""
}

/** Slugify heading text for use as an anchor id. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

/**
 * Walk the TipTap document and collect all h1/h2/h3 nodes in order.
 */
export function extractHeadings(content: unknown): TipTapHeading[] {
  if (!content || typeof content !== "object") return []
  const doc = content as TipTapNode
  if (!Array.isArray(doc.content)) return []

  const headings: TipTapHeading[] = []

  function walk(nodes: TipTapNode[]) {
    for (const node of nodes) {
      const level = node.attrs?.level
      if (node.type === "heading" && (level === 1 || level === 2 || level === 3)) {
        const text = nodeText(node)
        if (text.trim()) {
          headings.push({
            id: headingId(text),
            level: level,
            text: text.trim(),
          })
        }
      }
      if (Array.isArray(node.content)) {
        walk(node.content)
      }
    }
  }

  walk(doc.content)
  return headings
}
