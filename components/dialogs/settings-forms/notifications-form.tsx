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
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  notificationSettingsAtom,
  updateNotificationSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"

export function NotificationsForm() {
  const settings = useAtomValue(notificationSettingsAtom)
  const updateSettings = useSetAtom(updateNotificationSettingsAtom)

  const handleChannelUpdate = (channel: keyof typeof settings.channels, enabled: boolean) => {
    updateSettings({
      channels: {
        ...settings.channels,
        [channel]: enabled,
      },
    })
  }

  const handleTypeUpdate = (type: keyof typeof settings.types, enabled: boolean) => {
    updateSettings({
      types: {
        ...settings.types,
        [type]: enabled,
      },
    })
  }

  const handleScheduleUpdate = (
    field: keyof typeof settings.schedule,
    value: string | boolean | typeof settings.schedule.quietHours,
  ) => {
    updateSettings({
      schedule: {
        ...settings.schedule,
        [field]: value,
      },
    })
  }

  const handleFrequencyUpdate = (
    field: keyof typeof settings.frequency,
    value: string | boolean,
  ) => {
    updateSettings({
      frequency: {
        ...settings.frequency,
        [field]: value,
      },
    })
  }

  const handleSoundUpdate = (field: keyof typeof settings.sound, value: number | boolean) => {
    updateSettings({
      sound: {
        ...settings.sound,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Global Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Control how and when you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">Master switch for all notifications</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send push notifications to your devices
              </p>
            </div>
            <Switch
              checked={settings.channels.push}
              onCheckedChange={(checked) => handleChannelUpdate("push", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send notifications to your email</p>
            </div>
            <Switch
              checked={settings.channels.email}
              onCheckedChange={(checked) => handleChannelUpdate("email", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">Show notifications on your desktop</p>
            </div>
            <Switch
              checked={settings.channels.desktop}
              onCheckedChange={(checked) => handleChannelUpdate("desktop", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mobile Notifications</Label>
              <p className="text-sm text-muted-foreground">Send notifications to mobile devices</p>
            </div>
            <Switch
              checked={settings.channels.mobile}
              onCheckedChange={(checked) => handleChannelUpdate("mobile", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which events trigger notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Task Reminders</Label>
            <Switch
              checked={settings.types.reminders}
              onCheckedChange={(checked) => handleTypeUpdate("reminders", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Deadline Notifications</Label>
            <Switch
              checked={settings.types.deadlines}
              onCheckedChange={(checked) => handleTypeUpdate("deadlines", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Team Collaboration</Label>
            <Switch
              checked={settings.types.collaboration}
              onCheckedChange={(checked) => handleTypeUpdate("collaboration", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Achievement Notifications</Label>
            <Switch
              checked={settings.types.achievements}
              onCheckedChange={(checked) => handleTypeUpdate("achievements", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>System Notifications</Label>
            <Switch
              checked={settings.types.system}
              onCheckedChange={(checked) => handleTypeUpdate("system", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Schedule</CardTitle>
          <CardDescription>Configure when notifications should be sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Disable notifications during specified hours
              </p>
            </div>
            <Switch
              checked={settings.schedule.quietHours.enabled}
              onCheckedChange={(checked) =>
                handleScheduleUpdate("quietHours", {
                  ...settings.schedule.quietHours,
                  enabled: checked,
                })
              }
            />
          </div>

          {settings.schedule.quietHours.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={settings.schedule.quietHours.start}
                  onChange={(e) =>
                    handleScheduleUpdate("quietHours", {
                      ...settings.schedule.quietHours,
                      start: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiet-end">Quiet Hours End</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={settings.schedule.quietHours.end}
                  onChange={(e) =>
                    handleScheduleUpdate("quietHours", {
                      ...settings.schedule.quietHours,
                      end: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Weekend Notifications</Label>
            <Switch
              checked={settings.schedule.weekends}
              onCheckedChange={(checked) => handleScheduleUpdate("weekends", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Holiday Notifications</Label>
            <Switch
              checked={settings.schedule.holidays}
              onCheckedChange={(checked) => handleScheduleUpdate("holidays", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequency Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
          <CardDescription>Control how often you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Immediate Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications as soon as events occur
              </p>
            </div>
            <Switch
              checked={settings.frequency.immediate}
              onCheckedChange={(checked) => handleFrequencyUpdate("immediate", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Digest Frequency</Label>
            <Select
              value={settings.frequency.digest}
              onValueChange={(value) => handleFrequencyUpdate("digest", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.frequency.digest !== "never" && (
            <div className="space-y-2">
              <Label htmlFor="digest-time">Digest Time</Label>
              <Input
                id="digest-time"
                type="time"
                value={settings.frequency.digestTime}
                onChange={(e) => handleFrequencyUpdate("digestTime", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sound Settings</CardTitle>
          <CardDescription>Configure notification sound preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Sounds</Label>
              <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
            </div>
            <Switch
              checked={settings.sound.enabled}
              onCheckedChange={(checked) => handleSoundUpdate("enabled", checked)}
            />
          </div>

          {settings.sound.enabled && (
            <div className="space-y-2">
              <Label>Volume</Label>
              <div className="space-y-2">
                <Slider
                  value={[settings.sound.volume]}
                  onValueChange={(value) => handleSoundUpdate("volume", value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Silent</span>
                  <span>{settings.sound.volume}%</span>
                  <span>Loud</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
