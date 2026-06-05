"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { completeLesson } from "@/app/actions/learn"
import {
  X, Heart, HeartCrack, Trophy, ArrowLeft, Sparkles,
  CheckCircle2, XCircle, RotateCcw, Zap,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import type { Exercise, MultipleChoiceExercise, TranslateExercise, MatchPairsExercise, SentenceBuilderExercise } from "@/types/lesson"

// ─── XP config ────────────────────────────────────────────────────────────────

const BASE_LESSON_XP = 10
const XP_PER_HEART   = 5   // bonus per heart remaining at completion
const MAX_HEARTS     = 3

// ─── Levenshtein fuzzy match ──────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function isAnswerCorrect(userInput: string, expected: string): boolean {
  const a = userInput.trim().toLowerCase()
  const b = expected.trim().toLowerCase()
  if (a === b) return true
  // Allow 1 typo for words longer than 4 chars, 2 for words longer than 8
  const tolerance = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2
  return levenshtein(a, b) <= tolerance
}

// ─── Props / State types ──────────────────────────────────────────────────────

interface LessonEngineProps {
  lessonId: string
  lessonTitle: string
  exercises: Exercise[]
  languageSlug: string
  languageName: string
  courseId: string
}

type FeedbackState =
  | { status: "answering" }
  | { status: "correct"; correctText: string; hint?: string }
  | { status: "wrong";   correctText: string; hint?: string }

type Screen = "lesson" | "complete" | "failed"

// ─── Main engine ──────────────────────────────────────────────────────────────

export function LessonEngine({
  lessonId, lessonTitle, exercises, languageSlug, languageName, courseId,
}: LessonEngineProps) {
  const [queue, setQueue]         = useState<Exercise[]>(exercises)
  const [idx, setIdx]             = useState(0)
  const [hearts, setHearts]       = useState(MAX_HEARTS)
  const [feedback, setFeedback]   = useState<FeedbackState>({ status: "answering" })
  const [screen, setScreen]       = useState<Screen>("lesson")
  const [correctCount, setCorrect] = useState(0)
  const [selected, setSelected]   = useState<string | null>(null)  // MC selected option id
  const [typedAnswer, setTyped]   = useState("")
  const [selectedBuilderWords, setSelectedBuilderWords] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = queue[idx]
  const progress = exercises.length > 0 ? idx / (queue.length) : 1

  // Focus input when a TRANSLATE card appears
  useEffect(() => {
    if (current?.type === "TRANSLATE" && feedback.status === "answering") {
      inputRef.current?.focus()
    }
    setSelected(null)
    setTyped("")
    setSelectedBuilderWords([])
  }, [idx, current?.type, feedback.status])

  // ── Check answer ──────────────────────────────────────────────────────────

  const checkAnswer = useCallback(() => {
    if (!current || feedback.status !== "answering") return

    let correct = false
    let correctText = ""
    let hint: string | undefined

    if (current.type === "MULTIPLE_CHOICE") {
      const option = current.options.find(o => o.id === selected)
      correct = option?.correct ?? false
      correctText = current.options.find(o => o.correct)?.text ?? ""
    } else if (current.type === "TRANSLATE") {
      correct = isAnswerCorrect(typedAnswer, current.answer)
      correctText = current.answer
      hint = current.hint
    } else if (current.type === "SENTENCE_BUILDER") {
      const selectedTexts = selectedBuilderWords.map(id => current.words.find(w => w.id === id)?.text).join(" ")
      correct = isAnswerCorrect(selectedTexts, current.sentence)
      correctText = current.sentence
    }

    if (correct) {
      setCorrect(c => c + 1)
      setFeedback({ status: "correct", correctText, hint })
    } else {
      const newHearts = hearts - 1
      setHearts(newHearts)
      setFeedback({ status: "wrong", correctText, hint })
      if (newHearts === 0) {
        // Delay so user sees the wrong feedback before fail screen
        setTimeout(() => setScreen("failed"), 1400)
      }
    }
  }, [current, feedback.status, selected, typedAnswer, hearts, selectedBuilderWords])

  // ── Advance to next exercise ───────────────────────────────────────────────

  const advance = useCallback(async () => {
    if (feedback.status === "wrong" && hearts > 0) {
      // Re-queue the card near the end so learner sees it again
      const failed = queue[idx]
      const newQueue = [...queue]
      const insertAt = Math.min(idx + 3, newQueue.length)
      newQueue.splice(insertAt, 0, { ...failed, id: `${failed.id}-retry` } as Exercise)
      setQueue(newQueue)
    }

    const nextIdx = idx + 1
    if (nextIdx >= queue.length || (feedback.status === "wrong" && hearts === 0)) {
      // All done — save completion
      setSaving(true)
      const xpEarned = BASE_LESSON_XP + XP_PER_HEART * Math.max(0, hearts)
      try {
        await completeLesson(lessonId, xpEarned, hearts)
        setScreen("complete")
      } catch {
        toast.error("Failed to save progress")
      } finally {
        setSaving(false)
      }
      return
    }

    setIdx(nextIdx)
    setFeedback({ status: "answering" })
  }, [feedback.status, hearts, idx, lessonId, queue])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (screen !== "lesson") return
      if (feedback.status === "answering") {
        if (current?.type === "MULTIPLE_CHOICE") {
          const keyMap: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 }
          if (e.key in keyMap) {
            const opt = current.options[keyMap[e.key]]
            if (opt) setSelected(opt.id)
          }
          if ((e.key === "Enter" || e.key === " ") && selected) {
            e.preventDefault()
            checkAnswer()
          }
        }
        if (current?.type === "TRANSLATE" && e.key === "Enter") {
          e.preventDefault()
          if (typedAnswer.trim()) checkAnswer()
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          advance()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [screen, feedback.status, current, selected, typedAnswer, checkAnswer, advance])

  // ── Screens ───────────────────────────────────────────────────────────────

  if (screen === "complete") {
    const xpEarned = BASE_LESSON_XP + XP_PER_HEART * Math.max(0, hearts)
    const accuracy = exercises.length > 0
      ? Math.round((correctCount / exercises.length) * 100)
      : 0
    return (
      <CompleteScreen
        lessonTitle={lessonTitle}
        xpEarned={xpEarned}
        heartsLeft={hearts}
        maxHearts={MAX_HEARTS}
        accuracy={accuracy}
        languageSlug={languageSlug}
        languageName={languageName}
        courseId={courseId}
      />
    )
  }

  if (screen === "failed") {
    return (
      <FailedScreen
        lessonTitle={lessonTitle}
        lessonId={lessonId}
        languageSlug={languageSlug}
        courseId={courseId}
      />
    )
  }

  if (!current) return null

  // ── Render exercise ───────────────────────────────────────────────────────

  const canCheck =
    (current.type === "MULTIPLE_CHOICE" && selected !== null) ||
    (current.type === "TRANSLATE" && typedAnswer.trim().length > 0) ||
    (current.type === "SENTENCE_BUILDER" && selectedBuilderWords.length > 0)

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center gap-4">
          <Link href={`/learn/${languageSlug}/courses/${courseId}`} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </Link>

          {/* Progress bar */}
          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Hearts */}
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <span key={i} className={cn(
                "transition-all duration-300",
                i < hearts ? "text-red-500 scale-100" : "text-muted-foreground/30 scale-90"
              )}>
                {i < hearts ? <Heart className="h-5 w-5 fill-current" /> : <Heart className="h-5 w-5" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Exercise area ── */}
      <div className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        {current.type === "MATCH_PAIRS" ? (
          <MatchPairsCard
            exercise={current}
            onComplete={() => {
              const nextIdx = idx + 1
              if (nextIdx >= queue.length) {
                const xpEarned = BASE_LESSON_XP + XP_PER_HEART * hearts
                setSaving(true)
                completeLesson(lessonId, xpEarned, hearts)
                  .then(() => setScreen("complete"))
                  .catch(() => toast.error("Failed to save progress"))
                  .finally(() => setSaving(false))
              } else {
                setIdx(nextIdx)
                setFeedback({ status: "answering" })
              }
            }}
          />
        ) : (
          <div className="space-y-8">
            {current.type === "MULTIPLE_CHOICE" && (
              <MultipleChoiceCard
                exercise={current}
                selected={selected}
                feedback={feedback}
                onSelect={setSelected}
              />
            )}
            {current.type === "TRANSLATE" && (
              <TranslateCard
                exercise={current}
                value={typedAnswer}
                feedback={feedback}
                onChange={setTyped}
                onSubmit={checkAnswer}
                inputRef={inputRef}
              />
            )}
            {current.type === "SENTENCE_BUILDER" && (
              <SentenceBuilderCard
                exercise={current}
                selectedWords={selectedBuilderWords}
                onSelect={setSelectedBuilderWords}
                feedback={feedback}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Bottom action / feedback bar ── */}
      {current.type !== "MATCH_PAIRS" && (
        <div className={cn(
          "sticky bottom-0 border-t transition-colors duration-300",
          feedback.status === "correct" ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
            : feedback.status === "wrong" ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
            : "bg-background border-border"
        )}>
          <div className="container mx-auto max-w-2xl px-4 py-4">
            {feedback.status === "answering" ? (
              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold"
                disabled={!canCheck}
                onClick={checkAnswer}
              >
                Check
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {feedback.status === "correct" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      "font-semibold text-lg",
                      feedback.status === "correct" ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    )}>
                      {feedback.status === "correct" ? "Correct!" : "Incorrect"}
                    </p>
                    {feedback.status === "wrong" && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Correct answer: <span className="font-semibold text-foreground">{feedback.correctText}</span>
                        {feedback.hint && <span className="text-muted-foreground ml-2">{feedback.hint}</span>}
                      </p>
                    )}
                    {feedback.status === "correct" && feedback.hint && (
                      <p className="text-sm text-muted-foreground mt-0.5">{feedback.hint}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-12 text-base font-semibold",
                    feedback.status === "correct"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                  onClick={advance}
                  disabled={saving}
                >
                  Continue
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Multiple Choice Card ─────────────────────────────────────────────────────

function MultipleChoiceCard({
  exercise, selected, feedback, onSelect,
}: {
  exercise: MultipleChoiceExercise
  selected: string | null
  feedback: FeedbackState
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {exercise.prompt}
        </p>
        <p className="text-5xl font-bold tracking-tight">{exercise.word}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {exercise.options.map((option, i) => {
          const isSelected = selected === option.id
          const isRevealed = feedback.status !== "answering"
          const isCorrect  = option.correct
          const isWrong    = isSelected && !isCorrect && isRevealed

          return (
            <button
              key={option.id}
              onClick={() => feedback.status === "answering" && onSelect(option.id)}
              disabled={isRevealed}
              className={cn(
                "relative text-left rounded-2xl border-2 border-b-4 px-5 py-4 text-base font-medium transition-all duration-150",
                "disabled:cursor-default active:border-b-2 active:translate-y-[2px]",
                // Default state
                !isSelected && !isRevealed && "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                // Selected but not yet checked
                isSelected && !isRevealed && "border-primary bg-primary/10 text-primary border-primary/50",
                // Revealed correct
                isCorrect && isRevealed && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                // Revealed wrong selection
                isWrong && "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 animate-shake",
                // Unselected after reveal
                !isSelected && !isCorrect && isRevealed && "border-border bg-card opacity-50",
              )}
            >
              <span className="absolute top-3 right-3 text-xs text-muted-foreground/60 font-mono">
                {i + 1}
              </span>
              {option.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Translate Card ───────────────────────────────────────────────────────────

function TranslateCard({
  exercise, value, feedback, onChange, onSubmit, inputRef,
}: {
  exercise: TranslateExercise
  value: string
  feedback: FeedbackState
  onChange: (v: string) => void
  onSubmit: () => void
  inputRef: React.RefObject<HTMLInputElement>
}) {
  const revealed = feedback.status !== "answering"

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {exercise.prompt}
        </p>
        <p className="text-5xl font-bold tracking-tight">{exercise.word}</p>
      </div>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => !revealed && onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && value.trim() && !revealed && onSubmit()}
          disabled={revealed}
          placeholder="Type your answer…"
          className={cn(
            "w-full rounded-2xl border-2 bg-card px-5 py-4 text-xl font-medium outline-none transition-all",
            "placeholder:text-muted-foreground/40 disabled:cursor-default",
            !revealed && "border-border focus:border-primary",
            feedback.status === "correct" && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
            feedback.status === "wrong" && "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 line-through",
          )}
        />
        {feedback.status === "wrong" && (
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg px-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {exercise.answer}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Match Pairs Card ─────────────────────────────────────────────────────────

function MatchPairsCard({
  exercise, onComplete,
}: {
  exercise: MatchPairsExercise
  onComplete: () => void
}) {
  const [selectedLeft, setSelectedLeft]   = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [matched, setMatched]             = useState<Set<string>>(new Set())
  const [shaking, setShaking]             = useState<string | null>(null)

  // Shuffle right column independently
  const [rightOrder] = useState(() =>
    [...exercise.pairs].sort(() => Math.random() - 0.5)
  )

  useEffect(() => {
    if (matched.size === exercise.pairs.length) {
      // Brief pause before advancing
      const t = setTimeout(onComplete, 600)
      return () => clearTimeout(t)
    }
  }, [matched.size, exercise.pairs.length, onComplete])

  function tryMatch(leftId: string, rightId: string) {
    if (leftId === rightId) {
      // Correct match
      setMatched(prev => new Set([...prev, leftId]))
      setSelectedLeft(null)
      setSelectedRight(null)
    } else {
      // Wrong — shake both then clear
      setShaking(leftId)
      setTimeout(() => {
        setShaking(null)
        setSelectedLeft(null)
        setSelectedRight(null)
      }, 500)
    }
  }

  function handleLeft(id: string) {
    if (matched.has(id)) return
    setSelectedLeft(id)
    if (selectedRight) tryMatch(id, selectedRight)
  }

  function handleRight(id: string) {
    if (matched.has(id)) return
    setSelectedRight(id)
    if (selectedLeft) tryMatch(selectedLeft, id)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Match the pairs
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column — conlang words */}
        <div className="space-y-3">
          {exercise.pairs.map(pair => {
            const isMatched   = matched.has(pair.id)
            const isSelected  = selectedLeft === pair.id
            const isShaking   = shaking === pair.id

            return (
              <button
                key={`L-${pair.id}`}
                onClick={() => handleLeft(pair.id)}
                disabled={isMatched}
                className={cn(
                  "w-full rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-semibold transition-all duration-150",
                  "disabled:cursor-default text-center active:border-b-2 active:translate-y-[2px]",
                  isMatched   && "border-emerald-400 border-b-2 translate-y-[2px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 scale-95 opacity-60",
                  isSelected  && !isMatched && "border-primary bg-primary/10 text-primary scale-105 border-primary/50",
                  isShaking   && "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 animate-shake",
                  !isSelected && !isMatched && !isShaking && "border-border bg-card hover:border-primary/40",
                )}
              >
                {pair.left}
              </button>
            )
          })}
        </div>

        {/* Right column — native glosses (shuffled) */}
        <div className="space-y-3">
          {rightOrder.map(pair => {
            const isMatched  = matched.has(pair.id)
            const isSelected = selectedRight === pair.id
            const isShaking  = shaking === pair.id

            return (
              <button
                key={`R-${pair.id}`}
                onClick={() => handleRight(pair.id)}
                disabled={isMatched}
                className={cn(
                  "w-full rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-semibold transition-all duration-150",
                  "disabled:cursor-default text-center active:border-b-2 active:translate-y-[2px]",
                  isMatched   && "border-emerald-400 border-b-2 translate-y-[2px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 scale-95 opacity-60",
                  isSelected  && !isMatched && "border-primary bg-primary/10 text-primary scale-105 border-primary/50",
                  isShaking   && "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 animate-shake",
                  !isSelected && !isMatched && !isShaking && "border-border bg-card hover:border-primary/40",
                )}
              >
                {pair.right}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Sentence Builder Card ────────────────────────────────────────────────────

function SentenceBuilderCard({
  exercise,
  selectedWords,
  onSelect,
  feedback,
}: {
  exercise: SentenceBuilderExercise
  selectedWords: string[]
  onSelect: (words: string[]) => void
  feedback: FeedbackState
}) {
  const isRevealed = feedback.status !== "answering"

  const handleBankClick = (id: string) => {
    if (isRevealed || selectedWords.includes(id)) return
    onSelect([...selectedWords, id])
  }

  const handleLineClick = (id: string) => {
    if (isRevealed) return
    onSelect(selectedWords.filter(w => w !== id))
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Translate this sentence
        </p>
        <p className="text-3xl font-bold tracking-tight">{exercise.prompt}</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Answer Line */}
        <div className="min-h-[60px] border-b-2 border-border/60 flex flex-wrap gap-2 pb-2">
          {selectedWords.map(id => {
            const word = exercise.words.find(w => w.id === id)
            if (!word) return null
            return (
              <button
                key={`line-${id}`}
                onClick={() => handleLineClick(id)}
                className={cn(
                  "rounded-2xl border-2 border-b-4 px-4 py-2 text-base font-medium transition-all",
                  "bg-card hover:bg-muted active:border-b-2 active:translate-y-[2px]",
                  isRevealed && "pointer-events-none opacity-80"
                )}
              >
                {word.text}
              </button>
            )
          })}
        </div>

        {/* Word Bank */}
        <div className="flex flex-wrap gap-3 justify-center min-h-[120px]">
          {exercise.words.map(word => {
            const isSelected = selectedWords.includes(word.id)
            return (
              <button
                key={`bank-${word.id}`}
                onClick={() => handleBankClick(word.id)}
                disabled={isSelected || isRevealed}
                className={cn(
                  "rounded-2xl border-2 border-b-4 px-4 py-2 text-base font-medium transition-all duration-150",
                  "bg-card active:border-b-2 active:translate-y-[2px] disabled:cursor-default",
                  isSelected ? "bg-muted text-muted border-border/40 opacity-0 pointer-events-none scale-90" : "hover:border-primary/40 text-foreground"
                )}
              >
                {word.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompleteScreen({
  lessonTitle, xpEarned, heartsLeft, maxHearts, accuracy, languageSlug, languageName, courseId,
}: {
  lessonTitle: string
  xpEarned: number
  heartsLeft: number
  maxHearts: number
  accuracy: number
  languageSlug: string
  languageName: string
  courseId: string
}) {
  const isPerfect = heartsLeft === maxHearts

  useEffect(() => {
    const duration = 2500
    const end = Date.now() + duration
    
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"]
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"]
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    
    frame()
  }, [])

  return (
    <div className="container mx-auto max-w-md px-4 py-16 flex flex-col items-center text-center gap-8">
      {/* Trophy */}
      <div className="relative">
        <div className={cn(
          "h-28 w-28 rounded-full flex items-center justify-center mx-auto",
          isPerfect
            ? "bg-amber-500/10 ring-4 ring-amber-500/20"
            : "bg-primary/10 ring-4 ring-primary/20"
        )}>
          <Trophy className={cn("h-14 w-14", isPerfect ? "text-amber-500" : "text-primary")} />
        </div>
        {isPerfect && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-4xl animate-bounce">🎉</span>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isPerfect ? "Flawless!" : accuracy >= 70 ? "Lesson Complete!" : "Well done!"}
        </h1>
        <p className="text-muted-foreground mt-1">{lessonTitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 w-full">
        <StatTile
          label="Accuracy"
          value={`${accuracy}%`}
          color="text-primary"
        />
        <StatTile
          label="XP Earned"
          value={`+${xpEarned}`}
          color="text-amber-500"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatTile
          label="Hearts"
          value={`${heartsLeft}/${maxHearts}`}
          color="text-red-500"
          icon={<Heart className="h-4 w-4 fill-current" />}
        />
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button asChild size="lg" className="h-12 gap-2">
          <Link href={`/learn/${languageSlug}/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 gap-2">
          <Link href={`/learn/${languageSlug}/study`}>
            <Sparkles className="h-4 w-4" />
            Practice with SRS
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Failed Screen ────────────────────────────────────────────────────────────

function FailedScreen({
  lessonTitle, lessonId, languageSlug, courseId,
}: {
  lessonTitle: string
  lessonId: string
  languageSlug: string
  courseId: string
}) {
  return (
    <div className="container mx-auto max-w-md px-4 py-16 flex flex-col items-center text-center gap-8">
      <div className="h-28 w-28 rounded-full bg-red-500/10 ring-4 ring-red-500/20 flex items-center justify-center mx-auto">
        <HeartCrack className="h-14 w-14 text-red-500" />
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Out of hearts!</h1>
        <p className="text-muted-foreground mt-1">{lessonTitle}</p>
        <p className="text-muted-foreground text-sm mt-2">
          Don&apos;t worry — practice makes perfect.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button asChild size="lg" className="h-12 gap-2">
          <Link href={`/learn/${languageSlug}/lesson/${lessonId}`}>
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 gap-2">
          <Link href={`/learn/${languageSlug}/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
  label, value, color, icon,
}: {
  label: string
  value: string
  color: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-1">
      <div className={cn("text-2xl font-bold flex items-center justify-center gap-1", color)}>
        {icon}{value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
