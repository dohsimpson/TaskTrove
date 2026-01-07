"use client"

import { useState } from "react"
import { useAtomValue } from "jotai"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Download,
  Upload,
  FileText,
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileJson,
  FileSpreadsheet,
  File,
} from "lucide-react"
import { toast } from "@/lib/toast"
import { formatDateDisplay, formatDateTimeDisplay } from "@/lib/utils/task-date-formatter"
import { settingsAtom } from "@tasktrove/atoms/data/base/atoms"

interface ExportOptions {
  format: "json" | "csv" | "pdf" | "xlsx"
  dateRange: {
    start: Date
    end: Date
  }
  includeData: {
    tasks: boolean
    projects: boolean
    labels: boolean
    comments: boolean
    attachments: boolean
    analytics: boolean
    settings: boolean
  }
  filters: {
    completedTasks: boolean
    archivedProjects: boolean
    systemData: boolean
  }
}

interface ImportOptions {
  format: "json" | "csv" | "todoist" | "asana" | "trello"
  mergeStrategy: "replace" | "merge" | "skip"
  mapping: Record<string, string>
}

interface ExportJob {
  id: string
  type: "export" | "import"
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  format: string
  size?: number
  downloadUrl?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

interface DataExportProps {
  exportJobs: ExportJob[]
  onStartExport: (options: ExportOptions) => Promise<string>
  onStartImport: (file: File, options: ImportOptions) => Promise<string>
  onDownload: (jobId: string) => void
  onDeleteJob: (jobId: string) => void
  totalDataSize: number
  lastBackup?: Date
}

export function DataExport({
  exportJobs,
  onStartExport,
  onStartImport,
  onDownload,
  onDeleteJob,
  totalDataSize,
  lastBackup,
}: DataExportProps) {
  const appSettings = useAtomValue(settingsAtom)
  const preferDayMonthFormat = Boolean(appSettings.general.preferDayMonthFormat)
  const use24HourTime = Boolean(appSettings.uiSettings.use24HourTime)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "json",
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    },
    includeData: {
      tasks: true,
      projects: true,
      labels: true,
      comments: true,
      attachments: false,
      analytics: true,
      settings: false,
    },
    filters: {
      completedTasks: true,
      archivedProjects: false,
      systemData: false,
    },
  })

  const [importOptions, setImportOptions] = useState<ImportOptions>({
    format: "json",
    mergeStrategy: "merge",
    mapping: {},
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")

  const handleExport = async () => {
    try {
      await onStartExport(exportOptions)
      toast.success("Your data export has been queued for processing.")
    } catch {
      toast.error("Unable to start data export. Please try again.")
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to import.")
      return
    }

    try {
      await onStartImport(selectedFile, importOptions)
      setSelectedFile(null)
      toast.success("Your data import has been queued for processing.")
    } catch {
      toast.error("Unable to start data import. Please try again.")
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "json":
        return <FileJson className="h-4 w-4" />
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4" />
      case "pdf":
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getEstimatedSize = () => {
    const baseSize = totalDataSize
    let multiplier = 1

    // Adjust based on format
    switch (exportOptions.format) {
      case "json":
        multiplier = 1.2
        break
      case "csv":
        multiplier = 0.8
        break
      case "pdf":
        multiplier = 2.5
        break
      case "xlsx":
        multiplier = 1.5
        break
    }

    // Adjust based on included data
    const includedCount = Object.values(exportOptions.includeData).filter(Boolean).length
    const totalCount = Object.keys(exportOptions.includeData).length
    const dataMultiplier = includedCount / totalCount

    return Math.round(baseSize * multiplier * dataMultiplier)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatBytes(totalDataSize)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Data</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {exportJobs.filter((j) => j.status === "completed").length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Exports</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {lastBackup
                  ? formatDateDisplay(lastBackup, {
                      includeYear: true,
                      preferDayMonthFormat,
                    })
                  : "Never"}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Last Backup</div>
            </div>
          </div>

          {/* Backup Reminder */}
          {!lastBackup ||
            (Date.now() - lastBackup.getTime() > 7 * 24 * 60 * 60 * 1000 && (
              <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  It's been a while since your last backup. Consider exporting your data regularly
                  to keep it safe.
                </AlertDescription>
              </Alert>
            ))}

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === "export" ? "default" : "outline"}
              onClick={() => setActiveTab("export")}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button
              variant={activeTab === "import" ? "default" : "outline"}
              onClick={() => setActiveTab("import")}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Tab */}
      {activeTab === "export" && (
        <Card>
          <CardHeader>
            <CardTitle>Export Your Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: "json" | "csv" | "xlsx" | "pdf") =>
                  setExportOptions({ ...exportOptions, format: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON - Complete data with structure</SelectItem>
                  <SelectItem value="csv">CSV - Spreadsheet compatible</SelectItem>
                  <SelectItem value="xlsx">Excel - Advanced spreadsheet</SelectItem>
                  <SelectItem value="pdf">PDF - Human readable report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Include Data</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(exportOptions.includeData).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          includeData: { ...exportOptions.includeData, [key]: !!checked },
                        })
                      }
                    />
                    <label htmlFor={key} className="text-sm capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Filters</label>
              <div className="space-y-2">
                {Object.entries(exportOptions.filters).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-${key}`}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setExportOptions({
                          ...exportOptions,
                          filters: { ...exportOptions.filters, [key]: !!checked },
                        })
                      }
                    />
                    <label htmlFor={`filter-${key}`} className="text-sm">
                      Include {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange.start.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setExportOptions({
                      ...exportOptions,
                      dateRange: { ...exportOptions.dateRange, start: new Date(e.target.value) },
                    })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange.end.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setExportOptions({
                      ...exportOptions,
                      dateRange: { ...exportOptions.dateRange, end: new Date(e.target.value) },
                    })
                  }
                  className="w-full mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-background"
                />
              </div>
            </div>

            {/* Estimated Size */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Estimated export size
                </span>
                <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                  {formatBytes(getEstimatedSize())}
                </span>
              </div>
            </div>

            {/* Export Button */}
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Start Export
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Tab */}
      {activeTab === "import" && (
        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select File</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".json,.csv,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : "Click to select a file or drag and drop"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Supports JSON, CSV, and Excel files</p>
                </label>
              </div>
            </div>

            {/* Import Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Format</label>
              <Select
                value={importOptions.format}
                onValueChange={(value: "json" | "csv" | "todoist" | "asana" | "trello") =>
                  setImportOptions({ ...importOptions, format: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON - Todoist export</SelectItem>
                  <SelectItem value="csv">CSV - Custom format</SelectItem>
                  <SelectItem value="tasktrove">TaskTrove - Official export</SelectItem>
                  <SelectItem value="asana">Asana - Project export</SelectItem>
                  <SelectItem value="trello">Trello - Board export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Merge Strategy */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Merge Strategy</label>
              <Select
                value={importOptions.mergeStrategy}
                onValueChange={(value: "merge" | "replace" | "skip") =>
                  setImportOptions({ ...importOptions, mergeStrategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge - Combine with existing data</SelectItem>
                  <SelectItem value="replace">Replace - Overwrite existing data</SelectItem>
                  <SelectItem value="skip">Skip - Keep existing, add new only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning for Replace */}
            {importOptions.mergeStrategy === "replace" && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <strong>Warning:</strong> This will permanently replace all your existing data.
                  Consider creating a backup first.
                </AlertDescription>
              </Alert>
            )}

            {/* Import Button */}
            <Button onClick={handleImport} className="w-full" disabled={!selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              Start Import
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFormatIcon(job.format)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm capitalize">
                        {job.type} ({job.format.toUpperCase()})
                      </span>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>
                        {formatDateTimeDisplay(job.createdAt, {
                          includeYear: true,
                          preferDayMonthFormat,
                          use24HourTime,
                        })}
                      </span>
                      {job.size && <span>{formatBytes(job.size)}</span>}
                      {job.error && <span className="text-red-600">{job.error}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  {job.status === "processing" && (
                    <div className="w-20">
                      <Progress value={job.progress} className="h-1" />
                    </div>
                  )}
                  {job.status === "completed" && job.downloadUrl && (
                    <Button onClick={() => onDownload(job.id)} size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => onDeleteJob(job.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {exportJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No export or import jobs yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Your data management history will appear here
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
