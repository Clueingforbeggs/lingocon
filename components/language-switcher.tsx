"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ConlangTranslation {
  id: string;
  name: string;
  flagUrl: string | null;
  ownerName: string;
  percentage: number;
}

export function LanguageSwitcher({ variant = "dropdown" }: { variant?: "dropdown" | "list" }) {
  const t = useTranslations("i18n");
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState("en");
  const [translations, setTranslations] = useState<ConlangTranslation[]>([]);

  useEffect(() => {
    // Read current locale from cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift() || "en";
      return "en";
    };
    setCurrentLocale(getCookie(LOCALE_COOKIE));

    // Fetch available conlang translations
    fetch("/api/translations/available")
      .then((res) => res.json())
      .then((data) => setTranslations(data))
      .catch(console.error);
  }, []);

  const switchLocale = (locale: string) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000`;
    setCurrentLocale(locale);
    router.refresh();
  };

  const Content = () => (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => switchLocale("en")} className="cursor-pointer">
          <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="flex-1">English</span>
          <span className="text-xs text-muted-foreground ml-2">100%</span>
          {currentLocale === "en" && <Check className="ml-2 h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuGroup>

      {translations.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Conlang Translations
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {translations.map((lang) => (
              <DropdownMenuItem
                key={lang.id}
                onClick={() => switchLocale(`conlang:${lang.id}`)}
                className="cursor-pointer flex flex-col items-start py-2"
              >
                <div className="flex items-center w-full mb-1">
                  {lang.flagUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lang.flagUrl} alt="" className="w-4 h-4 rounded-sm object-cover mr-2" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{lang.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{lang.percentage}%</span>
                  {currentLocale === `conlang:${lang.id}` && <Check className="ml-2 h-4 w-4" />}
                </div>
                <Progress value={lang.percentage} className="h-1 w-full mt-1" />
                <span className="text-[10px] text-muted-foreground mt-1">by @{lang.ownerName}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard/new-language" className="cursor-pointer text-primary">
          <Plus className="mr-2 h-4 w-4" />
          {t("addConlang")}
        </Link>
      </DropdownMenuItem>
    </>
  );

  if (variant === "list") {
    return (
      <div className="w-full border rounded-md bg-card">
        <div className="p-2 flex flex-col gap-1">
          <Content />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("switcherLabel")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>{t("switcherLabel")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Content />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
