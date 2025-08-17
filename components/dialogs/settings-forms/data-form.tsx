"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { Download, Upload, RefreshCw } from "lucide-react"
import {
  dataSettingsAtom,
  updateDataSettingsAtom,
  exportSettingsAtom,
  importSettingsAtom,
  resetAllSettingsAtom,
} from "@/lib/atoms/ui/user-settings-atom"
import { toast } from "@/components/ui/use-toast"

export function DataForm() {
  const settings = useAtomValue(dataSettingsAtom)
  const updateSettings = useSetAtom(updateDataSettingsAtom)
  const exportSettings = useAtomValue(exportSettingsAtom)
  const importSettings = useSetAtom(importSettingsAtom)
  const resetAllSettings = useSetAtom(resetAllSettingsAtom)

  const handleAutoBackupUpdate = (
    field: keyof typeof settings.autoBackup,
    value: string | number | boolean,
  ) => {
    updateSettings({
      autoBackup: {
        ...settings.autoBackup,
        [field]: value,
      },
    })
  }

  const handleExportPrefsUpdate = (
    field: keyof typeof settings.exportPreferences,
    value: string | boolean,
  ) => {
    updateSettings({
      exportPreferences: {
        ...settings.exportPreferences,
        [field]: value,
      },
    })
  }

  const handleStorageUpdate = (field: keyof typeof settings.storage, value: number | boolean) => {
    updateSettings({
      storage: {
        ...settings.storage,
        [field]: value,
      },
    })
  }

  const handleSyncUpdate = (field: keyof typeof settings.sync, value: number | boolean) => {
    updateSettings({
      sync: {
        ...settings.sync,
        [field]: value,
      },
    })
  }

  const handleExportSettings = () => {
    const settingsData = JSON.stringify(exportSettings, null, 2)
    const blob = new Blob([settingsData], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tasktrove-settings-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Settings Exported",
      description: "Your settings have been downloaded as a JSON file.",
    })
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (typeof result === "string") {
          const importedSettings = JSON.parse(result)
          importSettings(importedSettings)
          toast({
            title: "Settings Imported",
            description: "Your settings have been successfully imported.",
          })
        }
      } catch {
        toast({
          title: "Import Failed",
          description: "Failed to parse the settings file. Please check the file format.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const handleResetSettings = () => {
    if (
      confirm(
        "Are you sure you want to reset all settings to their defaults? This action cannot be undone.",
      )
    ) {
      resetAllSettings()
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to their default values.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Auto Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto Backup</CardTitle>
          <CardDescription>Automatically backup your data to prevent data loss.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto Backup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create backups of your data
              </p>
            </div>
            <Switch
              checked={settings.autoBackup.enabled}
              onCheckedChange={(checked) => handleAutoBackupUpdate("enabled", checked)}
            />
          </div>

          {settings.autoBackup.enabled && (
            <>
              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <Select
                  value={settings.autoBackup.frequency}
                  onValueChange={(value) => handleAutoBackupUpdate("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-backups">Maximum Backups</Label>
                <Input
                  id="max-backups"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.autoBackup.maxBackups}
                  onChange={(e) =>
                    handleAutoBackupUpdate("maxBackups", parseInt(e.target.value) || 5)
                  }
                  className="w-32"
                />
                <p className="text-sm text-muted-foreground">Number of backup files to keep</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Completed Tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    Include completed tasks in backups
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackup.includeCompleted}
                  onCheckedChange={(checked) => handleAutoBackupUpdate("includeCompleted", checked)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Export/Import Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Import</CardTitle>
          <CardDescription>
            Export your data or import from other task management tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Export Format</Label>
            <Select
              value={settings.exportPreferences.format}
              onValueChange={(value) => handleExportPrefsUpdate("format", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Export Options</Label>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Include Metadata</Label>
              <Switch
                checked={settings.exportPreferences.includeMetadata}
                onCheckedChange={(checked) => handleExportPrefsUpdate("includeMetadata", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Include Comments</Label>
              <Switch
                checked={settings.exportPreferences.includeComments}
                onCheckedChange={(checked) => handleExportPrefsUpdate("includeComments", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Include Subtasks</Label>
              <Switch
                checked={settings.exportPreferences.includeSubtasks}
                onCheckedChange={(checked) => handleExportPrefsUpdate("includeSubtasks", checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
            <Button onClick={handleExportSettings} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Settings
            </Button>

            <div className="relative">
              <Button variant="outline" className="w-full" asChild>
                <label htmlFor="import-file" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Settings
                </label>
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Management */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Management</CardTitle>
          <CardDescription>Configure local storage limits and cleanup settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cache-size">Maximum Cache Size (MB)</Label>
            <Input
              id="cache-size"
              type="number"
              min="10"
              max="500"
              value={settings.storage.maxCacheSizeMB}
              onChange={(e) =>
                handleStorageUpdate("maxCacheSizeMB", parseInt(e.target.value) || 50)
              }
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention-days">Data Retention (days)</Label>
            <Input
              id="retention-days"
              type="number"
              min="7"
              max="365"
              value={settings.storage.retentionDays}
              onChange={(e) => handleStorageUpdate("retentionDays", parseInt(e.target.value) || 30)}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              How long to keep completed tasks in local storage
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clear Cache on Startup</Label>
              <p className="text-sm text-muted-foreground">
                Clear temporary cache when the app starts
              </p>
            </div>
            <Switch
              checked={settings.storage.clearCacheOnStartup}
              onCheckedChange={(checked) => handleStorageUpdate("clearCacheOnStartup", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization</CardTitle>
          <CardDescription>Configure how your data syncs across devices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync data in the background
              </p>
            </div>
            <Switch
              checked={settings.sync.autoSync}
              onCheckedChange={(checked) => handleSyncUpdate("autoSync", checked)}
            />
          </div>

          {settings.sync.autoSync && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
                <Input
                  id="sync-interval"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.sync.syncInterval / 60000}
                  onChange={(e) =>
                    handleSyncUpdate("syncInterval", (parseInt(e.target.value) || 5) * 60000)
                  }
                  className="w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Sync on Window Focus</Label>
                <Switch
                  checked={settings.sync.syncOnFocus}
                  onCheckedChange={(checked) => handleSyncUpdate("syncOnFocus", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Sync on Reconnection</Label>
                <Switch
                  checked={settings.sync.syncOnReconnect}
                  onCheckedChange={(checked) => handleSyncUpdate("syncOnReconnect", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-retries">Maximum Retry Attempts</Label>
                <Input
                  id="max-retries"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.sync.maxRetries}
                  onChange={(e) => handleSyncUpdate("maxRetries", parseInt(e.target.value) || 3)}
                  className="w-32"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect all your data and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-destructive">Reset All Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Reset all settings to their default values
                </p>
              </div>
              <Button variant="destructive" onClick={handleResetSettings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
