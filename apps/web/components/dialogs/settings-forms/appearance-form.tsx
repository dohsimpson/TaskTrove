"use client"

import React from "react"
import { useAtom } from "jotai"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { useTranslation } from "@tasktrove/i18n"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"
import { updateSettingsAtom } from "@tasktrove/atoms/core/settings"
import type { WeekStartsOn } from "@tasktrove/types/settings"
import { Sparkles, Moon, Sun } from "lucide-react"
import { toast } from "sonner"

export function AppearanceForm() {
  const { t } = useTranslation("settings")
  const { theme: colorScheme, setTheme: setColorScheme } = useTheme()
  const [settings] = useAtom(settingsAtom)
  const [, updateSettings] = useAtom(updateSettingsAtom)

  const handleColorSchemeChange = (newColorScheme: "light" | "dark" | "system") => {
    setColorScheme(newColorScheme)
    toast.success(
      `${newColorScheme === "system" ? "System" : newColorScheme.charAt(0).toUpperCase() + newColorScheme.slice(1)} mode enabled`,
    )
  }

  const COLOR_SCHEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun, description: "Always use light mode" },
    { value: "dark", label: "Dark", icon: Moon, description: "Always use dark mode" },
    { value: "system", label: "System", icon: Sparkles, description: "Follow system preference" },
  ]

  const currentColorSchemeOption = COLOR_SCHEME_OPTIONS.find(
    (option) => option.value === colorScheme,
  )

  const WEEK_START_OPTIONS = [
    { value: "unset", label: t("appearance.ui.weekStart.default", "Sunday (default)") },
    { value: "1", label: t("appearance.ui.weekStart.monday", "Monday") },
    { value: "2", label: t("appearance.ui.weekStart.tuesday", "Tuesday") },
    { value: "3", label: t("appearance.ui.weekStart.wednesday", "Wednesday") },
    { value: "4", label: t("appearance.ui.weekStart.thursday", "Thursday") },
    { value: "5", label: t("appearance.ui.weekStart.friday", "Friday") },
    { value: "6", label: t("appearance.ui.weekStart.saturday", "Saturday") },
  ]

  const isValidWeekStartsOn = (value: number): value is WeekStartsOn => {
    return [0, 1, 2, 3, 4, 5, 6].includes(value)
  }

  const weekStartsOnValue =
    settings.uiSettings.weekStartsOn === undefined
      ? "unset"
      : settings.uiSettings.weekStartsOn.toString()

  const handleWeekStartsOnChange = (value: string) => {
    if (value === "unset") {
      updateSettings({ uiSettings: { weekStartsOn: undefined } })
      return
    }

    const numValue = Number(value)
    const nextValue: WeekStartsOn | undefined = isValidWeekStartsOn(numValue) ? numValue : 0
    updateSettings({ uiSettings: { weekStartsOn: nextValue } })
    toast.success(
      value === "unset"
        ? t("appearance.ui.weekStart.toastDefault", "Week starts on Sunday")
        : t("appearance.ui.weekStart.toast", "Week starts on {{day}}", {
            day: WEEK_START_OPTIONS.find((opt) => opt.value === value)?.label ?? "",
          }),
    )
  }

  return (
    <div className="space-y-6">
      <SettingsCard title={t("appearance.colorScheme.title", "Color Scheme")}>
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label>{t("appearance.colorScheme.label", "Choose your color scheme")}</Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "appearance.colorScheme.description",
                "Select light, dark, or follow system preference",
              )}
            </p>
          </div>

          <Select value={colorScheme} onValueChange={handleColorSchemeChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {currentColorSchemeOption && (
                  <div className="flex items-center gap-2">
                    <currentColorSchemeOption.icon className="w-4 h-4" />
                    <span>{currentColorSchemeOption.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COLOR_SCHEME_OPTIONS.map((option) => (
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
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      <SettingsCard title={t("appearance.ui.title", "Calendar")}>
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label>{t("appearance.ui.weekStart.label", "First day of the week")}</Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "appearance.ui.weekStart.description",
                "Choose which day your week starts on for calendars and date picks",
              )}
            </p>
          </div>

          <Select value={weekStartsOnValue} onValueChange={handleWeekStartsOnChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_START_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-start justify-between gap-4 rounded-md bg-background px-1 py-2">
            <div className="space-y-0.5">
              <Label>{t("appearance.ui.weekNumber.label", "Show week numbers")}</Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "appearance.ui.weekNumber.description",
                  "Display ISO week numbers in calendars and scheduling pickers",
                )}
              </p>
            </div>

            <Switch
              checked={Boolean(settings.uiSettings.showWeekNumber)}
              onCheckedChange={(checked) => {
                updateSettings({ uiSettings: { showWeekNumber: checked } })
                toast.success(
                  checked
                    ? t("appearance.ui.weekNumber.enabled", "Week numbers are now visible")
                    : t("appearance.ui.weekNumber.disabled", "Week numbers are hidden"),
                )
              }}
              aria-label={t("appearance.ui.weekNumber.label", "Show week numbers")}
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
