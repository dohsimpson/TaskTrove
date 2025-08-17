"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  behaviorSettingsAtom,
  updateStartViewAtom,
  updateWeekStartDayAtom,
  updateDefaultPriorityAtom,
  toggleKeyboardShortcutsAtom,
  updateBehaviorSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"
import type { BehaviorSettings } from "@/lib/types"

export function BehaviorForm() {
  const settings = useAtomValue(behaviorSettingsAtom)
  const updateStartView = useSetAtom(updateStartViewAtom)
  const updateWeekStartDay = useSetAtom(updateWeekStartDayAtom)
  const updateDefaultPriority = useSetAtom(updateDefaultPriorityAtom)
  const toggleKeyboardShortcuts = useSetAtom(toggleKeyboardShortcutsAtom)
  const updateSettings = useSetAtom(updateBehaviorSettingsAtom)

  const weekDayOptions = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ]

  const workingDaysOptions = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ]

  const handleWorkingDaysChange = (day: number, checked: boolean) => {
    const currentDays = settings.workingDays
    if (checked) {
      updateSettings({ workingDays: [...currentDays, day] })
    } else {
      updateSettings({ workingDays: currentDays.filter((d) => d !== day) })
    }
  }

  const handleTimeFormatChange = (format: BehaviorSettings["timeFormat"]) => {
    updateSettings({ timeFormat: format })
  }

  const handleSystemLocaleChange = (locale: string) => {
    updateSettings({ systemLocale: locale })
  }

  const toggleConfirmation = (key: keyof BehaviorSettings["confirmations"]) => {
    updateSettings({
      confirmations: {
        ...settings.confirmations,
        [key]: !settings.confirmations[key],
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Default Views */}
      <Card>
        <CardHeader>
          <CardTitle>Default Views</CardTitle>
          <CardDescription>Configure which view opens when you start the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Start View</Label>
            <Select value={settings.startView} onValueChange={updateStartView}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="lastViewed">Last Viewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time and Date Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Time & Date</CardTitle>
          <CardDescription>
            Configure how time and dates are handled in the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Week Start Day</Label>
            <Select
              value={settings.weekStartDay.toString()}
              onValueChange={(value) => updateWeekStartDay(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDayOptions.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="grid grid-cols-2 gap-2">
              {workingDaysOptions.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`working-day-${day.value}`}
                    checked={settings.workingDays.includes(day.value)}
                    onCheckedChange={(checked) =>
                      handleWorkingDaysChange(day.value, checked === true)
                    }
                  />
                  <Label htmlFor={`working-day-${day.value}`} className="text-sm">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time Format</Label>
            <Select value={settings.timeFormat} onValueChange={handleTimeFormatChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>System Locale</Label>
            <Select value={settings.systemLocale} onValueChange={handleSystemLocaleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="en-GB">English (UK)</SelectItem>
                <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                <SelectItem value="fr-FR">French (France)</SelectItem>
                <SelectItem value="de-DE">German (Germany)</SelectItem>
                <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                <SelectItem value="ja-JP">Japanese (Japan)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Creation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Task Creation</CardTitle>
          <CardDescription>Set default values and behaviors for new tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Task Priority</Label>
            <Select
              value={settings.defaultTaskPriority.toString()}
              onValueChange={(value) => updateDefaultPriority(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Priority 1 (Highest)</SelectItem>
                <SelectItem value="2">Priority 2 (High)</SelectItem>
                <SelectItem value="3">Priority 3 (Medium)</SelectItem>
                <SelectItem value="4">Priority 4 (Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign to Current Project</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign new tasks to the currently viewed project
              </p>
            </div>
            <Switch
              checked={settings.autoAssignToCurrentProject}
              onCheckedChange={(checked) => updateSettings({ autoAssignToCurrentProject: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-focus Task Title</Label>
              <p className="text-sm text-muted-foreground">
                Automatically focus the title field when creating tasks
              </p>
            </div>
            <Switch
              checked={settings.autoFocusTaskTitle}
              onCheckedChange={(checked) => updateSettings({ autoFocusTaskTitle: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Interface Behavior</CardTitle>
          <CardDescription>Configure how the interface responds to your actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Keyboard Shortcuts</Label>
              <p className="text-sm text-muted-foreground">
                Enable keyboard shortcuts for faster navigation
              </p>
            </div>
            <Switch
              checked={settings.keyboardShortcuts}
              onCheckedChange={toggleKeyboardShortcuts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Dialogs</CardTitle>
          <CardDescription>
            Choose which actions require confirmation before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Delete Task</Label>
            <Switch
              checked={settings.confirmations.deleteTask}
              onCheckedChange={() => toggleConfirmation("deleteTask")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Delete Project</Label>
            <Switch
              checked={settings.confirmations.deleteProject}
              onCheckedChange={() => toggleConfirmation("deleteProject")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Delete Label</Label>
            <Switch
              checked={settings.confirmations.deleteLabel}
              onCheckedChange={() => toggleConfirmation("deleteLabel")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mark All Complete</Label>
            <Switch
              checked={settings.confirmations.markAllComplete}
              onCheckedChange={() => toggleConfirmation("markAllComplete")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
