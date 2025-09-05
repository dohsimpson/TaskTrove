"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Check, X, AlertTriangle, Clock, Loader2, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { notificationAtoms } from "@/lib/atoms/core/notifications"
import { settingsAtoms } from "@/lib/atoms/core/settings"
import type { NotificationSettings } from "@/lib/types"
import { SettingsCard } from "@/components/ui/custom/settings-card"

export function NotificationsForm() {
  const notificationSettings = useAtomValue(notificationAtoms.settings)
  const updateSettings = useSetAtom(settingsAtoms.actions.updateSettings)
  const notificationPermission = useAtomValue(notificationAtoms.permission)
  const requestPermission = useSetAtom(notificationAtoms.actions.requestPermission)
  const testNotification = useSetAtom(notificationAtoms.actions.test)
  const isSystemActive = useAtomValue(notificationAtoms.isSystemActive)

  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  const handlePermissionRequest = async () => {
    setIsRequestingPermission(true)
    try {
      await requestPermission()
    } finally {
      setIsRequestingPermission(false)
    }
  }

  const handleTestNotification = () => {
    const success = testNotification()
    if (!success) {
      // Could show toast or alert here
      console.warn("Failed to send test notification")
    }
  }

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    updateSettings({
      notifications: {
        ...notificationSettings,
        ...updates,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Global Enable/Disable */}
      <SettingsCard title="General Settings" experimental>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-enabled">Enable Notifications</Label>
            <p className="text-xs text-muted-foreground">Turn all notifications on or off</p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={notificationSettings.enabled}
            onCheckedChange={(enabled) => updateNotificationSettings({ enabled })}
            disabled={notificationPermission !== "granted"}
          />
        </div>
      </SettingsCard>

      {/* Permission Status */}
      <SettingsCard title="Permission Status">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Browser Notifications</p>
            <p className="text-xs text-muted-foreground">
              {notificationPermission === "granted" && "Notifications are enabled"}
              {notificationPermission === "denied" && "Notifications are blocked"}
              {notificationPermission === "default" && "Permission not requested"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notificationPermission === "granted" && (
              <Badge variant="secondary" className="text-green-600">
                <Check className="w-3 h-3 mr-1" />
                Granted
              </Badge>
            )}
            {notificationPermission === "denied" && (
              <Badge variant="destructive">
                <X className="w-3 h-3 mr-1" />
                Blocked
              </Badge>
            )}
            {notificationPermission === "default" && (
              <Button size="sm" onClick={handlePermissionRequest} disabled={isRequestingPermission}>
                {isRequestingPermission ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable"}
              </Button>
            )}
          </div>
        </div>

        {notificationPermission === "denied" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Notifications Blocked</AlertTitle>
            <AlertDescription>
              To receive notifications, please enable them in your browser settings and refresh the
              page.
            </AlertDescription>
          </Alert>
        )}

        {notificationPermission === "granted" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestNotification}>
              <Bell className="w-4 h-4 mr-1" />
              Test Notification
            </Button>
            {isSystemActive && (
              <Badge variant="secondary" className="text-blue-600">
                <Clock className="w-3 h-3 mr-1" />
                System Active
              </Badge>
            )}
          </div>
        )}
      </SettingsCard>

      {/* Commented out advanced settings for future implementation */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="deadlines-enabled">Task Deadlines</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications when tasks are due
                </p>
              </div>
              <Switch
                id="deadlines-enabled"
                checked={notificationSettings.types.deadlines}
                onCheckedChange={(deadlines) =>
                  updateNotificationSettings({
                    types: { ...notificationSettings.types, deadlines },
                  })
                }
                disabled={!notificationSettings.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="reminders-enabled">Task Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications to remind you about upcoming tasks
                </p>
              </div>
              <Switch
                id="reminders-enabled"
                checked={notificationSettings.types.reminders}
                onCheckedChange={(reminders) =>
                  updateNotificationSettings({
                    types: { ...notificationSettings.types, reminders },
                  })
                }
                disabled={!notificationSettings.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiet Hours</CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">
                Temporarily disable notifications during specific hours
              </p>
            </div>
            <Switch
              id="quiet-hours-enabled"
              checked={notificationSettings.schedule.quietHours.enabled}
              onCheckedChange={(enabled) =>
                updateNotificationSettings({
                  schedule: {
                    ...notificationSettings.schedule,
                    quietHours: { ...notificationSettings.schedule.quietHours, enabled },
                  },
                })
              }
              disabled={!notificationSettings.enabled}
            />
          </div>

          {notificationSettings.schedule.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={notificationSettings.schedule.quietHours.start}
                  onChange={(e) =>
                    updateNotificationSettings({
                      schedule: {
                        ...notificationSettings.schedule,
                        quietHours: {
                          ...notificationSettings.schedule.quietHours,
                          start: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={notificationSettings.schedule.quietHours.end}
                  onChange={(e) =>
                    updateNotificationSettings({
                      schedule: {
                        ...notificationSettings.schedule,
                        quietHours: {
                          ...notificationSettings.schedule.quietHours,
                          end: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="weekends-enabled">Weekend Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications on weekends
              </p>
            </div>
            <Switch
              id="weekends-enabled"
              checked={notificationSettings.schedule.weekends}
              onCheckedChange={(weekends) =>
                updateNotificationSettings({
                  schedule: { ...notificationSettings.schedule, weekends },
                })
              }
              disabled={!notificationSettings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sound Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="sound-enabled">Notification Sounds</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound when notifications appear
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={notificationSettings.sound.enabled}
              onCheckedChange={(enabled) =>
                updateNotificationSettings({
                  sound: { ...notificationSettings.sound, enabled },
                })
              }
              disabled={!notificationSettings.enabled}
            />
          </div>

          {notificationSettings.sound.enabled && (
            <div className="space-y-2">
              <Label htmlFor="volume">Volume: {notificationSettings.sound.volume}%</Label>
              <Slider
                id="volume"
                min={0}
                max={100}
                step={10}
                value={[notificationSettings.sound.volume]}
                onValueChange={([volume]) =>
                  updateNotificationSettings({
                    sound: { ...notificationSettings.sound, volume },
                  })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
      */}
    </div>
  )
}
