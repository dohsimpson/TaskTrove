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
import { useTranslation } from "@tasktrove/i18n"
import { Sparkles, Moon, Sun } from "lucide-react"
import { toast } from "sonner"

export function AppearanceForm() {
  const { t } = useTranslation("settings")
  const { theme: colorScheme, setTheme: setColorScheme } = useTheme()

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
    </div>
  )
}
