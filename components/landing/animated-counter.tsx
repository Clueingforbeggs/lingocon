"use client"

import { useEffect, useRef } from "react"
import { useInView, useMotionValue, useSpring, motion, useReducedMotion } from "motion/react"

interface AnimatedCounterProps {
    target: number
    suffix?: string
    prefix?: string
    className?: string
    duration?: number
}

export function AnimatedCounter({
    target,
    suffix = "",
    prefix = "",
    className,
    duration = 2,
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })
    const prefersReducedMotion = useReducedMotion()
    const motionValue = useMotionValue(0)
    const springValue = useSpring(motionValue, {
        damping: 40,
        stiffness: 100,
        duration: duration * 1000,
    })

    useEffect(() => {
        if (isInView) {
            motionValue.set(target)
        }
    }, [isInView, motionValue, target])

    useEffect(() => {
        const unsubscribe = springValue.on("change", (latest) => {
            if (ref.current) {
                const formatted = formatNumber(Math.round(latest))
                ref.current.textContent = `${prefix}${formatted}${suffix}`
            }
        })
        return unsubscribe
    }, [springValue, prefix, suffix])

    if (prefersReducedMotion) {
        return (
            <span ref={ref} className={className}>
                {prefix}{formatNumber(target)}{suffix}
            </span>
        )
    }

    return (
        <span ref={ref} className={className}>
            {prefix}0{suffix}
        </span>
    )
}

function formatNumber(n: number): string {
    if (n >= 1000) {
        return n.toLocaleString("en-US")
    }
    return n.toString()
}
