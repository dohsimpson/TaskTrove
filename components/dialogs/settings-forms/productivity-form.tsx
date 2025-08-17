"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  productivitySettingsAtom,
  toggleFocusModeAtom,
  updateProductivitySettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"

export function ProductivityForm() {
  const settings = useAtomValue(productivitySettingsAtom)
  const toggleFocusMode = useSetAtom(toggleFocusModeAtom)
  const updateSettings = useSetAtom(updateProductivitySettingsAtom)

  const handlePomodoroUpdate = (field: keyof typeof settings.pomodoro, value: number | boolean) => {
    updateSettings({
      pomodoro: {
        ...settings.pomodoro,
        [field]: value,
      },
    })
  }

  const handleGoalsUpdate = (field: keyof typeof settings.goals, value: number | boolean) => {
    updateSettings({
      goals: {
        ...settings.goals,
        [field]: value,
      },
    })
  }

  const handleAnalyticsUpdate = (field: keyof typeof settings.analytics, value: boolean) => {
    updateSettings({
      analytics: {
        ...settings.analytics,
        [field]: value,
      },
    })
  }

  const handleMetricVisibilityUpdate = (
    metric: keyof typeof settings.analytics.metricVisibility,
    value: boolean,
  ) => {
    updateSettings({
      analytics: {
        ...settings.analytics,
        metricVisibility: {
          ...settings.analytics.metricVisibility,
          [metric]: value,
        },
      },
    })
  }

  const handleFocusModeUpdate = (field: keyof typeof settings.focusMode, value: boolean) => {
    updateSettings({
      focusMode: {
        ...settings.focusMode,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Pomodoro Timer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Pomodoro Timer</CardTitle>
          <CardDescription>
            Configure your Pomodoro timer settings for focused work sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="work-duration">Work Duration (minutes)</Label>
              <Input
                id="work-duration"
                type="number"
                min="1"
                max="120"
                value={settings.pomodoro.workDuration}
                onChange={(e) =>
                  handlePomodoroUpdate("workDuration", parseInt(e.target.value) || 25)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="short-break">Short Break (minutes)</Label>
              <Input
                id="short-break"
                type="number"
                min="1"
                max="30"
                value={settings.pomodoro.shortBreakDuration}
                onChange={(e) =>
                  handlePomodoroUpdate("shortBreakDuration", parseInt(e.target.value) || 5)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="long-break">Long Break (minutes)</Label>
              <Input
                id="long-break"
                type="number"
                min="1"
                max="60"
                value={settings.pomodoro.longBreakDuration}
                onChange={(e) =>
                  handlePomodoroUpdate("longBreakDuration", parseInt(e.target.value) || 15)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="long-break-interval">Long Break Interval (sessions)</Label>
            <Input
              id="long-break-interval"
              type="number"
              min="2"
              max="10"
              value={settings.pomodoro.longBreakInterval}
              onChange={(e) =>
                handlePomodoroUpdate("longBreakInterval", parseInt(e.target.value) || 4)
              }
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Number of work sessions before a long break
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-start Breaks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start break timer when work session ends
              </p>
            </div>
            <Switch
              checked={settings.pomodoro.autoStartBreaks}
              onCheckedChange={(checked) => handlePomodoroUpdate("autoStartBreaks", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-start Work</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start work timer when break ends
              </p>
            </div>
            <Switch
              checked={settings.pomodoro.autoStartWork}
              onCheckedChange={(checked) => handlePomodoroUpdate("autoStartWork", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Notifications</Label>
              <p className="text-sm text-muted-foreground">Play sound when timer starts or stops</p>
            </div>
            <Switch
              checked={settings.pomodoro.soundEnabled}
              onCheckedChange={(checked) => handlePomodoroUpdate("soundEnabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goal Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Tracking</CardTitle>
          <CardDescription>
            Set daily and weekly targets to track your productivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Goal Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track daily and weekly task completion goals
              </p>
            </div>
            <Switch
              checked={settings.goals.trackingEnabled}
              onCheckedChange={(checked) => handleGoalsUpdate("trackingEnabled", checked)}
            />
          </div>

          {settings.goals.trackingEnabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-target">Daily Task Target</Label>
                  <Input
                    id="daily-target"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.goals.dailyTaskTarget}
                    onChange={(e) =>
                      handleGoalsUpdate("dailyTaskTarget", parseInt(e.target.value) || 5)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly-target">Weekly Task Target</Label>
                  <Input
                    id="weekly-target"
                    type="number"
                    min="1"
                    max="200"
                    value={settings.goals.weeklyTaskTarget}
                    onChange={(e) =>
                      handleGoalsUpdate("weeklyTaskTarget", parseInt(e.target.value) || 25)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Progress</Label>
                  <p className="text-sm text-muted-foreground">
                    Display goal progress in the interface
                  </p>
                </div>
                <Switch
                  checked={settings.goals.showProgress}
                  onCheckedChange={(checked) => handleGoalsUpdate("showProgress", checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Analytics Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics & Metrics</CardTitle>
          <CardDescription>Configure which metrics are collected and displayed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Collection</Label>
              <p className="text-sm text-muted-foreground">
                Enable analytics data collection for insights
              </p>
            </div>
            <Switch
              checked={settings.analytics.dataCollection}
              onCheckedChange={(checked) => handleAnalyticsUpdate("dataCollection", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Metrics</Label>
              <p className="text-sm text-muted-foreground">
                Display productivity metrics in the interface
              </p>
            </div>
            <Switch
              checked={settings.analytics.showMetrics}
              onCheckedChange={(checked) => handleAnalyticsUpdate("showMetrics", checked)}
            />
          </div>

          {settings.analytics.showMetrics && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visible Metrics</Label>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Productivity Score</Label>
                <Switch
                  checked={settings.analytics.metricVisibility.productivity}
                  onCheckedChange={(checked) =>
                    handleMetricVisibilityUpdate("productivity", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Completion Streak</Label>
                <Switch
                  checked={settings.analytics.metricVisibility.streak}
                  onCheckedChange={(checked) => handleMetricVisibilityUpdate("streak", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Time Spent</Label>
                <Switch
                  checked={settings.analytics.metricVisibility.timeSpent}
                  onCheckedChange={(checked) => handleMetricVisibilityUpdate("timeSpent", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Completion Rate</Label>
                <Switch
                  checked={settings.analytics.metricVisibility.completion}
                  onCheckedChange={(checked) => handleMetricVisibilityUpdate("completion", checked)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Focus Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Focus Mode</CardTitle>
          <CardDescription>Configure focus mode settings to minimize distractions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Focus Mode</Label>
              <p className="text-sm text-muted-foreground">
                Activate distraction-free work environment
              </p>
            </div>
            <Switch checked={settings.focusMode.enabled} onCheckedChange={toggleFocusMode} />
          </div>

          {settings.focusMode.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Hide Distractions</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide non-essential UI elements during focus sessions
                  </p>
                </div>
                <Switch
                  checked={settings.focusMode.hideDistractions}
                  onCheckedChange={(checked) => handleFocusModeUpdate("hideDistractions", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Minimal UI</Label>
                  <p className="text-sm text-muted-foreground">
                    Use simplified interface during focus mode
                  </p>
                </div>
                <Switch
                  checked={settings.focusMode.minimalUI}
                  onCheckedChange={(checked) => handleFocusModeUpdate("minimalUI", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Block Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Suppress notifications during focus sessions
                  </p>
                </div>
                <Switch
                  checked={settings.focusMode.blockNotifications}
                  onCheckedChange={(checked) =>
                    handleFocusModeUpdate("blockNotifications", checked)
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
