"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { parseCSV, validateCSVData } from "@/lib/utils/csv-parser"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (file: File) => Promise<void>
  isPending?: boolean
}

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  isPending,
}: ImportDialogProps) {
  const t = useTranslations("studio.dictionary")
  const tc = useTranslations("studio.common")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Array<Record<string, string>> | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const text = await selectedFile.text()
      const rows = parseCSV(text)
      const validation = validateCSVData(rows)

      if (!validation.valid) {
        toast.error(t("csvValidationFailed"), {
          description: validation.errors.join(", "),
        })
        setPreview(null)
        return
      }

      setPreview(rows.slice(0, 10))
      if (rows.length > 10) {
        toast.info(t("csvPreviewInfo", { total: rows.length }))
      }
    } catch (error) {
      toast.error(t("csvParseFailed"), {
        description: error instanceof Error ? error.message : "Unknown error",
      })
      setPreview(null)
    }
  }

  const handleImport = async () => {
    if (!file) return
    await onImport(file)
    // Reset state on success (parent handles closing)
    setFile(null)
    setPreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("importTitle")}</DialogTitle>
          <DialogDescription>
            {t("importDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">{t("csvFileLabel")}</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {t("csvHeadersHint")}
            </p>
          </div>

          {preview && (
            <div className="space-y-2">
              <Label>{t("previewRows", { count: Math.min(10, preview.length) })}</Label>
              <div className="rounded-md border max-h-64 overflow-auto scroll-fade-x">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colHeadLemma")}</TableHead>
                      <TableHead>{t("colHeadGloss")}</TableHead>
                      <TableHead>{t("colHeadIpa")}</TableHead>
                      <TableHead>{t("fieldPos")}</TableHead>
                      <TableHead>{t("impColEtymology")}</TableHead>
                      <TableHead>{t("fieldTags")}</TableHead>
                      <TableHead>{t("impColRelated")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.lemma}</TableCell>
                        <TableCell>{row.gloss}</TableCell>
                        <TableCell className="font-ipa text-sm">
                          {row.ipa ? `/${row.ipa}/` : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.partOfSpeech || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.etymology || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.tags || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.relatedWords || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setFile(null)
              setPreview(null)
            }}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isPending || !preview}
          >
            {isPending ? t("importingBtn") : t("importEntriesBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

