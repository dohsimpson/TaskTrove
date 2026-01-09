"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { TaskTroveLogo } from "@/components/ui/custom/tasktrove-logo"
import { getAppVersion } from "@/lib/utils/version"
import { GITHUB_REPO_NAME, GITHUB_REPO_OWNER } from "@/lib/constants/default"
import { useTranslation } from "@tasktrove/i18n"
import { PrivacyTermsNotice } from "@/components/legal/privacy-terms-notice"
interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extraVersionInfo?: React.ReactNode
}

export function AboutModal({ open, onOpenChange, extraVersionInfo }: AboutModalProps) {
  const [version, setVersion] = useState<string | null>(null)
  const { t } = useTranslation("dialogs")
  const githubRepoUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`

  useEffect(() => {
    void (async () => {
      try {
        const versionInfo = await getAppVersion()
        setVersion(versionInfo.version)
      } catch (error) {
        console.warn("[AboutModal] Unable to read app version", error)
      }
    })()
  }, [])

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
            {extraVersionInfo ?? (
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-muted-foreground">v{version ?? "Unknown"}</p>
              </div>
            )}
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

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer group"
                onClick={() => window.open(githubRepoUrl, "_blank")}
              >
                <Star className="size-4 mr-2 text-yellow-600 group-hover:animate-[breathe_3s_ease-in-out_infinite]" />
                {t("about.starOnGitHub", "Star on GitHub")}
              </Button>
            </div>
          </div>
          <PrivacyTermsNotice className="pt-2" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
