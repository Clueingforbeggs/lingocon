// Standard IPA consonant chart layout
export const CONSONANT_PLACES = [
    "Bilabial", "Labiodental", "Dental", "Alveolar", "Postalveolar",
    "Retroflex", "Palatal", "Velar", "Uvular", "Pharyngeal", "Glottal"
] as const

export const CONSONANT_MANNERS = [
    "Plosive", "Nasal", "Trill", "Tap/Flap", "Fricative",
    "Lateral fricative", "Affricate", "Approximant", "Lateral approximant"
] as const

// Map IPA symbols to place/manner
export const IPA_CONSONANT_MAP: Record<string, { place: string; manner: string; voiced: boolean }> = {
    "p": { place: "Bilabial", manner: "Plosive", voiced: false },
    "b": { place: "Bilabial", manner: "Plosive", voiced: true },
    "t": { place: "Alveolar", manner: "Plosive", voiced: false },
    "d": { place: "Alveolar", manner: "Plosive", voiced: true },
    "ʈ": { place: "Retroflex", manner: "Plosive", voiced: false },
    "ɖ": { place: "Retroflex", manner: "Plosive", voiced: true },
    "c": { place: "Palatal", manner: "Plosive", voiced: false },
    "ɟ": { place: "Palatal", manner: "Plosive", voiced: true },
    "k": { place: "Velar", manner: "Plosive", voiced: false },
    "g": { place: "Velar", manner: "Plosive", voiced: true },
    "ɡ": { place: "Velar", manner: "Plosive", voiced: true },
    "q": { place: "Uvular", manner: "Plosive", voiced: false },
    "ɢ": { place: "Uvular", manner: "Plosive", voiced: true },
    "ʔ": { place: "Glottal", manner: "Plosive", voiced: false },
    "m": { place: "Bilabial", manner: "Nasal", voiced: true },
    "ɱ": { place: "Labiodental", manner: "Nasal", voiced: true },
    "n": { place: "Alveolar", manner: "Nasal", voiced: true },
    "ɳ": { place: "Retroflex", manner: "Nasal", voiced: true },
    "ɲ": { place: "Palatal", manner: "Nasal", voiced: true },
    "ŋ": { place: "Velar", manner: "Nasal", voiced: true },
    "ɴ": { place: "Uvular", manner: "Nasal", voiced: true },
    "ʙ": { place: "Bilabial", manner: "Trill", voiced: true },
    "r": { place: "Alveolar", manner: "Trill", voiced: true },
    "ʀ": { place: "Uvular", manner: "Trill", voiced: true },
    "ⱱ": { place: "Labiodental", manner: "Tap/Flap", voiced: true },
    "ɾ": { place: "Alveolar", manner: "Tap/Flap", voiced: true },
    "ɽ": { place: "Retroflex", manner: "Tap/Flap", voiced: true },
    "ɺ": { place: "Alveolar", manner: "Tap/Flap", voiced: true },
    "ɸ": { place: "Bilabial", manner: "Fricative", voiced: false },
    "β": { place: "Bilabial", manner: "Fricative", voiced: true },
    "f": { place: "Labiodental", manner: "Fricative", voiced: false },
    "v": { place: "Labiodental", manner: "Fricative", voiced: true },
    "θ": { place: "Dental", manner: "Fricative", voiced: false },
    "ð": { place: "Dental", manner: "Fricative", voiced: true },
    "s": { place: "Alveolar", manner: "Fricative", voiced: false },
    "z": { place: "Alveolar", manner: "Fricative", voiced: true },
    "ʃ": { place: "Postalveolar", manner: "Fricative", voiced: false },
    "ʒ": { place: "Postalveolar", manner: "Fricative", voiced: true },
    "ʂ": { place: "Retroflex", manner: "Fricative", voiced: false },
    "ʐ": { place: "Retroflex", manner: "Fricative", voiced: true },
    "ç": { place: "Palatal", manner: "Fricative", voiced: false },
    "ʝ": { place: "Palatal", manner: "Fricative", voiced: true },
    "x": { place: "Velar", manner: "Fricative", voiced: false },
    "ɣ": { place: "Velar", manner: "Fricative", voiced: true },
    "χ": { place: "Uvular", manner: "Fricative", voiced: false },
    "ʁ": { place: "Uvular", manner: "Fricative", voiced: true },
    "ħ": { place: "Pharyngeal", manner: "Fricative", voiced: false },
    "ʕ": { place: "Pharyngeal", manner: "Fricative", voiced: true },
    "h": { place: "Glottal", manner: "Fricative", voiced: false },
    "ɦ": { place: "Glottal", manner: "Fricative", voiced: true },
    "ɬ": { place: "Alveolar", manner: "Lateral fricative", voiced: false },
    "ɮ": { place: "Alveolar", manner: "Lateral fricative", voiced: true },
    // Alveolo-palatal fricatives (mapped to Postalveolar for chart placement)
    "ɕ": { place: "Postalveolar", manner: "Fricative", voiced: false },
    "ʑ": { place: "Postalveolar", manner: "Fricative", voiced: true },
    // Epiglottal (mapped to Pharyngeal for chart placement)
    "ʜ": { place: "Pharyngeal", manner: "Trill", voiced: false },
    "ʢ": { place: "Pharyngeal", manner: "Trill", voiced: true },
    "ʡ": { place: "Pharyngeal", manner: "Plosive", voiced: false },
    // Approximants
    "ʋ": { place: "Labiodental", manner: "Approximant", voiced: true },
    "ɹ": { place: "Alveolar", manner: "Approximant", voiced: true },
    "ɻ": { place: "Retroflex", manner: "Approximant", voiced: true },
    "j": { place: "Palatal", manner: "Approximant", voiced: true },
    "ɰ": { place: "Velar", manner: "Approximant", voiced: true },
    "l": { place: "Alveolar", manner: "Lateral approximant", voiced: true },
    "ɫ": { place: "Alveolar", manner: "Lateral approximant", voiced: true },
    "ɭ": { place: "Retroflex", manner: "Lateral approximant", voiced: true },
    "ɼ": { place: "Dental", manner: "Fricative", voiced: true },
    "ʎ": { place: "Palatal", manner: "Lateral approximant", voiced: true },
    "ʟ": { place: "Velar", manner: "Lateral approximant", voiced: true },
    "w": { place: "Velar", manner: "Approximant", voiced: true },
    "ʍ": { place: "Velar", manner: "Fricative", voiced: false },
    "ɥ": { place: "Palatal", manner: "Approximant", voiced: true },
    // Affricates
    "ts": { place: "Alveolar", manner: "Affricate", voiced: false },
    "dz": { place: "Alveolar", manner: "Affricate", voiced: true },
    "tʃ": { place: "Postalveolar", manner: "Affricate", voiced: false },
    "dʒ": { place: "Postalveolar", manner: "Affricate", voiced: true },
    "tɕ": { place: "Palatal", manner: "Affricate", voiced: false },
    "dʑ": { place: "Palatal", manner: "Affricate", voiced: true },
    "ʈʂ": { place: "Retroflex", manner: "Affricate", voiced: false },
    "ɖʐ": { place: "Retroflex", manner: "Affricate", voiced: true },
    "pf": { place: "Bilabial", manner: "Affricate", voiced: false },
    "bv": { place: "Bilabial", manner: "Affricate", voiced: true },
    "kx": { place: "Velar", manner: "Affricate", voiced: false },
    "gɣ": { place: "Velar", manner: "Affricate", voiced: true },
    "ɡɣ": { place: "Velar", manner: "Affricate", voiced: true },
}

// IPA vowel positions
export const VOWEL_HEIGHTS = ["Close", "Near-close", "Close-mid", "Mid", "Open-mid", "Near-open", "Open"] as const
export const VOWEL_BACKNESS = ["Front", "Central", "Back"] as const

export type PhonemeKind = "consonant" | "vowel" | null

/**
 * Strip IPA diacritics from a symbol to recover its base letter for
 * classification. Removes both combining marks (U+0300–U+036F and the
 * Combining Diacritical Marks Supplement U+1DC0–U+1DFF) and spacing modifier
 * letters (U+02B0–U+02FF: ʰ ʷ ʲ ˠ ˤ ʼ ˞ and the length marks ː ˑ), which is the
 * block where aspiration/labialization/length live. Affricate tie bars
 * (U+0361 / U+035C) fall inside the combining range and are stripped too.
 *
 * The caller keeps the full symbol; this base is only used to look up
 * place/manner/height in the maps, so e.g. tʰ, kʷ, aː, ɑ̃ resolve to t, k, a, ɑ.
 */
export function getBaseIpa(symbol: string): string {
    return symbol
        .normalize("NFD")
        .replace(/[\u0300-\u036f\u1dc0-\u1dff]/g, "") // combining marks
        .replace(/[\u02b0-\u02ff]/g, "") // spacing modifier letters: aspiration, labialization, length, etc.
}

/**
 * Classify an IPA symbol as a consonant or vowel, tolerating diacritics and the
 * chart wrappers/tie bars the keyboard emits. Tries the cleaned symbol as a
 * direct map key first (so distinct diacriticized keys like e̞ and affricates
 * like t͡s → ts resolve correctly), then falls back to the diacritic-stripped
 * base. Returns null when neither the symbol nor its base is a known phoneme.
 */
export function getPhonemeKind(symbol: string): PhonemeKind {
    const cleaned = symbol
        .replace(/[\/\[\]]/g, "")
        .replace(/[\u0361\u035c]/g, "")
        .trim()
    const base = getBaseIpa(cleaned)
    if (IPA_CONSONANT_MAP[cleaned]) return "consonant"
    if (IPA_VOWEL_MAP[cleaned]) return "vowel"
    if (IPA_CONSONANT_MAP[base]) return "consonant"
    if (IPA_VOWEL_MAP[base]) return "vowel"
    return null
}

export const IPA_VOWEL_MAP: Record<string, { height: string; backness: string; rounded: boolean }> = {
    "i": { height: "Close", backness: "Front", rounded: false },
    "y": { height: "Close", backness: "Front", rounded: true },
    "ɨ": { height: "Close", backness: "Central", rounded: false },
    "ʉ": { height: "Close", backness: "Central", rounded: true },
    "ɯ": { height: "Close", backness: "Back", rounded: false },
    "u": { height: "Close", backness: "Back", rounded: true },
    "ɪ": { height: "Near-close", backness: "Front", rounded: false },
    "ʏ": { height: "Near-close", backness: "Front", rounded: true },
    "ʊ": { height: "Near-close", backness: "Back", rounded: true },
    "e": { height: "Close-mid", backness: "Front", rounded: false },
    "ø": { height: "Close-mid", backness: "Front", rounded: true },
    "ɘ": { height: "Close-mid", backness: "Central", rounded: false },
    "ɵ": { height: "Close-mid", backness: "Central", rounded: true },
    "ɤ": { height: "Close-mid", backness: "Back", rounded: false },
    "o": { height: "Close-mid", backness: "Back", rounded: true },
    // Mid vowels (no dedicated IPA symbol — use diacriticized forms)
    "ə": { height: "Mid", backness: "Central", rounded: false },
    "e̞": { height: "Mid", backness: "Front", rounded: false },
    "ø̞": { height: "Mid", backness: "Front", rounded: true },
    "ɤ̞": { height: "Mid", backness: "Back", rounded: false },
    "o̞": { height: "Mid", backness: "Back", rounded: true },
    // Open-mid vowels
    "ɛ": { height: "Open-mid", backness: "Front", rounded: false },
    "œ": { height: "Open-mid", backness: "Front", rounded: true },
    "ɜ": { height: "Open-mid", backness: "Central", rounded: false },
    "ɞ": { height: "Open-mid", backness: "Central", rounded: true },
    "ʌ": { height: "Open-mid", backness: "Back", rounded: false },
    "ɔ": { height: "Open-mid", backness: "Back", rounded: true },
    "æ": { height: "Near-open", backness: "Front", rounded: false },
    "ɐ": { height: "Near-open", backness: "Central", rounded: false },
    "a": { height: "Open", backness: "Front", rounded: false },
    "ɶ": { height: "Open", backness: "Front", rounded: true },
    "ä": { height: "Open", backness: "Central", rounded: false },
    "ɑ": { height: "Open", backness: "Back", rounded: false },
    "ɒ": { height: "Open", backness: "Back", rounded: true },
}

/** A single consonant-chart cell: the voiceless and voiced phonemes at one
 * place + manner. Each is a list so a base and its diacritic variants
 * (e.g. t and tʰ) can coexist instead of overwriting each other. */
export interface ConsonantCell {
    voiceless: string[]
    voiced: string[]
}

export interface ConsonantChartData {
    chart: Record<string, Record<string, ConsonantCell>>
    places: string[]
    manners: string[]
}

/**
 * Group IPA consonant symbols into a place × manner chart. Symbols are matched
 * by their diacritic-stripped base (via getBaseIpa), so diacriticized phonemes
 * (tʰ, kʷ, dʲ …) land in the same cell as their base letter without displacing
 * it. Within a cell, voiceless and voiced are kept separate and each list is
 * sorted with the shortest (base) symbol first. Non-consonants are ignored.
 */
export function buildConsonantChart(symbols: Iterable<string>): ConsonantChartData {
    const chart: Record<string, Record<string, ConsonantCell>> = {}
    const usedPlaces = new Set<string>()
    const usedManners = new Set<string>()

    for (const ipa of symbols) {
        const info = IPA_CONSONANT_MAP[ipa] ?? IPA_CONSONANT_MAP[getBaseIpa(ipa)]
        if (!info) continue

        usedPlaces.add(info.place)
        usedManners.add(info.manner)

        const manner = (chart[info.manner] ??= {})
        const cell = (manner[info.place] ??= { voiceless: [], voiced: [] })
        const bucket = info.voiced ? cell.voiced : cell.voiceless
        if (!bucket.includes(ipa)) bucket.push(ipa)
    }

    const byBaseFirst = (a: string, b: string) => a.length - b.length || a.localeCompare(b)
    for (const places of Object.values(chart)) {
        for (const cell of Object.values(places)) {
            cell.voiceless.sort(byBaseFirst)
            cell.voiced.sort(byBaseFirst)
        }
    }

    return {
        chart,
        places: CONSONANT_PLACES.filter((p) => usedPlaces.has(p)),
        manners: CONSONANT_MANNERS.filter((m) => usedManners.has(m)),
    }
}
