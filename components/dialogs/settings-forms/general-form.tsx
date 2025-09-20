"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { settingsAtom, updateSettingsAtom } from "@/lib/atoms"
import type { StandardViewId } from "@/lib/types"
import { START_VIEW_METADATA } from "@/lib/constants/defaults"
import { Inbox, Calendar, Clock, CheckSquare, ListCheck, Home, Languages } from "lucide-react"
import { useTranslation } from "@/lib/i18n/client"
import { useLanguage } from "@/components/providers/language-provider"
import { languages, type Language } from "@/lib/i18n/settings"

// Language display names
const languageNames: Record<Language, string> = {
  en: "English",
  zh: "中文 (Chinese)",
}

// Icon mapping for UI components
const ICON_MAP = {
  all: ListCheck,
  inbox: Inbox,
  today: Calendar,
  upcoming: Clock,
  completed: CheckSquare,
  lastViewed: Home,
} as const

// Generate start view options from centralized metadata
const allStartViewOptions: Array<{
  value: StandardViewId | "lastViewed"
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = Object.entries(START_VIEW_METADATA)
  .filter(([key]) => key in ICON_MAP) // Only include views in the icon map
  .map(([key, metadata]) => ({
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    value: key as StandardViewId | "lastViewed",
    label: metadata.title,
    description: metadata.description,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    icon: ICON_MAP[key as keyof typeof ICON_MAP],
  }))

// Separate standard views from lastViewed
const standardViewOptions = allStartViewOptions.filter((option) => option.value !== "lastViewed")
const lastViewedOption = allStartViewOptions.find((option) => option.value === "lastViewed")

export function GeneralForm() {
  const settings = useAtomValue(settingsAtom)
  const updateSettings = useSetAtom(updateSettingsAtom)
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation(language, "settings")

  const currentStartView = settings.general.startView
  const currentSoundEnabled = settings.general.soundEnabled
  const currentLinkifyEnabled = settings.general.linkifyEnabled

  const handleStartViewChange = (value: StandardViewId | "lastViewed") => {
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

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage)
  }

  const selectedOption = allStartViewOptions.find((option) => option.value === currentStartView)

  return (
    <div className="space-y-6">
      {/* Default Landing Page */}
      <SettingsCard title={t("general.defaultPage.title", "Default Page")}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
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
            <SelectTrigger id="start-view" className="w-auto min-w-[200px]">
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
              {standardViewOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2 w-full">
                    <option.icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
              <SelectSeparator />
              {lastViewedOption && (
                <SelectItem key={lastViewedOption.value} value={lastViewedOption.value}>
                  <div className="flex items-center gap-2 w-full">
                    <lastViewedOption.icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{lastViewedOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {lastViewedOption.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      {/* Language Settings */}
      <SettingsCard title={t("general.language.title", "Language")}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="language-select">{t("general.language.label", "Language")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("general.language.description", "Select the display language for the application")}
            </p>
          </div>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select" className="w-auto min-w-[180px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <span>{languageNames[language]}</span>
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

      {/* Sound Settings */}
      <SettingsCard title={t("general.audio.title", "Audio")}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
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
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
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

      {/* Future General Settings */}
      {/* Add more general settings here as they're implemented */}
    </div>
  )
}
