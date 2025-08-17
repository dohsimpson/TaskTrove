"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  appearanceSettingsAtom,
  updateThemeAtom,
  updateDensityAtom,
  updateFontScaleAtom,
  updateLanguageAtom,
  toggleHighContrastAtom,
  updateAppearanceSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"
import type { AppearanceSettings } from "@/lib/types"

export function AppearanceForm() {
  const settings = useAtomValue(appearanceSettingsAtom)
  const updateTheme = useSetAtom(updateThemeAtom)
  const updateDensity = useSetAtom(updateDensityAtom)
  const updateFontScale = useSetAtom(updateFontScaleAtom)
  const updateLanguage = useSetAtom(updateLanguageAtom)
  const toggleHighContrast = useSetAtom(toggleHighContrastAtom)
  const updateSettings = useSetAtom(updateAppearanceSettingsAtom)

  const handleFontScaleChange = (value: number[]) => {
    updateFontScale(value[0])
  }

  const handleDateFormatChange = (format: AppearanceSettings["dateFormat"]) => {
    updateSettings({ dateFormat: format })
  }

  const handleSidebarPositionChange = (position: AppearanceSettings["sidebarPosition"]) => {
    updateSettings({ sidebarPosition: position })
  }

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose your preferred color theme for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Color Theme</Label>
            <Select value={settings.theme} onValueChange={updateTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Contrast Mode</Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better accessibility
              </p>
            </div>
            <Switch checked={settings.highContrast} onCheckedChange={toggleHighContrast} />
          </div>
        </CardContent>
      </Card>

      {/* Interface Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Interface</CardTitle>
          <CardDescription>Customize the layout and density of the interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Interface Density</Label>
            <Select value={settings.density} onValueChange={updateDensity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sidebar Position</Label>
            <Select value={settings.sidebarPosition} onValueChange={handleSidebarPositionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font Size</Label>
            <div className="space-y-2">
              <Slider
                value={[settings.fontScale]}
                onValueChange={handleFontScaleChange}
                min={0.8}
                max={1.5}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Small (0.8x)</span>
                <span>Normal (1.0x)</span>
                <span>Large (1.5x)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>Configure how tasks and data are displayed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Task Metadata</Label>
              <p className="text-sm text-muted-foreground">
                Display additional task information by default
              </p>
            </div>
            <Switch
              checked={settings.showTaskMetadata}
              onCheckedChange={(checked) => updateSettings({ showTaskMetadata: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Priority Colors</Label>
              <p className="text-sm text-muted-foreground">
                Use colors to indicate task priority levels
              </p>
            </div>
            <Switch
              checked={settings.priorityColors}
              onCheckedChange={(checked) => updateSettings({ priorityColors: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select value={settings.dateFormat} onValueChange={handleDateFormatChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (EU)</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (ISO)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Choose your preferred language for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Interface Language</Label>
            <Select value={settings.language} onValueChange={updateLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduced Motion</Label>
              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onCheckedChange={(checked) => updateSettings({ reducedMotion: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
