"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Unused UI components (for future calendar/webhook features):
// import { Switch } from "@/components/ui/switch"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Upload, ExternalLink, FileText } from "lucide-react"
// Future icons (not used yet): import { Calendar, Link, Trash2, Plus } from "lucide-react"
import { SiTodoist, SiTrello, SiAsana, SiTicktick } from "@icons-pack/react-simple-icons"
import {
  integrationSettingsAtom,
  updateIntegrationSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"
import { toast } from "@/components/ui/use-toast"

export function IntegrationsForm() {
  const settings = useAtomValue(integrationSettingsAtom)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateSettings = useSetAtom(updateIntegrationSettingsAtom) // Will be used for future calendar/webhook features

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

  const importFromService = (service: string) => {
    // Open import site in new tab
    const migrationUrl = `https://import.tasktrove.io?source=${service}`

    window.open(migrationUrl, "_blank")

    toast({
      title: "Import Assistant Opened",
      description: `A new tab opened with instructions for ${service}. Follow the steps to export your data, then return here to upload the converted file.`,
    })
  }

  const getProviderIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case "todoist":
        return <SiTodoist className="w-4 h-4" />
      case "trello":
        return <SiTrello className="w-4 h-4" />
      case "asana":
        return <SiAsana className="w-4 h-4" />
      case "ticktick":
        return <SiTicktick className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

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

      toast({
        title: "✅ Import Completed!",
        description: `Successfully imported ${result.importedTasks || 0} tasks, ${result.importedProjects || 0} projects, and ${result.importedLabels || 0} labels into TaskTrove.`,
      })
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred during import.",
        variant: "destructive",
      })
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
            <Calendar className="w-5 h-5" />
            Calendar Sync
          </CardTitle>
          <CardDescription>Sync your tasks with external calendar applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          ... calendar sync UI ...
        </CardContent>
      </Card> */}

      {/* Task Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Task Import
            <Badge variant="secondary">Experimental</Badge>
          </CardTitle>
          <CardDescription>Import tasks from other task management applications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Step 1: Export Your Data</Label>
            <p className="text-sm text-muted-foreground">
              Click your task management service below to open the import assistant. Follow the
              instructions to export and convert your data to TaskTrove format.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {settings.imports.supportedSources.map((source) => (
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
                  <ExternalLink className="w-4 h-4" />
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
                <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold mt-0.5">
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
              />
              <label htmlFor="import-file">
                <Button asChild variant="outline" className="h-12">
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Choose JSON File</div>
                      <div className="text-xs text-muted-foreground">Upload converted data</div>
                    </div>
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Third-party Services - Not implemented yet */}
      {/* <Card>
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
          ... webhooks and API keys UI ...
        </CardContent>
      </Card> */}
    </div>
  )
}
