import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core"

export interface WikiLinkOptions {
  /** The language slug used to build href="/lang/{languageSlug}/grammar/{pageSlug}" */
  languageSlug: string
  HTMLAttributes: Record<string, string>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (options: { slug: string; label?: string }) => ReturnType
    }
  }
}

/**
 * WikiLink — inline node that renders `[[slug]]` or `[[slug|Label]]` as a
 * clickable link to another grammar page within the same language.
 *
 * Input rule: type `[[noun-declension]]` and press Space / Enter to convert.
 */
export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",

  addOptions() {
    return {
      languageSlug: "",
      HTMLAttributes: {},
    }
  },

  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-slug"),
        renderHTML: (attributes) => ({ "data-slug": attributes.slug as string }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label") || null,
        renderHTML: (attributes) =>
          attributes.label ? { "data-label": attributes.label as string } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wiki-link"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const slug = node.attrs.slug as string
    const label = (node.attrs.label as string | null) ?? slug
    const href = this.options.languageSlug
      ? `/lang/${this.options.languageSlug}/grammar/${slug}`
      : `#${slug}`

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "wiki-link",
        href,
        class:
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 no-underline transition-colors cursor-pointer before:content-['↗'] before:text-[10px] before:opacity-60",
      }),
      label,
    ]
  },

  addCommands() {
    return {
      insertWikiLink:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { slug: options.slug, label: options.label ?? null },
          })
        },
    }
  },

  addInputRules() {
    // Matches [[slug]] or [[slug|Label]] at end of input
    return [
      nodeInputRule({
        find: /\[\[([^|\]\s][^|\]]*?)(?:\|([^\]]+))?\]\]$/,
        type: this.type,
        getAttributes: (match) => ({
          slug: match[1].trim(),
          label: match[2]?.trim() ?? null,
        }),
      }),
    ]
  },
})
