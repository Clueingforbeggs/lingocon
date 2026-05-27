import { Search } from "lucide-react"

export function SearchEmpty() {
    return (
        <div className="px-4 md:px-0 md:ml-[140px] pt-8 pb-16">
            <p className="text-sm text-foreground/80 mb-4">
                Your search did not match any documents.
            </p>
            <p className="text-sm text-foreground/60 mb-2">Suggestions:</p>
            <ul className="text-sm text-foreground/60 list-disc ml-5 space-y-1">
                <li>Make sure that all words are spelled correctly.</li>
                <li>Try different keywords.</li>
                <li>Try more general keywords.</li>
                <li>Try fewer keywords.</li>
            </ul>
        </div>
    )
}
