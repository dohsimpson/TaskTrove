"use client"

import React from "react"
import { useTheme } from "next-themes"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { useSelectedTheme } from "@/components/theme/theme-applier"
import { useTranslation } from "@tasktrove/i18n"
import { refreshBrowserAfter } from "@tasktrove/dom-utils"
import {
  THEME_OPTIONS as BASE_THEME_OPTIONS,
  THEME_DISPLAY_NAMES,
  type Theme,
} from "@tasktrove/constants"
import { Sparkles, Moon, Sun } from "lucide-react"
import { toast } from "sonner"

// Theme descriptions
const THEME_DESCRIPTIONS: Record<Theme, string> = {
  default: "Default theme with elegant violet tones",
  "violet-bloom": "Elegant violet and purple color palette",
  "amethyst-haze": "Rich amethyst and lavender tones",
  catppuccin: "Soothing pastel colors inspired by Catppuccin",
  bubblegum: "Playful pink and bubblegum aesthetic",
  "clean-slate": "Minimal grayscale design",
  "modern-minimal": "Clean minimal design with custom shadows",
  "doom-64": "Dark gaming aesthetic with enhanced shadows",
}

// Theme options with icons
const THEME_OPTIONS = BASE_THEME_OPTIONS.map((theme) => ({
  value: theme,
  label: THEME_DISPLAY_NAMES[theme],
  description: THEME_DESCRIPTIONS[theme],
}))

export function AppearanceForm() {
  const { t } = useTranslation("settings")
  const { theme: colorScheme, setTheme: setColorScheme } = useTheme()
  const { selectedTheme, setTheme } = useSelectedTheme()

  // Color scheme (light/dark/system) handler
  const handleColorSchemeChange = (newColorScheme: "light" | "dark" | "system") => {
    setColorScheme(newColorScheme)
    toast.success(
      `${newColorScheme === "system" ? "System" : newColorScheme.charAt(0).toUpperCase() + newColorScheme.slice(1)} mode enabled`,
    )
  }

  // Theme handler
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    toast.success(`Theme changed to ${THEME_DISPLAY_NAMES[newTheme]}`)

    // Refresh the browser to apply the new theme
    refreshBrowserAfter(500) // Small delay to show the toast before refreshing
  }

  const currentThemeOption = THEME_OPTIONS.find((option) => option.value === selectedTheme)

  // Color scheme options
  const COLOR_SCHEME_OPTIONS = [
    { value: "light", label: "Light", icon: Sun, description: "Always use light mode" },
    { value: "dark", label: "Dark", icon: Moon, description: "Always use dark mode" },
    { value: "system", label: "System", icon: Sparkles, description: "Follow system preference" },
  ]

  const currentColorSchemeOption = COLOR_SCHEME_OPTIONS.find(
    (option) => option.value === colorScheme,
  )

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <SettingsCard title={t("appearance.theme.title", "Theme")}>
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Label>{t("appearance.theme.label", "Choose your theme")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("appearance.theme.description", "Select the color palette and visual style")}
            </p>
          </div>

          <Select value={selectedTheme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {currentThemeOption && (
                  <div className="flex items-center gap-2">
                    <span>{currentThemeOption.label}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2 w-full">
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

      {/* Color Scheme Settings */}
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
    </div>
  )
}
