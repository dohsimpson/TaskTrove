"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  FolderSyncIcon as Sync,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  MapPin,
  Link,
  Settings,
  RefreshCwIcon as Refresh,
  Plus,
} from "lucide-react"
import { format } from "date-fns"
import type { TaskId } from "@/lib/types"

interface CalendarProvider {
  id: string
  name: string
  type: "google" | "outlook" | "apple" | "caldav"
  connected: boolean
  lastSync?: Date
  syncStatus: "syncing" | "success" | "error" | "idle"
  calendars: Array<{
    id: string
    name: string
    color: string
    enabled: boolean
    readOnly: boolean
  }>
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  location?: string
  attendees: string[]
  description?: string
  calendarId: string
  taskId?: TaskId
  isTaskEvent: boolean
}

interface SyncRule {
  id: string
  name: string
  condition: string
  action: string
  enabled: boolean
  calendarId: string
}

interface CalendarSyncProps {
  providers: CalendarProvider[]
  events: CalendarEvent[]
  syncRules: SyncRule[]
  onConnectProvider: (type: string) => void
  onDisconnectProvider: (providerId: string) => void
  onToggleCalendar: (providerId: string, calendarId: string, enabled: boolean) => void
  onSyncNow: (providerId: string) => void
  onCreateTaskFromEvent: (eventId: string) => void
  onCreateEventFromTask: (taskId: TaskId, calendarId: string) => void
  onToggleSyncRule: (ruleId: string, enabled: boolean) => void
}

export function CalendarSync({
  providers,
  events,
  syncRules,
  onConnectProvider,
  onDisconnectProvider,
  onToggleCalendar,
  onSyncNow,
  onCreateTaskFromEvent,
  onToggleSyncRule,
}: CalendarSyncProps) {
  const [showSyncRules, setShowSyncRules] = useState(false)

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "google":
        return "🔗"
      case "outlook":
        return "📧"
      case "apple":
        return "🍎"
      case "caldav":
        return "📅"
      default:
        return "📅"
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "syncing":
        return <Sync className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getSyncStatusText = (status: string, lastSync?: Date) => {
    switch (status) {
      case "syncing":
        return "Syncing..."
      case "success":
        return lastSync ? `Last synced ${format(lastSync, "MMM d, h:mm a")}` : "Synced"
      case "error":
        return "Sync failed"
      default:
        return "Not synced"
    }
  }

  const connectedProviders = providers.filter((p) => p.connected)
  const enabledCalendars = connectedProviders.reduce(
    (acc, p) => acc + p.calendars.filter((c) => c.enabled).length,
    0,
  )

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sync Status */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{connectedProviders.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Connected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{enabledCalendars}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Active Calendars</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {events.filter((e) => e.isTaskEvent).length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Task Events</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => connectedProviders.forEach((p) => onSyncNow(p.id))}
              disabled={connectedProviders.length === 0}
              size="sm"
            >
              <Refresh className="h-4 w-4 mr-2" />
              Sync All
            </Button>
            <Button onClick={() => setShowSyncRules(!showSyncRules)} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Sync Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      {getSyncStatusIcon(provider.syncStatus)}
                      <span>{getSyncStatusText(provider.syncStatus, provider.lastSync)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.connected && (
                    <Button
                      onClick={() => onSyncNow(provider.id)}
                      size="sm"
                      variant="outline"
                      disabled={provider.syncStatus === "syncing"}
                    >
                      <Refresh className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() =>
                      provider.connected
                        ? onDisconnectProvider(provider.id)
                        : onConnectProvider(provider.type)
                    }
                    size="sm"
                    variant={provider.connected ? "outline" : "default"}
                  >
                    {provider.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>

              {/* Calendars */}
              {provider.connected && provider.calendars.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Calendars ({provider.calendars.length})</h5>
                  <div className="space-y-1">
                    {provider.calendars.map((calendar) => (
                      <div
                        key={calendar.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span className="text-sm">{calendar.name}</span>
                          {calendar.readOnly && (
                            <Badge variant="outline" className="text-xs">
                              Read-only
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={calendar.enabled}
                          onCheckedChange={(enabled) =>
                            onToggleCalendar(provider.id, calendar.id, enabled)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Provider */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <h4 className="font-medium mb-2">Connect Calendar Provider</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sync your tasks with your calendar automatically
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => onConnectProvider("google")} size="sm" variant="outline">
                🔗 Google
              </Button>
              <Button onClick={() => onConnectProvider("outlook")} size="sm" variant="outline">
                📧 Outlook
              </Button>
              <Button onClick={() => onConnectProvider("apple")} size="sm" variant="outline">
                🍎 Apple
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Rules */}
      {showSyncRules && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sync Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{rule.name}</span>
                    <Badge variant={rule.enabled ? "default" : "secondary"}>
                      {rule.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    When {rule.condition} → {rule.action}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) => onToggleSyncRule(rule.id, enabled)}
                />
              </div>
            ))}

            {syncRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sync rules configured</p>
                <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {events.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{event.title}</span>
                    {event.isTaskEvent && (
                      <Badge variant="outline" className="text-xs">
                        <Link className="h-3 w-3 mr-1" />
                        Task
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(event.start, "MMM d, h:mm a")} - {format(event.end, "h:mm a")}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                    {event.attendees.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendees.length}
                      </span>
                    )}
                  </div>
                </div>
                {!event.isTaskEvent && (
                  <Button
                    onClick={() => onCreateTaskFromEvent(event.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Task
                  </Button>
                )}
              </div>
            ))}

            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No calendar events found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
