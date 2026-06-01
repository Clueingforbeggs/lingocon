/**
 * Theme-aware data-visualisation palette. These read the CSS variables defined
 * in globals.css, so charts automatically follow the active palette (Aurora /
 * Classic) and light / dark mode without any extra wiring.
 *
 * Kept in a plain (non-"use client") module so it can be imported from both
 * Server and Client Components. Importing this constant from the "use client"
 * charts module inside a Server Component turns it into an unresolvable client
 * reference ("Could not find the module ...#CHART_COLORS#0 in the React Client
 * Manifest").
 */
export const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
]
