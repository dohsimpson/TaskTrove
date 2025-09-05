"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Check, X, AlertTriangle, Loader2, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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

  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [hasTriedRetry, setHasTriedRetry] = useState(false)

  const handlePermissionRequest = async () => {
    setIsRequestingPermission(true)
    try {
      const previousPermission = notificationPermission
      await requestPermission()

      // If permission was denied and still denied after request, user likely needs manual action
      if (previousPermission === "denied") {
        setHasTriedRetry(true)
      }
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
        <div className="space-y-4">
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

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="require-interaction">Require User Interaction</Label>
              <p className="text-xs text-muted-foreground">
                Notifications stay visible until you interact with them
              </p>
            </div>
            <Switch
              id="require-interaction"
              checked={notificationSettings.requireInteraction}
              onCheckedChange={(requireInteraction) =>
                updateNotificationSettings({ requireInteraction })
              }
              disabled={!notificationSettings.enabled || notificationPermission !== "granted"}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Permission Status */}
      <SettingsCard title="Permission Status">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Browser Notifications</p>
          </div>
          <div className="flex items-center gap-3">
            {notificationPermission === "granted" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Enabled</span>
              </div>
            )}
            {notificationPermission === "denied" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">Blocked</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePermissionRequest}
                  disabled={isRequestingPermission}
                  className="h-7 px-3 text-xs"
                  title={
                    hasTriedRetry
                      ? "Browser may require manual settings change"
                      : "Try requesting permission again"
                  }
                >
                  {isRequestingPermission ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Requesting
                    </>
                  ) : hasTriedRetry ? (
                    "Try Again"
                  ) : (
                    "Retry"
                  )}
                </Button>
              </div>
            )}
            {notificationPermission === "default" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">Not enabled</span>
                </div>
                <Button
                  size="sm"
                  onClick={handlePermissionRequest}
                  disabled={isRequestingPermission}
                  className="h-7 px-3 text-xs"
                >
                  {isRequestingPermission ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Requesting
                    </>
                  ) : (
                    "Enable"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {notificationPermission === "denied" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Notifications Blocked</AlertTitle>
            <AlertDescription>
              {hasTriedRetry ? (
                <>
                  The browser didn't show a permission dialog. To enable notifications, click the 🔒
                  icon in your address bar or go to browser settings → Privacy & Security → Site
                  Settings → Notifications, then refresh the page.
                </>
              ) : (
                <>
                  Try the "Retry" button first. If that doesn't work, you'll need to enable
                  notifications manually in your browser settings.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {notificationPermission === "granted" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestNotification}>
              <Bell className="w-4 h-4 mr-1" />
              Test Notification
            </Button>
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
