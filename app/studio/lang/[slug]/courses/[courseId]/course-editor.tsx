"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
  GraduationCap, Plus, Trash2, Eye, EyeOff, Loader2,
  BookOpen, FileText, MessageSquare, Type, GripVertical, ChevronDown, ChevronRight,
} from "lucide-react"
import {
  createLesson, addLessonItem, deleteLessonItem, deleteLesson, updateCourse,
} from "@/app/actions/learn"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DictEntry   { id: string; lemma: string; gloss: string; partOfSpeech: string | null }
interface GrammarPage { id: string; title: string }
interface TextItem    { id: string; title: string }
interface LessonItem  {
  id: string; type: string; order: number
  dictEntry?:   { id: string; lemma: string; gloss: string; partOfSpeech: string | null } | null
  grammarPage?: { id: string; title: string } | null
  text?:        { id: string; title: string } | null
  sentence?:    { id: string; sentence: string; translation: string } | null
}
interface Lesson {
  id: string; title: string; description: string | null; order: number
  items: LessonItem[]
}
interface Course {
  id: string; title: string; description: string | null; visibility: string
  lessons: Lesson[]
}

interface Props {
  course: Course
  language: { id: string; name: string; slug: string }
  dictEntries: DictEntry[]
  grammarPages: GrammarPage[]
  texts: TextItem[]
  slug: string
}

type ItemType = "VOCAB" | "GRAMMAR" | "TEXT" | "SENTENCE"

export function CourseEditor({ course: initialCourse, language, dictEntries, grammarPages, texts, slug }: Props) {
  const router = useRouter()
  const [course, setCourse] = useState(initialCourse)
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [savingVisibility, setSavingVisibility] = useState(false)

  function toggleLesson(id: string) {
    setExpandedLessons(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleVisibilityToggle() {
    setSavingVisibility(true)
    const next = course.visibility === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
    try {
      const result = await updateCourse(course.id, { visibility: next })
      if (result.data) {
        setCourse(prev => ({ ...prev, visibility: next }))
        toast.success(next === "PUBLISHED" ? "Course published" : "Moved to draft")
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setSavingVisibility(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <Badge
              variant="secondary"
              className={cn("gap-1 text-xs",
                course.visibility === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600"
              )}
            >
              {course.visibility === "PUBLISHED" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {course.visibility.toLowerCase()}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          {course.description && <p className="text-muted-foreground text-sm mt-1">{course.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleVisibilityToggle}
            disabled={savingVisibility}
          >
            {savingVisibility
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : course.visibility === "PUBLISHED"
              ? <EyeOff className="h-4 w-4" />
              : <Eye className="h-4 w-4" />
            }
            {course.visibility === "PUBLISHED" ? "Unpublish" : "Publish"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/learn/${slug}/courses/${course.id}`} target="_blank" rel="noopener noreferrer">
              Preview
            </a>
          </Button>
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-3 mb-4">
        {course.lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={i}
            expanded={expandedLessons.has(lesson.id)}
            onToggle={() => toggleLesson(lesson.id)}
            dictEntries={dictEntries}
            grammarPages={grammarPages}
            texts={texts}
            onDelete={async () => {
              const r = await deleteLesson(lesson.id)
              if (r.data) {
                setCourse(prev => ({ ...prev, lessons: prev.lessons.filter(l => l.id !== lesson.id) }))
                toast.success("Lesson deleted")
              }
            }}
            onItemAdded={(item) => {
              setCourse(prev => ({
                ...prev,
                lessons: prev.lessons.map(l =>
                  l.id === lesson.id ? { ...l, items: [...l.items, item] } : l
                ),
              }))
            }}
            onItemDeleted={(itemId) => {
              setCourse(prev => ({
                ...prev,
                lessons: prev.lessons.map(l =>
                  l.id === lesson.id ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l
                ),
              }))
            }}
          />
        ))}
      </div>

      <AddLessonButton courseId={course.id} onAdded={(lesson) =>
        setCourse(prev => ({ ...prev, lessons: [...prev.lessons, lesson] }))
      } />
    </div>
  )
}

// ── Lesson card ───────────────────────────────────────────────────────────────

interface LessonCardProps {
  lesson: Lesson
  index: number
  expanded: boolean
  onToggle: () => void
  dictEntries: DictEntry[]
  grammarPages: GrammarPage[]
  texts: TextItem[]
  onDelete: () => void
  onItemAdded: (item: LessonItem) => void
  onItemDeleted: (itemId: string) => void
}

function LessonCard({
  lesson, index, expanded, onToggle,
  dictEntries, grammarPages, texts,
  onDelete, onItemAdded, onItemDeleted,
}: LessonCardProps) {
  const [deleting, setDeleting] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/40 transition-colors"
        onClick={onToggle}
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium">{lesson.title}</span>
          {lesson.description && (
            <span className="ml-2 text-xs text-muted-foreground">{lesson.description}</span>
          )}
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">{lesson.items.length} items</Badge>
        {expanded
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {expanded && (
        <CardContent className="pt-0 border-t border-border/40">
          <div className="pt-3 space-y-2">
            {lesson.items.map(item => (
              <ItemRow key={item.id} item={item} onDelete={async () => {
                const r = await deleteLessonItem(item.id)
                if (r.data) onItemDeleted(item.id)
              }} />
            ))}
            {lesson.items.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No items yet — add content below.</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AddItemDropdown
              lessonId={lesson.id}
              dictEntries={dictEntries}
              grammarPages={grammarPages}
              texts={texts}
              onAdded={onItemAdded}
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive ml-auto"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true)
                await onDelete()
                setDeleting(false)
              }}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Lesson
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({ item, onDelete }: { item: LessonItem; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const label =
    item.type === "VOCAB"    && item.dictEntry   ? `${item.dictEntry.lemma} — ${item.dictEntry.gloss}`
    : item.type === "GRAMMAR"  && item.grammarPage ? item.grammarPage.title
    : item.type === "TEXT"     && item.text        ? item.text.title
    : item.type === "SENTENCE" && item.sentence    ? item.sentence.sentence
    : "Unknown item"

  const icon =
    item.type === "VOCAB"    ? <Type className="h-3.5 w-3.5 text-primary" />
    : item.type === "GRAMMAR"  ? <BookOpen className="h-3.5 w-3.5 text-amber-500" />
    : item.type === "TEXT"     ? <FileText className="h-3.5 w-3.5 text-blue-500" />
    : <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />

  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-secondary/50 group">
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      {icon}
      <span className="text-sm truncate flex-1">{label}</span>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={async () => {
          setDeleting(true)
          await onDelete()
          setDeleting(false)
        }}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

// ── Add item dropdown ─────────────────────────────────────────────────────────

function AddItemDropdown({
  lessonId, dictEntries, grammarPages, texts, onAdded,
}: {
  lessonId: string
  dictEntries: DictEntry[]
  grammarPages: GrammarPage[]
  texts: TextItem[]
  onAdded: (item: LessonItem) => void
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ItemType>("VOCAB")
  const [sourceId, setSourceId] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!sourceId) return
    setLoading(true)
    try {
      const r = await addLessonItem(lessonId, type, sourceId)
      if (r.data) {
        // Build a synthetic LessonItem for optimistic update
        const entry = type === "VOCAB"    ? dictEntries.find(e => e.id === sourceId)   : undefined
        const page  = type === "GRAMMAR"  ? grammarPages.find(p => p.id === sourceId)  : undefined
        const text  = type === "TEXT"     ? texts.find(t => t.id === sourceId)         : undefined

        onAdded({
          id:          r.data.id,
          type,
          order:       r.data.order,
          dictEntry:   entry ? { id: entry.id, lemma: entry.lemma, gloss: entry.gloss, partOfSpeech: entry.partOfSpeech } : null,
          grammarPage: page  ? { id: page.id, title: page.title } : null,
          text:        text  ? { id: text.id, title: text.title } : null,
          sentence:    null,
        })
        setSourceId("")
        setOpen(false)
        toast.success("Item added")
      }
    } catch {
      toast.error("Failed to add item")
    } finally {
      setLoading(false)
    }
  }

  const options =
    type === "VOCAB"   ? dictEntries.map(e => ({ id: e.id, label: `${e.lemma} — ${e.gloss}` }))
    : type === "GRAMMAR" ? grammarPages.map(p => ({ id: p.id, label: p.title }))
    : type === "TEXT"    ? texts.map(t => ({ id: t.id, label: t.title }))
    : []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item to Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["VOCAB",   "Vocabulary", <Type key="v" className="h-4 w-4" />],
                ["GRAMMAR", "Grammar",    <BookOpen key="g" className="h-4 w-4" />],
                ["TEXT",    "Text",       <FileText key="t" className="h-4 w-4" />],
              ] as [ItemType, string, React.ReactNode][]).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setType(value); setSourceId("") }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all",
                    type === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {options.length > 0 ? (
            <div className="space-y-2">
              <Label>Select {type === "VOCAB" ? "word" : type === "GRAMMAR" ? "page" : "text"}</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {options.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No {type.toLowerCase()} content available for this language yet.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!sourceId || loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Add lesson button ─────────────────────────────────────────────────────────

function AddLessonButton({ courseId, onAdded }: { courseId: string; onAdded: (l: Lesson) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const r = await createLesson(courseId, title.trim(), description.trim() || undefined)
      if (r.data) {
        onAdded({ ...r.data, items: [], description: r.data.description ?? null })
        setOpen(false)
        setTitle("")
        setDescription("")
        toast.success("Lesson added")
      }
    } catch {
      toast.error("Failed to add lesson")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full">
          <Plus className="h-4 w-4" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Greetings" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !title.trim()} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
