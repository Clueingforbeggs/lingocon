"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GraduationCap, Loader2 } from "lucide-react"
import { enrollInLanguage } from "@/app/actions/learn"
import { toast } from "sonner"

export function EnrollButton({ languageId, slug }: { languageId: string; slug: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEnroll() {
    setLoading(true)
    try {
      const result = await enrollInLanguage(languageId)
      if (result.data) {
        toast.success("Enrolled! Your study cards are being prepared.")
        router.refresh()
      }
    } catch {
      toast.error("Failed to enroll. Are you signed in?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="lg" className="gap-2 min-w-[160px]" onClick={handleEnroll} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GraduationCap className="h-4 w-4" />
      )}
      {loading ? "Enrolling…" : "Start Learning"}
    </Button>
  )
}
