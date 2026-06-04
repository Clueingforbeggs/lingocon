import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Languages, Home, Search } from "lucide-react"
import { useTranslations } from "next-intl"

export default function NotFound() {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <Card className="w-full max-w-sm text-center border-border/40 shadow-soft relative z-10">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-3xl font-bold text-primary">404</span>
          </div>
          <CardTitle className="text-xl">{t("pageNotFound")}</CardTitle>
          <CardDescription className="text-sm">
            {t("pageNotFoundDesc")}
          </CardDescription>
          <Link href="/" className="text-primary hover:underline mt-2">
            {t("returnToHome")}
          </Link>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Home className="mr-1.5 h-3.5 w-3.5" />
                {tCommon("goHome")}
              </Button>
            </Link>
            <Link href="/browse">
              <Button size="sm" className="w-full sm:w-auto glow-primary">
                <Search className="mr-1.5 h-3.5 w-3.5" />
                {tCommon("browse")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
