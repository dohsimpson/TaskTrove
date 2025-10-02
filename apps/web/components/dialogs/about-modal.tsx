"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star, Heart } from "lucide-react"
import { TaskTroveLogo } from "@/components/ui/custom/tasktrove-logo"
import packageJson from "@/package.json"
import { useTranslation, useLanguage } from "@tasktrove/i18n"
interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const version = packageJson.version
  const { language } = useLanguage()
  const { t } = useTranslation(language, "dialogs")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle aria-label={t("about.title", "About TaskTrove")}></DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              "about.description",
              "Information about TaskTrove application version and developer",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-center py-4">
          <div>
            <div className="flex justify-center mb-4">
              <TaskTroveLogo size="md" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted-foreground">v{version}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Attribution Text */}
            <div className="flex items-center justify-center gap-1 text-sm">
              <span>{t("about.madeWith", "made with")}</span>
              <span className="text-red-500">❤️</span>
              <span>{t("about.by", "by")}</span>
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => window.open("https://dohsimpson.com", "_blank")}
              >
                <span className="underline cursor-pointer">@dohsimpson</span>
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer group"
                onClick={() => window.open("https://github.com/dohsimpson/TaskTrove", "_blank")}
              >
                <Star className="size-4 mr-2 text-yellow-600 group-hover:animate-[breathe_3s_ease-in-out_infinite]" />
                {t("about.starOnGitHub", "Star on GitHub")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer group"
                onClick={() => window.open("https://github.com/sponsors/dohsimpson", "_blank")}
              >
                <Heart className="size-4 mr-2 text-pink-600 group-hover:animate-[breathe_3s_ease-in-out_infinite]" />
                {t("about.sponsorMe", "Sponsor Me")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
