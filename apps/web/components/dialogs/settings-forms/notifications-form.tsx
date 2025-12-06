"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Check, X, AlertTriangle, Loader2, Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { notificationAtoms } from "@tasktrove/atoms/core/notifications"
import { settingsAtoms } from "@tasktrove/atoms/core/settings"
import type { NotificationSettings } from "@tasktrove/types/settings"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { isSecureContext } from "@tasktrove/dom-utils/notifications"
import { log } from "@/lib/utils/logger"
import { useTranslation } from "@tasktrove/i18n"
export function NotificationsForm() {
  const notificationSettings = useAtomValue(notificationAtoms.settings)
  const updateSettings = useSetAtom(settingsAtoms.actions.updateSettings)
  const notificationPermission = useAtomValue(notificationAtoms.permission)
  const requestPermission = useSetAtom(notificationAtoms.actions.requestPermission)
  const testNotification = useSetAtom(notificationAtoms.actions.test)

  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [hasTriedRetry, setHasTriedRetry] = useState(false)

  const { t } = useTranslation("settings")

  // Check if we're in a secure context (HTTPS or localhost)
  const isInSecureContext = isSecureContext()

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
      log.warn(
        { module: "components", component: "NotificationsForm" },
        "Failed to send test notification",
      )
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
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Global Enable/Disable */}
      <SettingsCard title={t("notifications.general.title", "General Settings")} experimental>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications-enabled">
                {t("notifications.general.enableNotifications.label", "Enable Notifications")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "notifications.general.enableNotifications.description",
                  "Turn all notifications on or off",
                )}
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={notificationSettings.enabled}
              onCheckedChange={(enabled) => updateNotificationSettings({ enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="require-interaction">
                {t("notifications.general.requireInteraction.label", "Require User Interaction")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "notifications.general.requireInteraction.description",
                  "Notifications stay visible until you interact with them",
                )}
              </p>
            </div>
            <Switch
              id="require-interaction"
              checked={notificationSettings.requireInteraction}
              onCheckedChange={(requireInteraction) =>
                updateNotificationSettings({ requireInteraction })
              }
            />
          </div>
        </div>
      </SettingsCard>

      {/* Permission Status */}
      <SettingsCard title={t("notifications.permissionStatus.title", "Permission Status")}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("notifications.permissionStatus.browserNotifications", "Browser Notifications")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isInSecureContext && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
                <span className="text-sm font-medium">
                  {t("notifications.permissionStatus.requiresHttps", "Notification requires HTTPS")}
                </span>
              </div>
            )}
            {isInSecureContext && notificationPermission === "granted" && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="size-4" />
                <span className="text-sm font-medium">
                  {t("notifications.permissionStatus.enabled", "Enabled")}
                </span>
              </div>
            )}
            {isInSecureContext && notificationPermission === "denied" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <X className="size-4" />
                  <span className="text-sm font-medium">
                    {t("notifications.permissionStatus.blocked", "Blocked")}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePermissionRequest}
                  disabled={isRequestingPermission}
                  className="h-7 px-3 text-xs"
                  title={
                    hasTriedRetry
                      ? t(
                          "notifications.permissionStatus.browserSettingsTooltip",
                          "Browser may require manual settings change",
                        )
                      : t(
                          "notifications.permissionStatus.retryTooltip",
                          "Try requesting permission again",
                        )
                  }
                >
                  {isRequestingPermission ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {t("notifications.permissionStatus.requesting", "Requesting")}
                    </>
                  ) : hasTriedRetry ? (
                    t("notifications.permissionStatus.tryAgain", "Try Again")
                  ) : (
                    t("notifications.permissionStatus.retry", "Retry")
                  )}
                </Button>
              </div>
            )}
            {isInSecureContext && notificationPermission === "default" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bell className="size-4" />
                  <span className="text-sm font-medium">
                    {t("notifications.permissionStatus.notEnabled", "Not enabled")}
                  </span>
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
                      {t("notifications.permissionStatus.requesting", "Requesting")}
                    </>
                  ) : (
                    t("notifications.permissionStatus.enable", "Enable")
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isInSecureContext && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {t(
                "notifications.alerts.secureConnectionRequired.title",
                "Secure Connection Required",
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                "notifications.alerts.secureConnectionRequired.description",
                "Notifications require a secure connection (HTTPS) or localhost. Please access this site via HTTPS or run it on localhost to enable notification features.",
              )}
            </AlertDescription>
          </Alert>
        )}

        {isInSecureContext && notificationPermission === "denied" && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {t("notifications.alerts.notificationsBlocked.title", "Notifications Blocked")}
            </AlertTitle>
            <AlertDescription>
              {hasTriedRetry
                ? t(
                    "notifications.alerts.notificationsBlocked.manualInstructions",
                    "The browser didn't show a permission dialog. To enable notifications, click the 🔒 icon in your address bar or go to browser settings → Privacy & Security → Site Settings → Notifications, then refresh the page.",
                  )
                : t(
                    "notifications.alerts.notificationsBlocked.retryInstructions",
                    "Try the \"Retry\" button first. If that doesn't work, you'll need to enable notifications manually in your browser settings.",
                  )}
            </AlertDescription>
          </Alert>
        )}

        {isInSecureContext && notificationPermission === "granted" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTestNotification}>
              <Bell className="size-4 mr-1" />
              {t("notifications.permissionStatus.testNotification", "Test Notification")}
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
