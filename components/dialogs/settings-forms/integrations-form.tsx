"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Link, Upload, Trash2, Plus, ExternalLink } from "lucide-react"
import {
  integrationSettingsAtom,
  updateIntegrationSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"
import { toast } from "@/components/ui/use-toast"

export function IntegrationsForm() {
  const settings = useAtomValue(integrationSettingsAtom)
  const updateSettings = useSetAtom(updateIntegrationSettingsAtom)

  const handleCalendarUpdate = (field: keyof typeof settings.calendar, value: string | boolean) => {
    updateSettings({
      calendar: {
        ...settings.calendar,
        [field]: value,
      },
    })
  }

  const handleImportsUpdate = (
    field: keyof typeof settings.imports,
    value: string[] | boolean | Date,
  ) => {
    updateSettings({
      imports: {
        ...settings.imports,
        [field]: value,
      },
    })
  }

  const handleWebhooksUpdate = (
    field: keyof typeof settings.services.webhooks,
    value: boolean | string[],
  ) => {
    updateSettings({
      services: {
        ...settings.services,
        webhooks: {
          ...settings.services.webhooks,
          [field]: value,
        },
      },
    })
  }

  const addWebhookEndpoint = () => {
    const url = prompt("Enter webhook URL:")
    if (url && url.trim()) {
      const currentEndpoints = settings.services.webhooks.endpoints
      if (!currentEndpoints.includes(url.trim())) {
        handleWebhooksUpdate("endpoints", [...currentEndpoints, url.trim()])
        toast({
          title: "Webhook Added",
          description: "The webhook endpoint has been added successfully.",
        })
      }
    }
  }

  const removeWebhookEndpoint = (url: string) => {
    const currentEndpoints = settings.services.webhooks.endpoints
    handleWebhooksUpdate(
      "endpoints",
      currentEndpoints.filter((endpoint) => endpoint !== url),
    )
    toast({
      title: "Webhook Removed",
      description: "The webhook endpoint has been removed.",
    })
  }

  const connectCalendar = (provider: "google" | "outlook" | "apple") => {
    // Placeholder for calendar connection logic
    toast({
      title: "Calendar Connection",
      description: `Calendar connection for ${provider} is not yet implemented.`,
    })
  }

  const importFromService = (service: string) => {
    // Placeholder for import logic
    toast({
      title: "Import Tasks",
      description: `Task import from ${service} is not yet implemented.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Sync
          </CardTitle>
          <CardDescription>Sync your tasks with external calendar applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Calendar Sync</Label>
              <p className="text-sm text-muted-foreground">
                Synchronize tasks with your calendar app
              </p>
            </div>
            <Switch
              checked={settings.calendar.enabled}
              onCheckedChange={(checked) => handleCalendarUpdate("enabled", checked)}
            />
          </div>

          {settings.calendar.enabled && (
            <>
              <div className="space-y-2">
                <Label>Calendar Provider</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button
                    variant={settings.calendar.provider === "google" ? "default" : "outline"}
                    onClick={() => connectCalendar("google")}
                    className="w-full"
                  >
                    Google Calendar
                  </Button>
                  <Button
                    variant={settings.calendar.provider === "outlook" ? "default" : "outline"}
                    onClick={() => connectCalendar("outlook")}
                    className="w-full"
                  >
                    Outlook
                  </Button>
                  <Button
                    variant={settings.calendar.provider === "apple" ? "default" : "outline"}
                    onClick={() => connectCalendar("apple")}
                    className="w-full"
                  >
                    Apple Calendar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sync Direction</Label>
                <Select
                  value={settings.calendar.syncDirection}
                  onValueChange={(value) => handleCalendarUpdate("syncDirection", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oneWay">One-way (TaskTrove → Calendar)</SelectItem>
                    <SelectItem value="twoWay">Two-way (Bidirectional sync)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sync Completed Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Include completed tasks in calendar sync
                  </p>
                </div>
                <Switch
                  checked={settings.calendar.syncCompletedTasks}
                  onCheckedChange={(checked) => handleCalendarUpdate("syncCompletedTasks", checked)}
                />
              </div>

              {settings.calendar.provider && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {settings.calendar.provider === "google" && "Google Calendar"}
                        {settings.calendar.provider === "outlook" && "Microsoft Outlook"}
                        {settings.calendar.provider === "apple" && "Apple Calendar"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {settings.calendar.defaultCalendarId || "No calendar selected"}
                      </p>
                    </div>
                    <Badge variant="secondary">Connected</Badge>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Task Import
          </CardTitle>
          <CardDescription>Import tasks from other task management applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-detect Duplicates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and skip duplicate tasks during import
              </p>
            </div>
            <Switch
              checked={settings.imports.autoDetectDuplicates}
              onCheckedChange={(checked) => handleImportsUpdate("autoDetectDuplicates", checked)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Supported Import Sources</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settings.imports.supportedSources.map((source) => (
                <Button
                  key={source}
                  variant="outline"
                  onClick={() => importFromService(source)}
                  className="w-full justify-between"
                >
                  <span className="capitalize">{source}</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </div>

          {settings.imports.lastImportDate && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Last import:</span>{" "}
                {settings.imports.lastImportDate.toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Third-party Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Third-party Services
          </CardTitle>
          <CardDescription>
            Connect with external services and configure API integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhooks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Webhooks</Label>
                <p className="text-sm text-muted-foreground">Send task events to external URLs</p>
              </div>
              <Switch
                checked={settings.services.webhooks.enabled}
                onCheckedChange={(checked) => handleWebhooksUpdate("enabled", checked)}
              />
            </div>

            {settings.services.webhooks.enabled && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Webhook Endpoints</Label>
                  <Button size="sm" onClick={addWebhookEndpoint}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {settings.services.webhooks.endpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No webhook endpoints configured
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settings.services.webhooks.endpoints.map((endpoint, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm font-mono truncate flex-1 mr-2">{endpoint}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWebhookEndpoint(endpoint)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* API Keys */}
          <div className="space-y-3">
            <Label>API Keys</Label>
            <p className="text-sm text-muted-foreground">
              Store API keys for external service integrations (coming soon).
            </p>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                API key management will be available in a future update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>Overview of your connected services and integrations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Calendar Sync</span>
              <Badge variant={settings.calendar.enabled ? "default" : "secondary"}>
                {settings.calendar.enabled ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Webhooks</span>
              <Badge variant={settings.services.webhooks.enabled ? "default" : "secondary"}>
                {settings.services.webhooks.enabled
                  ? `${settings.services.webhooks.endpoints.length} endpoint(s)`
                  : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Import Sources</span>
              <Badge variant="secondary">
                {settings.imports.supportedSources.length} available
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
