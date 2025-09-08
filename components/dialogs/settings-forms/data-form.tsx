"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, ExternalLink, CheckCircle2, XCircle, Loader2, Archive } from "lucide-react"
// Future icons (not used yet): import { Calendar, Link, Trash2, Plus } from "lucide-react"
import { SiTodoist, SiTrello, SiAsana, SiTicktick } from "@icons-pack/react-simple-icons"
import { toast } from "sonner"
import { dataSettingsAtom, updateDataSettingsAtom } from "@/lib/atoms/ui/user-settings-atom"
import { queryClientAtom } from "@/lib/atoms/core/base"
import {
  DEFAULT_BACKUP_TIME,
  DEFAULT_MAX_BACKUPS,
  SUPPORTED_IMPORT_SOURCES,
} from "@/lib/constants/defaults"

type UploadStatus = "idle" | "uploading" | "success" | "error"

interface UploadResult {
  importedTasks: number
  importedProjects: number
  importedLabels: number
  duplicatesSkipped?: number
  duplicateTasksSkipped?: number
  duplicateProjectsSkipped?: number
  duplicateLabelsSkipped?: number
}

export function DataForm() {
  const settings = useAtomValue(dataSettingsAtom)
  const queryClient = useAtomValue(queryClientAtom)
  const updateSettings = useSetAtom(updateDataSettingsAtom)

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Calendar functionality not implemented yet
  // const handleCalendarUpdate = (field: keyof typeof settings.calendar, value: string | boolean) => {
  //   updateSettings({
  //     calendar: {
  //       ...settings.calendar,
  //       [field]: value,
  //     },
  //   })
  // }

  // Webhooks functionality not implemented yet
  // const handleWebhooksUpdate = (
  //   field: keyof typeof settings.services.webhooks,
  //   value: boolean | string[],
  // ) => {
  //   updateSettings({
  //     services: {
  //       ...settings.services,
  //       webhooks: {
  //         ...settings.services.webhooks,
  //         [field]: value,
  //       },
  //     },
  //   })
  // }

  // Webhook management not implemented yet
  // const addWebhookEndpoint = () => {
  //   const url = prompt("Enter webhook URL:")
  //   if (url && url.trim()) {
  //     const currentEndpoints = settings.services.webhooks.endpoints
  //     if (!currentEndpoints.find(endpoint => endpoint === url.trim())) {
  //       handleWebhooksUpdate("endpoints", [...currentEndpoints, url.trim()])
  //       toast({
  //         title: "Webhook Added",
  //         description: "The webhook endpoint has been added successfully.",
  //       })
  //     }
  //   }
  // }

  // Webhook management not implemented yet
  // const removeWebhookEndpoint = (url: string) => {
  //   const currentEndpoints = settings.services.webhooks.endpoints
  //   handleWebhooksUpdate(
  //     "endpoints",
  //     currentEndpoints.filter((endpoint) => endpoint !== url),
  //   )
  //   toast({
  //     title: "Webhook Removed",
  //     description: "The webhook endpoint has been removed.",
  //   })
  // }

  // Calendar connection not implemented yet
  // const connectCalendar = (provider: "google" | "outlook" | "apple") => {
  //   // Placeholder for calendar connection logic
  //   toast({
  //     title: "Calendar Connection",
  //     description: `Calendar connection for ${provider} is not yet implemented.`,
  //   })
  // }

  // Using centralized constant for supported import sources

  const importFromService = (service: string) => {
    // Open import site in new tab
    const migrationUrl = `https://import.tasktrove.io?source=${service}`

    window.open(migrationUrl, "_blank")
  }

  const getProviderIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "todoist":
        return <SiTodoist className="size-4" />
      case "trello":
        return <SiTrello className="size-4" />
      case "asana":
        return <SiAsana className="size-4" />
      case "ticktick":
        return <SiTicktick className="size-4" />
      default:
        return <ExternalLink className="size-4" />
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset states
    setUploadStatus("uploading")
    setUploadResult(null)
    setUploadError(null)

    try {
      const content = await file.text()
      const importData = JSON.parse(content)

      // Basic validation of import file structure
      if (!importData.tasks || !importData.projects || !importData.labels) {
        throw new Error("Invalid import file format. Expected tasks, projects, and labels.")
      }

      // Send import data to backend API
      const response = await fetch("/api/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(importData),
      })

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Set success state
      setUploadStatus("success")
      setUploadResult({
        importedTasks: result.importedTasks || 0,
        importedProjects: result.importedProjects || 0,
        importedLabels: result.importedLabels || 0,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        duplicateTasksSkipped: result.duplicateTasksSkipped || 0,
        duplicateProjectsSkipped: result.duplicateProjectsSkipped || 0,
        duplicateLabelsSkipped: result.duplicateLabelsSkipped || 0,
      })

      // Invalidate queries to refresh the UI with imported data
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    } catch (error) {
      console.error("Import error:", error)
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred during import."

      // Set error state
      setUploadStatus("error")
      setUploadError(errorMessage)
    }

    // Reset file input
    event.target.value = ""
  }

  return (
    <div className="space-y-6">
      {/* Calendar Integration - Not implemented yet */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Calendar Sync
          </CardTitle>
          <CardDescription>Sync your tasks with external calendar applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          ... calendar sync UI ...
        </CardContent>
      </Card> */}

      {/* Task Import */}
      <SettingsCard
        title="Task Import"
        description="Import tasks from other task management applications."
        icon={Upload}
        experimental
      >
        <div className="space-y-3">
          <Label className="text-base font-semibold">Step 1: Export Your Data</Label>
          <p className="text-sm text-muted-foreground">
            Click your task management service below to open the import assistant. Follow the
            instructions to export and convert your data to TaskTrove format.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUPPORTED_IMPORT_SOURCES.map((source) => (
              <Button
                key={source}
                variant="outline"
                onClick={() => importFromService(source)}
                className="w-full justify-between h-12"
              >
                <div className="flex items-center gap-3">
                  {getProviderIcon(source)}
                  <div className="text-left">
                    <div className="font-medium capitalize">{source}</div>
                  </div>
                </div>
                <ExternalLink className="size-4" />
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-base font-semibold">Step 2: Upload Converted File</Label>
          <p className="text-sm text-muted-foreground">
            After using the import assistant above, you'll download a JSON file. Upload that file
            here to import your tasks, projects, and labels into TaskTrove.
          </p>
          <div className="p-3 bg-muted rounded-lg border">
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold mt-0.5">
                !
              </div>
              <div className="text-sm">
                <div className="font-medium">Important:</div>
                <div className="text-muted-foreground">
                  Only upload the JSON file you downloaded from the import assistant. Regular
                  exports from other apps won't work.
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              id="import-file"
              disabled={uploadStatus === "uploading"}
            />
            <label htmlFor="import-file">
              <Button
                asChild
                variant="outline"
                className="h-12"
                disabled={uploadStatus === "uploading"}
              >
                <span className="flex items-center gap-3">
                  {uploadStatus === "uploading" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Upload className="size-5" />
                  )}
                  <div className="font-medium">
                    {uploadStatus === "uploading" ? "Uploading..." : "Upload JSON File"}
                  </div>
                </span>
              </Button>
            </label>

            {/* Status indicator */}
            {uploadStatus === "success" && uploadResult && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-5" />
                <div className="text-sm">
                  <div className="font-medium">Import successful!</div>
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const parts = []

                      if (uploadResult.importedTasks > 0)
                        parts.push(`${uploadResult.importedTasks} tasks`)
                      if (uploadResult.importedProjects > 0)
                        parts.push(`${uploadResult.importedProjects} projects`)
                      if (uploadResult.importedLabels > 0)
                        parts.push(`${uploadResult.importedLabels} labels`)

                      let message =
                        parts.length > 0 ? parts.join(", ") + " imported" : "No new items"

                      // Detailed duplicates breakdown
                      const duplicateParts = []
                      if (
                        uploadResult.duplicateTasksSkipped &&
                        uploadResult.duplicateTasksSkipped > 0
                      ) {
                        duplicateParts.push(`${uploadResult.duplicateTasksSkipped} tasks`)
                      }
                      if (
                        uploadResult.duplicateProjectsSkipped &&
                        uploadResult.duplicateProjectsSkipped > 0
                      ) {
                        duplicateParts.push(`${uploadResult.duplicateProjectsSkipped} projects`)
                      }
                      if (
                        uploadResult.duplicateLabelsSkipped &&
                        uploadResult.duplicateLabelsSkipped > 0
                      ) {
                        duplicateParts.push(`${uploadResult.duplicateLabelsSkipped} labels`)
                      }

                      if (duplicateParts.length > 0) {
                        const duplicatesMessage = `${duplicateParts.join(", ")} already existed`
                        message += ` • ${duplicatesMessage}`
                      }

                      return message
                    })()}
                  </div>
                </div>
              </div>
            )}

            {uploadStatus === "error" && uploadError && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="size-5" />
                <div className="text-sm">
                  <div className="font-medium">Import failed</div>
                  <div className="text-xs text-muted-foreground">{uploadError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Auto Backup Settings */}
      <SettingsCard
        title="Auto Backup"
        description="Automatically backup your data daily to protect against data loss."
        icon={Archive}
        experimental
      >
        {/* Docker Volume Mounting Notice - Only show when auto backup is enabled */}
        {settings.autoBackup.enabled && (
          <div className="p-3 bg-muted rounded-lg border">
            <div className="flex items-start gap-2">
              <div className="size-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold mt-0.5">
                !
              </div>
              <div className="text-sm">
                <div className="font-medium">Docker Users:</div>
                <div className="text-muted-foreground">
                  You must mount the backups directory as a volume to access backup files:{" "}
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">
                    -v ./backups:/app/backups
                  </code>
                </div>
                <div className="mt-1">
                  <a
                    href="https://docs.tasktrove.io/backup#built-in-auto-backup-recommended"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    See backup setup guide <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-backup">Enable Auto Backup</Label>
            <p className="text-sm text-muted-foreground">
              Creates a zip backup of your data daily at the configured time
            </p>
          </div>
          <Switch
            id="auto-backup"
            checked={settings.autoBackup.enabled}
            onCheckedChange={(checked) =>
              updateSettings({
                autoBackup: {
                  ...settings.autoBackup,
                  enabled: checked,
                },
              })
            }
          />
        </div>

        {settings.autoBackup.enabled && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="backup-time">Backup Time</Label>
              <p className="text-sm text-muted-foreground">
                Time to run daily backup (24-hour format)
              </p>
            </div>
            <Input
              id="backup-time"
              type="time"
              value={settings.autoBackup.backupTime || DEFAULT_BACKUP_TIME}
              onChange={(e) =>
                updateSettings({
                  autoBackup: {
                    ...settings.autoBackup,
                    backupTime: e.target.value,
                  },
                })
              }
              className="w-32"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="max-backups">Maximum Backups to Keep</Label>
            <p className="text-sm text-muted-foreground">
              Older backups will be automatically deleted
            </p>
          </div>
          <Select
            value={
              settings.autoBackup.maxBackups !== undefined
                ? String(settings.autoBackup.maxBackups)
                : String(DEFAULT_MAX_BACKUPS)
            }
            onValueChange={(value) =>
              updateSettings({
                autoBackup: {
                  ...settings.autoBackup,
                  maxBackups: Number(value),
                },
              })
            }
          >
            <SelectTrigger id="max-backups" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">No limit</SelectItem>
              {[3, 5, 7, 10, 14, 21, 30, 90, 365].map((num) => (
                <SelectItem key={num} value={String(num)}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch("/api/backup", {
                  method: "POST",
                })
                if (response.ok) {
                  toast.success("Manual backup triggered successfully")
                } else {
                  toast.error("Failed to trigger manual backup")
                }
              } catch {
                toast.error("Failed to trigger manual backup. Please try again.")
              }
            }}
            className="w-full"
          >
            <Archive className="size-4 mr-2" />
            Trigger Manual Backup Now
          </Button>
        </div>
      </SettingsCard>

      {/* Third-party Services - Not implemented yet */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="size-5" />
            Third-party Services
          </CardTitle>
          <CardDescription>
            Connect with external services and configure API integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          ... webhooks and API keys UI ...
        </CardContent>
      </Card> */}
    </div>
  )
}
