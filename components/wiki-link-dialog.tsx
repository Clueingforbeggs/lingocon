"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link2 } from "lucide-react"

interface GrammarPageRef {
  id: string
  title: string
  slug: string
}

interface WikiLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  grammarPages: GrammarPageRef[]
  onSelect: (slug: string, label?: string) => void
}

export function WikiLinkDialog({
  open,
  onOpenChange,
  grammarPages,
  onSelect,
}: WikiLinkDialogProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return grammarPages
    return grammarPages.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    )
  }, [query, grammarPages])

  const handleSelect = (page: GrammarPageRef) => {
    onSelect(page.slug, page.title)
    setQuery("")
    onOpenChange(false)
  }

  const handleManualSlug = () => {
    const slug = query.trim().toLowerCase().replace(/\s+/g, "-")
    if (!slug) return
    onSelect(slug)
    setQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Link to grammar page
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 py-2 border-b">
          <Input
            autoFocus
            placeholder="Search by title or slug…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filtered.length === 1) {
                  handleSelect(filtered[0])
                } else if (filtered.length === 0 && query.trim()) {
                  handleManualSlug()
                }
              }
            }}
          />
        </div>

        <ScrollArea className="max-h-60">
          <div className="p-1">
            {filtered.length === 0 ? (
              query.trim() ? (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 rounded text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={handleManualSlug}
                >
                  Insert as slug <code className="text-primary">[[{query.trim().toLowerCase().replace(/\s+/g, "-")}]]</code>
                </button>
              ) : (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No grammar pages yet.
                  <br />
                  Type a slug to insert manually.
                </p>
              )
            ) : (
              filtered.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(page)}
                >
                  <div className="text-sm font-medium">{page.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{page.slug}</div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2 border-t text-xs text-muted-foreground">
          Tip: you can also type <code className="text-foreground">[[slug]]</code> directly in the editor.
        </div>
      </DialogContent>
    </Dialog>
  )
}
