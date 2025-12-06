"use client"

import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SettingsCard } from "@/components/ui/custom/settings-card"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  Clock,
  Save,
} from "lucide-react"
// Future icons (not used yet): import { Calendar, Link, Trash2, Plus } from "lucide-react"
import { queryClientAtom } from "@tasktrove/atoms/data/base/query"
import { SUPPORTED_IMPORT_SOURCES, DATA_QUERY_KEY } from "@tasktrove/constants"
import { useTranslation } from "@tasktrove/i18n"
import { API_ROUTES } from "@tasktrove/types/constants"
import { navigateToSettingsCategoryAtom } from "@tasktrove/atoms/ui/settings"

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
  const queryClient = useAtomValue(queryClientAtom)
  const navigateToCategory = useSetAtom(navigateToSettingsCategoryAtom)

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { t } = useTranslation("settings")

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
      const response = await fetch(API_ROUTES.IMPORT, {
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
      queryClient.invalidateQueries({ queryKey: DATA_QUERY_KEY })
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
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
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
        title={t("data.taskImport.title", "Task Import")}
        description={t(
          "data.taskImport.description",
          "Import tasks from other task management applications.",
        )}
        icon={Upload}
        experimental
      >
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            {t("data.taskImport.step1.title", "Step 1: Export Your Data")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t(
              "data.taskImport.step1.description",
              "Click your task management service below to open the import assistant. Follow the instructions to export and convert your data to TaskTrove format.",
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUPPORTED_IMPORT_SOURCES.map((source) => (
              <Button
                key={source}
                variant="outline"
                onClick={() => importFromService(source)}
                className="w-full justify-between"
              >
                <div className="flex items-center gap-3">
                  <Archive className="size-4 text-muted-foreground" />
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
          <Label className="text-base font-semibold">
            {t("data.taskImport.step2.title", "Step 2: Upload Converted File")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t(
              "data.taskImport.step2.description",
              "After using the import assistant above, you'll download a JSON file. Upload that file here to import your tasks, projects, and labels into TaskTrove.",
            )}
          </p>
          <div className="p-3 bg-muted rounded-lg border">
            <div className="flex items-start gap-2">
              <div className="size-5 flex-shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] leading-none font-bold mt-0.5">
                !
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  {t("data.taskImport.step2.important.title", "Important:")}
                </div>
                <div className="text-muted-foreground">
                  {t(
                    "data.taskImport.step2.important.description",
                    "Only upload the JSON file you downloaded from the import assistant. Regular exports from other apps won't work.",
                  )}
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
              <Button asChild variant="outline" disabled={uploadStatus === "uploading"}>
                <span className="flex items-center gap-3">
                  {uploadStatus === "uploading" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Upload className="size-5" />
                  )}
                  <div className="font-medium">
                    {uploadStatus === "uploading"
                      ? t("data.taskImport.upload.uploading", "Uploading...")
                      : t("data.taskImport.upload.button", "Upload JSON File")}
                  </div>
                </span>
              </Button>
            </label>

            {/* Status indicator */}
            {uploadStatus === "success" && uploadResult && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-5" />
                <div className="text-sm">
                  <div className="font-medium">
                    {t("data.taskImport.upload.success.title", "Import successful!")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const parts = []

                      if (uploadResult.importedTasks > 0)
                        parts.push(
                          t("data.taskImport.upload.success.tasks", "{{count}} tasks", {
                            count: uploadResult.importedTasks,
                          }),
                        )
                      if (uploadResult.importedProjects > 0)
                        parts.push(
                          t("data.taskImport.upload.success.projects", "{{count}} projects", {
                            count: uploadResult.importedProjects,
                          }),
                        )
                      if (uploadResult.importedLabels > 0)
                        parts.push(
                          t("data.taskImport.upload.success.labels", "{{count}} labels", {
                            count: uploadResult.importedLabels,
                          }),
                        )

                      let message =
                        parts.length > 0
                          ? t("data.taskImport.upload.success.imported", "{{items}} imported", {
                              items: parts.join(", "),
                            })
                          : t("data.taskImport.upload.success.noNewItems", "No new items")

                      // Detailed duplicates breakdown
                      const duplicateParts = []
                      if (
                        uploadResult.duplicateTasksSkipped &&
                        uploadResult.duplicateTasksSkipped > 0
                      ) {
                        duplicateParts.push(
                          t("data.taskImport.upload.success.tasks", "{{count}} tasks", {
                            count: uploadResult.duplicateTasksSkipped,
                          }),
                        )
                      }
                      if (
                        uploadResult.duplicateProjectsSkipped &&
                        uploadResult.duplicateProjectsSkipped > 0
                      ) {
                        duplicateParts.push(
                          t("data.taskImport.upload.success.projects", "{{count}} projects", {
                            count: uploadResult.duplicateProjectsSkipped,
                          }),
                        )
                      }
                      if (
                        uploadResult.duplicateLabelsSkipped &&
                        uploadResult.duplicateLabelsSkipped > 0
                      ) {
                        duplicateParts.push(
                          t("data.taskImport.upload.success.labels", "{{count}} labels", {
                            count: uploadResult.duplicateLabelsSkipped,
                          }),
                        )
                      }

                      if (duplicateParts.length > 0) {
                        const duplicatesMessage = t(
                          "data.taskImport.upload.success.alreadyExisted",
                          "{{items}} already existed",
                          { items: duplicateParts.join(", ") },
                        )
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
                  <div className="font-medium">
                    {t("data.taskImport.upload.error.title", "Import failed")}
                  </div>
                  <div className="text-xs text-muted-foreground">{uploadError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Auto Backup Settings */}
      <SettingsCard
        title={t("data.autoBackup.title", "Auto Backup")}
        description={t(
          "data.autoBackup.description",
          "Automatically backup your data daily to protect against data loss.",
        )}
        icon={Save}
        experimental
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "data.autoBackup.schedulerRedirect.description",
              "Auto backup controls now live in Scheduler settings. Head there to enable the job, change the cron time, or run a manual backup.",
            )}
          </p>
          <Button
            variant="outline"
            onClick={() => navigateToCategory("scheduler")}
            className="w-full md:w-auto"
          >
            <Clock className="size-4 mr-2" />
            {t("data.autoBackup.schedulerRedirect.button", "Open Scheduler Settings")}
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
