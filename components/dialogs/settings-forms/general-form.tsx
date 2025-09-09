"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
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
import { Inbox, Calendar, Clock, CheckSquare, ListCheck, Home } from "lucide-react"

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

  // Note: During v0.5.0 migration, general property might not exist yet
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const generalSettings = (settings as { general?: { startView?: string } }).general
  const currentStartView = generalSettings?.startView ?? "all"

  const handleStartViewChange = (value: StandardViewId | "lastViewed") => {
    updateSettings({
      general: {
        startView: value,
      },
    })
  }

  const selectedOption = allStartViewOptions.find((option) => option.value === currentStartView)

  return (
    <div className="space-y-6">
      {/* Default Landing Page */}
      <SettingsCard title="Default Page">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="start-view">When you open TaskTrove, show</Label>
            <p className="text-sm text-muted-foreground">
              Choose which page you want to see when you first open TaskTrove.
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

      {/* Future General Settings */}
      {/* Add more general settings here as they're implemented */}
    </div>
  )
}
