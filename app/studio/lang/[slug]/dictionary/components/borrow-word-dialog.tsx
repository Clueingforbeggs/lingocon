"use client"

import { useState, useEffect, useCallback } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Globe,
  Languages,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { searchLanguages, searchLanguageDictionary } from "@/app/actions/borrow"

interface BorrowWordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  languageId: string
  languageName: string
  onBorrow: (data: {
    lemma: string
    gloss: string
    ipa?: string
    partOfSpeech?: string
    etymology: string
    tags: string[]
  }) => void
}

// Common real-world languages for quick selection
const REAL_LANGUAGES = [
  "English", "Latin", "Greek", "Arabic", "Japanese",
  "Chinese", "Sanskrit", "French", "Spanish", "German",
  "Russian", "Korean", "Hindi", "Swahili", "Finnish",
  "Turkish", "Hebrew", "Persian", "Nahuatl", "Quechua",
]

export function BorrowWordDialog({
  open,
  onOpenChange,
  languageId,
  languageName,
  onBorrow,
}: BorrowWordDialogProps) {
  const t = useTranslations("borrow")
  const [tab, setTab] = useState("lingocon")

  // LingoCon tab state
  const [langQuery, setLangQuery] = useState("")
  const [languages, setLanguages] = useState<any[]>([])
  const [selectedLang, setSelectedLang] = useState<any>(null)
  const [wordQuery, setWordQuery] = useState("")
  const [entries, setEntries] = useState<any[]>([])
  const [sourceLangName, setSourceLangName] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Real language tab state
  const [realLangName, setRealLangName] = useState("")
  const [realWord, setRealWord] = useState("")
  const [realGloss, setRealGloss] = useState("")
  const [realIpa, setRealIpa] = useState("")
  const [realPos, setRealPos] = useState("")

  // Adaptation state (shared)
  const [adaptedForm, setAdaptedForm] = useState("")
  const [selectedEntry, setSelectedEntry] = useState<any>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setTab("lingocon")
      setLangQuery("")
      setLanguages([])
      setSelectedLang(null)
      setWordQuery("")
      setEntries([])
      setSourceLangName("")
      setSelectedEntry(null)
      setAdaptedForm("")
      setRealLangName("")
      setRealWord("")
      setRealGloss("")
      setRealIpa("")
      setRealPos("")
    }
  }, [open])

  // Search languages
  const handleSearchLanguages = useCallback(async () => {
    if (!langQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await searchLanguages(langQuery, languageId)
      setLanguages(results)
    } finally {
      setIsSearching(false)
    }
  }, [langQuery, languageId])

  // Search words in selected language
  const handleSearchWords = useCallback(async () => {
    if (!selectedLang || !wordQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await searchLanguageDictionary(selectedLang.id, wordQuery)
      setEntries(result.entries)
      setSourceLangName(result.languageName)
    } finally {
      setIsSearching(false)
    }
  }, [selectedLang, wordQuery])

  // Handle selecting a word from LingoCon
  const handleSelectWord = (entry: any) => {
    setSelectedEntry(entry)
    setAdaptedForm(entry.lemma) // Default: keep original form
  }

  // Handle borrowing from LingoCon
  const handleBorrowFromLingocon = () => {
    if (!selectedEntry || !adaptedForm) return
    onBorrow({
      lemma: adaptedForm,
      gloss: selectedEntry.gloss,
      ipa: selectedEntry.ipa || undefined,
      partOfSpeech: selectedEntry.partOfSpeech || undefined,
      etymology: t("etymologyFromLingocon", { lang: sourceLangName, word: selectedEntry.lemma }),
      tags: ["loanword"],
    })
    onOpenChange(false)
  }

  // Handle borrowing from real language
  const handleBorrowFromReal = () => {
    if (!realWord || !realGloss || !realLangName) return
    onBorrow({
      lemma: adaptedForm || realWord,
      gloss: realGloss,
      ipa: realIpa || undefined,
      partOfSpeech: realPos || undefined,
      etymology: t("etymologyFromReal", { lang: realLangName, word: realWord }),
      tags: ["loanword"],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("desc", { name: languageName })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lingocon" className="gap-2">
              <Globe className="h-4 w-4" />
              {t("tabLingocon")}
            </TabsTrigger>
            <TabsTrigger value="real" className="gap-2">
              <Languages className="h-4 w-4" />
              {t("tabReal")}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Borrow from LingoCon */}
          <TabsContent value="lingocon" className="flex-1 min-h-0 space-y-4 mt-4">
            {!selectedLang ? (
              // Step 1: Search for a language
              <div className="space-y-3">
                <Label>{t("findLanguage")}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchLanguagesPh")}
                      value={langQuery}
                      onChange={(e) => setLangQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchLanguages()}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSearchLanguages}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search")}
                  </Button>
                </div>
                <ScrollArea className="h-[250px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {languages.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {langQuery
                          ? t("noLanguages")
                          : t("searchLanguagePrompt")}
                      </div>
                    ) : (
                      languages.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setSelectedLang(lang)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                        >
                          <div>
                            <span className="font-medium">{lang.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              /{lang.slug}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {t("wordsCount", { count: lang._count.dictionaryEntries })}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : !selectedEntry ? (
              // Step 2: Search for a word in selected language
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    {t("browse")}{" "}
                    <span className="font-semibold text-primary">{selectedLang.name}</span>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLang(null)
                      setEntries([])
                      setWordQuery("")
                    }}
                  >
                    {t("changeLanguage")}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("searchWordsPh")}
                      value={wordQuery}
                      onChange={(e) => setWordQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchWords()}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSearchWords}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("search")}
                  </Button>
                </div>
                <ScrollArea className="h-[250px] rounded-md border">
                  <div className="p-2 space-y-1">
                    {entries.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {wordQuery
                          ? t("noEntries")
                          : t("searchWordPrompt")}
                      </div>
                    ) : (
                      entries.map((entry: any) => (
                        <button
                          key={entry.id}
                          onClick={() => handleSelectWord(entry)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                        >
                          <span className="font-serif font-medium">{entry.lemma}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground truncate flex-1">
                            {entry.gloss}
                          </span>
                          {entry.partOfSpeech && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {entry.partOfSpeech}
                            </Badge>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              // Step 3: Adapt and confirm
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t("adaptTitle")}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEntry(null)
                      setAdaptedForm("")
                    }}
                  >
                    {t("pickAnother")}
                  </Button>
                </div>

                {/* Source preview */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">{t("source", { name: sourceLangName })}</div>
                      <div className="font-serif text-lg">{selectedEntry.lemma}</div>
                      <div className="text-sm text-muted-foreground">{selectedEntry.gloss}</div>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">{t("adapted", { name: languageName })}</div>
                      <div className="font-serif text-lg text-primary">
                        {adaptedForm || "..."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adapted-form">{t("adaptedForm")}</Label>
                  <Input
                    id="adapted-form"
                    value={adaptedForm}
                    onChange={(e) => setAdaptedForm(e.target.value)}
                    placeholder={t("adaptedFormPh")}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("adaptHint")}
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleBorrowFromLingocon} disabled={!adaptedForm}>
                    <Check className="h-4 w-4 mr-2" />
                    {t("title")}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Borrow from Real Language */}
          <TabsContent value="real" className="flex-1 min-h-0 space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t("sourceLanguage")}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REAL_LANGUAGES.filter(l => l !== realLangName).slice(0, 12).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setRealLangName(lang)}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border transition-colors",
                        realLangName === lang
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <Input
                  value={realLangName}
                  onChange={(e) => setRealLangName(e.target.value)}
                  placeholder={t("sourceLanguagePh")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("originalWord")}</Label>
                  <Input
                    value={realWord}
                    onChange={(e) => {
                      setRealWord(e.target.value)
                      if (!adaptedForm) setAdaptedForm(e.target.value)
                    }}
                    placeholder={t("originalWordPh")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("glossMeaning")}</Label>
                  <Input
                    value={realGloss}
                    onChange={(e) => setRealGloss(e.target.value)}
                    placeholder={t("glossMeaningPh")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("ipaOptional")}</Label>
                  <Input
                    value={realIpa}
                    onChange={(e) => setRealIpa(e.target.value)}
                    placeholder="/ˈa.kwa/"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("partOfSpeech")}</Label>
                  <Input
                    value={realPos}
                    onChange={(e) => setRealPos(e.target.value)}
                    placeholder={t("posPh")}
                  />
                </div>
              </div>

              {/* Adapted form */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {realLangName || t("sourceFallback")}: <span className="font-medium text-foreground">{realWord || "..."}</span>
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {languageName}: <span className="font-medium text-primary">{adaptedForm || "..."}</span>
                  </span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adapted-real" className="text-xs">{t("adaptedInYourLang")}</Label>
                  <Input
                    id="adapted-real"
                    value={adaptedForm}
                    onChange={(e) => setAdaptedForm(e.target.value)}
                    placeholder={t("adaptedRealPh")}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleBorrowFromReal}
                disabled={!realWord || !realGloss || !realLangName}
              >
                <Check className="h-4 w-4 mr-2" />
                {t("title")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
