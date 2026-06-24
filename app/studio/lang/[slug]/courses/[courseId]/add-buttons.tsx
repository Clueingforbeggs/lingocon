"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Loader2, FolderPlus } from "lucide-react"
import { createLesson, createLessonInUnit, createUnit } from "@/app/actions/learn"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import type { Lesson, Unit } from "./types"

export function AddLessonButton({ courseId, unitId, onAdded }: { courseId: string; unitId: string | null; onAdded: (l: Lesson) => void }) {
  const t = useTranslations("courseEditor")
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const r = await createLesson(courseId, title.trim(), description.trim() || undefined, unitId)
      if (r.data) {
        onAdded({ ...r.data, items: [], description: r.data.description ?? null, unitId: r.data.unitId ?? null })
        setOpen(false)
        setTitle("")
        setDescription("")
        toast.success(t("lessonAdded"))
      } else {
        toast.error(r.error ?? t("failAddLesson"))
      }
    } catch {
      toast.error(t("failAddLesson"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {t("addLesson")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("newLesson")}</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("title")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("titlePh")} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>{t("description")} <span className="text-muted-foreground">{t("optional")}</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading || !title.trim()} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Add-lesson button bound to a specific unit; resolves courseId via the unit. */
export function AddLessonButtonForUnit({ unitId, onAdded }: { unitId: string; onAdded: (l: Lesson) => void }) {
  const t = useTranslations("courseEditor")
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const r = await createLessonInUnit(unitId, title.trim(), description.trim() || undefined)
      if (r.data) {
        onAdded({ ...r.data, items: [], description: r.data.description ?? null, unitId: r.data.unitId ?? null })
        setOpen(false)
        setTitle("")
        setDescription("")
        toast.success(t("lessonAdded"))
      } else {
        toast.error(t("failAddLesson"))
      }
    } catch {
      toast.error(t("failAddLesson"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Plus className="h-4 w-4" />
          {t("addLessonToUnit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("addLesson")}</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("title")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("titlePh")} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>{t("description")} <span className="text-muted-foreground">{t("optional")}</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading || !title.trim()} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AddUnitButton({ courseId, onAdded }: { courseId: string; onAdded: (u: Unit) => void }) {
  const t = useTranslations("courseEditor")
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const r = await createUnit(courseId, title.trim(), description.trim() || undefined)
      if (r.data) {
        onAdded({ id: r.data.id, title: r.data.title, description: r.data.description ?? null, order: r.data.order })
        setOpen(false)
        setTitle("")
        setDescription("")
        toast.success(t("unitAdded"))
      } else {
        toast.error(t("failAddUnit"))
      }
    } catch {
      toast.error(t("failAddUnit"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full gap-2">
          <FolderPlus className="h-4 w-4" />
          {t("addUnit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("addUnit")}</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("title")}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("unitTitlePh")} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>{t("description")} <span className="text-muted-foreground">{t("optional")}</span></Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={loading || !title.trim()} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
