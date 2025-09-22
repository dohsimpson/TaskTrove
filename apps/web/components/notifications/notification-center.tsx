"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"

// Type guard to check if a value is a Record<string, unknown>
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

interface NotificationItem {
  id: string
  type: "reminder" | "deadline" | "collaboration" | "system" | "achievement"
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  priority: "low" | "medium" | "high"
  category: string
}

interface NotificationSettings {
  enabled: boolean
  channels: {
    push: boolean
    email: boolean
    desktop: boolean
    mobile: boolean
  }
  schedule: {
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
    weekends: boolean
    holidays: boolean
  }
  types: {
    reminders: boolean
    deadlines: boolean
    collaboration: boolean
    achievements: boolean
    system: boolean
  }
  frequency: {
    immediate: boolean
    digest: "never" | "daily" | "weekly"
    digestTime: string
  }
  sound: {
    enabled: boolean
    volume: number
    customSound?: string
  }
}

interface NotificationCenterProps {
  notifications: NotificationItem[]
  settings: NotificationSettings
  unreadCount: number
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onUpdateSettings: (settings: NotificationSettings) => void
  onTestNotification: () => void
  onRequestPermission: () => Promise<boolean>
  permissionStatus: "granted" | "denied" | "default"
}

export function NotificationCenter({
  notifications,
  settings,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onUpdateSettings,
  onTestNotification,
  onRequestPermission,
  permissionStatus,
}: NotificationCenterProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [soundTest, setSoundTest] = useState(false)

  // Request notification permission on mount
  useEffect(() => {
    if (permissionStatus === "default") {
      onRequestPermission()
    }
  }, [permissionStatus, onRequestPermission])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "deadline":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "collaboration":
        return <Mail className="h-4 w-4 text-green-500" />
      case "achievement":
        return <CheckCircle className="h-4 w-4 text-purple-500" />
      case "system":
        return <Info className="h-4 w-4 text-gray-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300"
      case "medium":
        return "text-orange-700 bg-orange-100 dark:bg-orange-900 dark:text-orange-300"
      case "low":
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.read
    return notification.type === filter
  })

  const handleSettingsUpdate = (key: string, value: boolean | string | number) => {
    const newSettings = { ...settings }
    const keys = key.split(".")
    let current: Record<string, unknown> = newSettings

    for (let i = 0; i < keys.length - 1; i++) {
      const keyAtIndex = keys[i]
      if (!keyAtIndex) return // Invalid key, exit early
      const value = current[keyAtIndex]
      if (isRecord(value)) {
        current = value
      } else {
        return // Invalid path, exit early
      }
    }
    const lastKey = keys[keys.length - 1]
    if (!lastKey) return // Invalid key, exit early
    current[lastKey] = value

    onUpdateSettings(newSettings)
  }

  const testSound = () => {
    setSoundTest(true)
    // Play notification sound
    const audio = new Audio("/notification-sound.mp3")
    audio.volume = settings.sound.volume / 100
    audio.play().catch(() => {
      toast.error("Unable to play notification sound")
    })
    setTimeout(() => setSoundTest(false), 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={onTestNotification} variant="outline" size="sm">
                Test
              </Button>
              <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          {permissionStatus !== "granted" && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellOff className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Notifications {permissionStatus === "denied" ? "blocked" : "not enabled"}
                  </span>
                </div>
                {permissionStatus === "default" && (
                  <Button onClick={onRequestPermission} size="sm" variant="outline">
                    Enable
                  </Button>
                )}
              </div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                {permissionStatus === "denied"
                  ? "Please enable notifications in your browser settings"
                  : "Enable notifications to receive reminders and updates"}
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="reminder">Reminders</SelectItem>
                  <SelectItem value="deadline">Deadlines</SelectItem>
                  <SelectItem value="collaboration">Team</SelectItem>
                  <SelectItem value="achievement">Achievements</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={onMarkAllAsRead}
                variant="outline"
                size="sm"
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Notifications</label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Master switch for all notifications
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => handleSettingsUpdate("enabled", enabled)}
              />
            </div>

            <Separator />

            {/* Channels */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Channels</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm">Push Notifications</span>
                  </div>
                  <Switch
                    checked={settings.channels.push}
                    onCheckedChange={(enabled) => handleSettingsUpdate("channels.push", enabled)}
                    disabled={!settings.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Switch
                    checked={settings.channels.email}
                    onCheckedChange={(enabled) => handleSettingsUpdate("channels.email", enabled)}
                    disabled={!settings.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <Switch
                    checked={settings.channels.desktop}
                    onCheckedChange={(enabled) => handleSettingsUpdate("channels.desktop", enabled)}
                    disabled={!settings.enabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <Switch
                    checked={settings.channels.mobile}
                    onCheckedChange={(enabled) => handleSettingsUpdate("channels.mobile", enabled)}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notification Types */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Types</h4>
              <div className="space-y-3">
                {Object.entries(settings.types).map(([type, enabled]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNotificationIcon(type)}
                      <span className="text-sm capitalize">{type}</span>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(value) => handleSettingsUpdate(`types.${type}`, value)}
                      disabled={!settings.enabled}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quiet Hours */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Quiet Hours</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Disable notifications during specific hours
                  </p>
                </div>
                <Switch
                  checked={settings.schedule.quietHours.enabled}
                  onCheckedChange={(enabled) =>
                    handleSettingsUpdate("schedule.quietHours.enabled", enabled)
                  }
                  disabled={!settings.enabled}
                />
              </div>
              {settings.schedule.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Start Time</label>
                    <Input
                      type="time"
                      value={settings.schedule.quietHours.start}
                      onChange={(e) =>
                        handleSettingsUpdate("schedule.quietHours.start", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">End Time</label>
                    <Input
                      type="time"
                      value={settings.schedule.quietHours.end}
                      onChange={(e) =>
                        handleSettingsUpdate("schedule.quietHours.end", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Sound Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Sound</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Play sound for notifications
                  </p>
                </div>
                <Switch
                  checked={settings.sound.enabled}
                  onCheckedChange={(enabled) => handleSettingsUpdate("sound.enabled", enabled)}
                  disabled={!settings.enabled}
                />
              </div>
              {settings.sound.enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Volume</span>
                      <span>{settings.sound.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.sound.volume}
                      onChange={(e) =>
                        handleSettingsUpdate("sound.volume", Number.parseInt(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={testSound}
                    variant="outline"
                    size="sm"
                    disabled={soundTest}
                    className="w-full bg-transparent"
                  >
                    {soundTest ? (
                      <Volume2 className="h-4 w-4 mr-2" />
                    ) : (
                      <VolumeX className="h-4 w-4 mr-2" />
                    )}
                    {soundTest ? "Playing..." : "Test Sound"}
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Digest Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Email Digest</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Frequency</label>
                  <Select
                    value={settings.frequency.digest}
                    onValueChange={(value: "never" | "daily" | "weekly") =>
                      handleSettingsUpdate("frequency.digest", value)
                    }
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
                  <div>
                    <label className="text-xs text-gray-600 dark:text-gray-400">Time</label>
                    <Input
                      type="time"
                      value={settings.frequency.digestTime}
                      onChange={(e) => handleSettingsUpdate("frequency.digestTime", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg transition-colors ${
                  notification.read
                    ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <Badge
                          className={getPriorityColor(notification.priority)}
                          variant="outline"
                        >
                          {notification.priority}
                        </Badge>
                        {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full" />}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{notification.timestamp.toLocaleString()}</span>
                        <span className="capitalize">{notification.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button
                        onClick={() => onMarkAsRead(notification.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      onClick={() => onDeleteNotification(notification.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredNotifications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filter === "unread" ? "All caught up!" : "Notifications will appear here"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
