"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"

/**
 * An animated IPA vowel trapezoid that draws itself on scroll.
 * Used as the visual element in the Philosophy section.
 */
export function IPAVowelChart() {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    return (
        <div ref={ref} className="relative w-full max-w-[320px] mx-auto aspect-square">
            <svg
                viewBox="0 0 300 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
            >
                {/* Trapezoid outline */}
                <motion.path
                    d="M40 20 L280 20 L280 240 L120 240 Z"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-background/20"
                    initial={{ pathLength: 0 }}
                    animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                />

                {/* Horizontal lines */}
                {[20, 75, 130, 185, 240].map((y, i) => {
                    const leftX = 40 + (120 - 40) * ((y - 20) / 220)
                    return (
                        <motion.line
                            key={`h-${i}`}
                            x1={leftX}
                            y1={y}
                            x2={280}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-background/10"
                            initial={{ pathLength: 0 }}
                            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                            transition={{ duration: 1.5, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                        />
                    )
                })}

                {/* Vertical lines */}
                {[100, 160, 220, 280].map((x, i) => (
                    <motion.line
                        key={`v-${i}`}
                        x1={x}
                        y1={20}
                        x2={x}
                        y2={240}
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-background/10"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                        transition={{ duration: 1.5, delay: 0.8 + i * 0.15, ease: "easeOut" }}
                    />
                ))}

                {/* Vowel labels */}
                {[
                    { x: 45, y: 18, label: "i", delay: 1.5 },
                    { x: 275, y: 18, label: "u", delay: 1.6 },
                    { x: 55, y: 75, label: "e", delay: 1.7 },
                    { x: 275, y: 75, label: "o", delay: 1.8 },
                    { x: 80, y: 130, label: "ɛ", delay: 1.9 },
                    { x: 275, y: 130, label: "ɔ", delay: 2.0 },
                    { x: 100, y: 185, label: "æ", delay: 2.1 },
                    { x: 130, y: 240, label: "a", delay: 2.2 },
                    { x: 275, y: 240, label: "ɑ", delay: 2.3 },
                    { x: 170, y: 130, label: "ə", delay: 2.0 },
                ].map((vowel, i) => (
                    <motion.g key={i}>
                        {/* Dot */}
                        <motion.circle
                            cx={vowel.x}
                            cy={vowel.y}
                            r="3"
                            className="fill-background/60"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.4, delay: vowel.delay }}
                        />
                        {/* Label */}
                        <motion.text
                            x={vowel.x + 8}
                            y={vowel.y + 5}
                            className="fill-background/50"
                            fontSize="14"
                            fontFamily="var(--font-jetbrains-mono), monospace"
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : {}}
                            transition={{ duration: 0.4, delay: vowel.delay + 0.1 }}
                        >
                            {vowel.label}
                        </motion.text>
                    </motion.g>
                ))}

                {/* Header labels */}
                {[
                    { x: 50, y: 8, label: "Front" },
                    { x: 155, y: 8, label: "Central" },
                    { x: 250, y: 8, label: "Back" },
                ].map((header, i) => (
                    <motion.text
                        key={`header-${i}`}
                        x={header.x}
                        y={header.y}
                        className="fill-background/30"
                        fontSize="9"
                        fontFamily="var(--font-jetbrains-mono), monospace"
                        textAnchor="middle"
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.5, delay: 2.5 }}
                    >
                        {header.label}
                    </motion.text>
                ))}
            </svg>
        </div>
    )
}
