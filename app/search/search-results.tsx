"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { SearchScope, SearchResult } from "@/lib/services/search"
import { SearchHero } from "@/components/search/search-hero"
import { SearchTabs } from "@/components/search/search-tabs"
import { ResultCard } from "@/components/search/result-card"
import { SearchEmpty } from "@/components/search/search-empty"
import { Loader2 } from "lucide-react"

export function SearchResults() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialQuery = searchParams.get("q") || ""
    const [query, setQuery] = useState(initialQuery)
    const [activeTab, setActiveTab] = useState<SearchScope>("all")
    const [results, setResults] = useState<SearchResult | null>(null)
    const [loading, setLoading] = useState(false)

    const debouncedQuery = useDebounce(query, 300)

    // Sync URL with query
    useEffect(() => {
        const params = new URLSearchParams(searchParams)
        if (debouncedQuery) {
            params.set("q", debouncedQuery)
        } else {
            params.delete("q")
        }
        router.replace(`/search?${params.toString()}`, { scroll: false })
    }, [debouncedQuery, router, searchParams])

    // Fetch results
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults(null)
            return
        }

        setLoading(true)
        fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&scope=${activeTab}`)
            .then((res) => res.json())
            .then((data) => {
                setResults(data)
                setLoading(false)
            })
            .catch((err) => {
                console.error(err)
                setLoading(false)
            })
    }, [debouncedQuery, activeTab])

    const counts = {
        all: results ? results.languages.length + results.entries.length + results.grammarPages.length + results.articles.length + results.texts.length : 0,
        languages: results?.languages.length || 0,
        dictionary: results?.entries.length || 0,
        grammar: results?.grammarPages.length || 0,
        articles: results?.articles.length || 0,
        texts: results?.texts.length || 0,
    }

    const showLanguages = (activeTab === "all" || activeTab === "languages") && results?.languages.length
    const showEntries = (activeTab === "all" || activeTab === "dictionary") && results?.entries.length
    const showGrammar = (activeTab === "all" || activeTab === "grammar") && results?.grammarPages.length
    const showArticles = (activeTab === "all" || activeTab === "articles") && results?.articles.length
    const showTexts = (activeTab === "all" || activeTab === "texts") && results?.texts.length

    return (
        <div className="mx-auto w-full max-w-5xl md:px-6">
            <SearchHero value={query} onChange={setQuery} compact={debouncedQuery.length > 0} />

            {debouncedQuery.length >= 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <SearchTabs
                        currentTab={activeTab}
                        onTabChange={setActiveTab}
                        counts={counts}
                    />

                    {loading ? (
                        <div className="flex justify-center py-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
                        </div>
                    ) : !results || counts.all === 0 ? (
                        <SearchEmpty />
                    ) : (
                        <div className="px-4 md:px-0 max-w-[700px] flex flex-col space-y-4 pb-24">
                            {showLanguages ? (
                                <div className="flex flex-col space-y-2">
                                    {results.languages.map((lang) => (
                                        <ResultCard
                                            key={lang.id}
                                            result={{ ...lang, type: "language" }}
                                        />
                                    ))}
                                </div>
                            ) : null}

                            {(showEntries || showGrammar || showArticles || showTexts) && (
                                <div className="flex flex-col space-y-2">
                                    {showEntries ? (
                                        <div className="flex flex-col space-y-2">
                                            {activeTab === "all" && <h3 className="font-medium text-muted-foreground mt-6 mb-2 border-b pb-2">Dictionary Entries</h3>}
                                            {results?.entries.map((entry) => (
                                                <ResultCard
                                                    key={entry.id}
                                                    result={{ ...entry, type: "entry" }}
                                                />
                                            ))}
                                        </div>
                                    ) : null}

                                    {showGrammar ? (
                                        <div className="flex flex-col space-y-2">
                                            {activeTab === "all" && <h3 className="font-medium text-muted-foreground mt-6 mb-2 border-b pb-2">Grammar Pages</h3>}
                                            {results?.grammarPages.map((page) => (
                                                <ResultCard
                                                    key={page.id}
                                                    result={{ ...page, type: "grammar" }}
                                                />
                                            ))}
                                        </div>
                                    ) : null}

                                    {showArticles ? (
                                        <div className="flex flex-col space-y-2">
                                            {activeTab === "all" && <h3 className="font-medium text-muted-foreground mt-6 mb-2 border-b pb-2">Articles</h3>}
                                            {results?.articles.map((article) => (
                                                <ResultCard
                                                    key={article.id}
                                                    result={{ ...article, type: "article" }}
                                                />
                                            ))}
                                        </div>
                                    ) : null}

                                    {showTexts ? (
                                        <div className="flex flex-col space-y-2">
                                            {activeTab === "all" && <h3 className="font-medium text-muted-foreground mt-6 mb-2 border-b pb-2">Texts</h3>}
                                            {results?.texts.map((text) => (
                                                <ResultCard
                                                    key={text.id}
                                                    result={{ ...text, type: "text" }}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                            
                            <div className="mt-12 py-8 flex items-center justify-center border-t border-border/40">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-4xl font-extrabold tracking-widest text-primary flex items-center">
                                        <span className="text-blue-500">L</span>
                                        <span className="text-red-500">I</span>
                                        <span className="text-amber-500">N</span>
                                        <span className="text-blue-500">G</span>
                                        <span className="text-green-500">O</span>
                                        <span className="text-red-500">C</span>
                                        <span className="text-amber-500">O</span>
                                        <span className="text-blue-500">N</span>
                                    </div>
                                    <div className="flex gap-2 text-sm text-blue-600 dark:text-blue-400 mt-2">
                                        <span className="hover:underline cursor-pointer">1</span>
                                        <span className="hover:underline cursor-pointer">2</span>
                                        <span className="hover:underline cursor-pointer">3</span>
                                        <span className="hover:underline cursor-pointer">4</span>
                                        <span className="hover:underline cursor-pointer">5</span>
                                        <span className="text-foreground ml-2">Next</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
