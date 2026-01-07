"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { settingsAtom, userAtom } from "@tasktrove/atoms/data/base/atoms"
import { updateSettingsAtom } from "@tasktrove/atoms/core/settings"
import { UserSchema } from "@tasktrove/types/core"
import { STANDARD_VIEW_IDS, START_VIEW_METADATA } from "@tasktrove/constants"
import {
  Inbox,
  Calendar,
  Clock,
  CheckSquare,
  ListTodo,
  Home,
  Languages,
  Copy,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  History,
  Repeat,
} from "lucide-react"
import { useTranslation } from "@tasktrove/i18n"
import { languages, type Language, isValidLanguage } from "@/lib/i18n/settings"
import { toast } from "@/lib/toast"

// Language display names
const languageNames: Record<Language, string> = {
  en: "English",
  zh: "中文 (Chinese)",
  fr: "Français (French)",
  de: "Deutsch (German)",
  es: "Español (Spanish)",
  nl: "Nederlands (Dutch)",
  ko: "한국어 (Korean)",
  ja: "日本語 (Japanese)",
  it: "Italiano (Italian)",
  pt: "Português (Portuguese)",
}

// Icon mapping for UI components
const ICON_MAP = {
  all: ListTodo,
  inbox: Inbox,
  today: Calendar,
  upcoming: Clock,
  habits: Repeat,
  calendar: Calendar,
  recent: History,
  completed: CheckSquare,
  lastViewed: Home,
} as const

export function GeneralForm() {
  const settings = useAtomValue(settingsAtom)
  const updateSettings = useSetAtom(updateSettingsAtom)
  const user = useAtomValue(userAtom)
  const updateUser = useSetAtom(userAtom)
  const { t, i18n } = useTranslation("settings")
  const [showApiToken, setShowApiToken] = useState(false)

  type StandardStartViewId = Exclude<keyof typeof ICON_MAP, "lastViewed">

  // Generate start view options with translations
  const standardStartViewOptions: Array<{
    value: StandardStartViewId
    label: string
    icon: React.ComponentType<{ className?: string }>
  }> = STANDARD_VIEW_IDS.filter(
    (viewId): viewId is StandardStartViewId => viewId in ICON_MAP && viewId in START_VIEW_METADATA,
  ).map((viewId) => ({
    value: viewId,
    icon: ICON_MAP[viewId],
    label: t(`general.startView.${viewId}.label`, START_VIEW_METADATA[viewId].title),
  }))

  const lastViewedOption = {
    value: "lastViewed",
    icon: ICON_MAP.lastViewed,
    label: t("general.startView.lastViewed.label", START_VIEW_METADATA.lastViewed.title),
  }

  const currentStartView = settings.general.startView
  const currentSoundEnabled = settings.general.soundEnabled
  const currentLinkifyEnabled = settings.general.linkifyEnabled
  const currentMarkdownEnabled = settings.general.markdownEnabled
  const currentPopoverHoverOpen = settings.general.popoverHoverOpen
  const currentPreferDayMonthFormat = settings.general.preferDayMonthFormat

  const handleStartViewChange = (value: StandardStartViewId | "lastViewed") => {
    updateSettings({
      general: {
        startView: value,
      },
    })
  }

  const handleSoundEnabledChange = (enabled: boolean) => {
    updateSettings({
      general: {
        soundEnabled: enabled,
      },
    })
  }

  const handleLinkifyEnabledChange = (enabled: boolean) => {
    updateSettings({
      general: {
        linkifyEnabled: enabled,
      },
    })
  }

  const handleMarkdownEnabledChange = (enabled: boolean) => {
    updateSettings({
      general: {
        markdownEnabled: enabled,
      },
    })
  }

  const handlePopoverHoverOpenChange = (enabled: boolean) => {
    updateSettings({
      general: {
        popoverHoverOpen: enabled,
      },
    })
  }

  const handlePreferDayMonthFormatChange = (enabled: boolean) => {
    updateSettings({
      general: {
        preferDayMonthFormat: enabled,
      },
    })
  }

  const handleLanguageChange = (newLanguage: Language) => {
    i18n.changeLanguage(newLanguage)
  }

  const handleGenerateToken = () => {
    // Generate a 32-character hexadecimal string
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    // Validate the token with Zod schema
    const validationResult = UserSchema.shape.apiToken.safeParse(newToken)
    if (!validationResult.success) {
      toast.error("Failed to generate valid API token")
      return
    }

    updateUser({
      apiToken: validationResult.data,
    })
    setShowApiToken(true)
    toast.success("API token generated and saved")
  }

  const handleRevokeToken = () => {
    updateUser({
      apiToken: null,
    })
    setShowApiToken(false)
    toast.success("API token revoked")
  }

  const handleCopyToken = async () => {
    if (user.apiToken) {
      await navigator.clipboard.writeText(user.apiToken)
      toast.success("API token copied to clipboard")
    }
  }

  const selectedOption = [...standardStartViewOptions, lastViewedOption].find(
    (option) => option.value === currentStartView,
  )

  return (
    <div className="space-y-6">
      {/* Default Landing Page */}
      <SettingsCard title={t("general.defaultPage.title", "Default Page")}>
        <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-0.5 min-w-0 break-words sm:max-w-[60%]">
            <Label htmlFor="start-view">
              {t("general.defaultPage.label", "When you open TaskTrove, show")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.defaultPage.description",
                "Choose which page you want to see when you first open TaskTrove",
              )}
            </p>
          </div>
          <Select value={currentStartView} onValueChange={handleStartViewChange}>
            <SelectTrigger id="start-view" className="w-full sm:w-auto sm:min-w-[220px] max-w-full">
              <SelectValue>
                {selectedOption && (
                  <div className="flex items-center gap-2">
                    <selectedOption.icon className="w-4 h-4" />
                    <span>{selectedOption.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {standardStartViewOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2 w-full">
                    <option.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem key={lastViewedOption.value} value={lastViewedOption.value}>
                <div className="flex items-center gap-2 w-full">
                  <lastViewedOption.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{lastViewedOption.label}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      {/* Language Settings */}
      <SettingsCard title={t("general.language.title", "Language")}>
        <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-0.5 min-w-0 break-words sm:max-w-[60%]">
            <Label htmlFor="language-select">{t("general.language.label", "Language")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("general.language.description", "Select the display language for the application")}
            </p>
          </div>
          <Select value={i18n.resolvedLanguage || "en"} onValueChange={handleLanguageChange}>
            <SelectTrigger
              id="language-select"
              className="w-full sm:w-auto sm:min-w-[200px] max-w-full"
            >
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <span>
                    {
                      languageNames[
                        i18n.resolvedLanguage && isValidLanguage(i18n.resolvedLanguage)
                          ? i18n.resolvedLanguage
                          : "en"
                      ]
                    }
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lng) => (
                <SelectItem key={lng} value={lng}>
                  <div className="flex items-center gap-2 w-full">
                    <Languages className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{languageNames[lng]}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      {/* Date Format Settings */}
      <SettingsCard title={t("general.dates.title", "Dates")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:max-w-[65%]">
            <Label htmlFor="prefer-day-month-format">
              {t("general.dates.preferDayMonth.label", "Prefer day/month for numeric dates")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.dates.preferDayMonth.description",
                "When a date like 1/2 is ambiguous, interpret it as 1 February instead of Jan 2",
              )}
            </p>
          </div>
          <Switch
            id="prefer-day-month-format"
            checked={currentPreferDayMonthFormat}
            onCheckedChange={handlePreferDayMonthFormatChange}
          />
        </div>
      </SettingsCard>

      {/* Sound Settings */}
      <SettingsCard title={t("general.audio.title", "Audio")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:max-w-[65%]">
            <Label htmlFor="sound-enabled">
              {t("general.audio.soundEffects.label", "Sound Effects")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.audio.soundEffects.description",
                "Play sounds for task completions, notifications, and other interactions",
              )}
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={currentSoundEnabled}
            onCheckedChange={handleSoundEnabledChange}
          />
        </div>
      </SettingsCard>

      {/* Linkify Settings */}
      <SettingsCard title={t("general.links.title", "Links")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:max-w-[65%]">
            <Label htmlFor="linkify-enabled">
              {t("general.links.autoConvert.label", "Auto-convert URLs to Links")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.links.autoConvert.description",
                "Automatically convert URLs in task titles to clickable links",
              )}
            </p>
          </div>
          <Switch
            id="linkify-enabled"
            checked={currentLinkifyEnabled}
            onCheckedChange={handleLinkifyEnabledChange}
          />
        </div>
      </SettingsCard>

      {/* Markdown Settings */}
      <SettingsCard title={t("general.markdown.title", "Markdown")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:max-w-[65%]">
            <Label htmlFor="markdown-enabled">
              {t("general.markdown.enable.label", "Enable Markdown in Descriptions")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.markdown.enable.description",
                "Render task descriptions as markdown with support for formatting, links, and lists",
              )}
            </p>
          </div>
          <Switch
            id="markdown-enabled"
            checked={currentMarkdownEnabled}
            onCheckedChange={handleMarkdownEnabledChange}
          />
        </div>
      </SettingsCard>

      {/* Popover Settings */}
      <SettingsCard title={t("general.popovers.title", "Popovers")} experimental>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 sm:max-w-[65%]">
            <Label htmlFor="popover-hover-open">
              {t("general.popovers.hoverOpen.label", "Open on Hover")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.popovers.hoverOpen.description",
                "Allow popovers to open when you hover over them, in addition to clicking",
              )}
            </p>
          </div>
          <Switch
            id="popover-hover-open"
            checked={currentPopoverHoverOpen}
            onCheckedChange={handlePopoverHoverOpenChange}
          />
        </div>
      </SettingsCard>

      {/* API Token Settings */}
      <SettingsCard title={t("general.apiToken.title", "API")} experimental>
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label>{t("general.apiToken.label", "API Token")}</Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "general.apiToken.description",
                "Generate an API token for programmatic access. Use this token in the Authorization header as 'Bearer YOUR_TOKEN' to authenticate API requests.",
              )}
            </p>
            <a
              href="https://developer.tasktrove.io/api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t("general.apiToken.viewDocs", "View API Documentation")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {user.apiToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type={showApiToken ? "text" : "password"}
                  value={user.apiToken}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiToken(!showApiToken)}
                  title={showApiToken ? "Hide token" : "Show token"}
                >
                  {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleCopyToken} title="Copy token">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateToken} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t("general.apiToken.regenerate", "Regenerate Token")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokeToken}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("general.apiToken.revoke", "Revoke Token")}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleGenerateToken} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t("general.apiToken.generate", "Generate Token")}
            </Button>
          )}
        </div>
      </SettingsCard>

      {/* Future General Settings */}
      {/* Add more general settings here as they're implemented */}
    </div>
  )
}
