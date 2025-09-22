"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Wifi,
  WifiOff,
  Cloud,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Database,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"

interface SyncConflict {
  id: string
  type: "task" | "project" | "label"
  localVersion: unknown
  serverVersion: unknown
  field: string
  timestamp: Date
}

interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  pendingChanges: number
  conflicts: SyncConflict[]
  syncInProgress: boolean
  syncProgress: number
  offlineCapable: boolean
  storageUsed: number
  storageLimit: number
}

interface OfflineChange {
  id: string
  type: "create" | "update" | "delete"
  entity: "task" | "project" | "label" | "comment"
  entityId: string
  data: Record<string, unknown>
  timestamp: Date
  synced: boolean
}

interface SyncManagerProps {
  syncStatus: SyncStatus
  offlineChanges: OfflineChange[]
  onSync: () => Promise<void>
  onResolveConflict: (conflictId: string, resolution: "local" | "server" | "merge") => void
  onClearOfflineData: () => void
  onToggleOfflineMode: (enabled: boolean) => void
  onExportData: () => void
  onImportData: (data: Record<string, unknown>) => void
}

export function SyncManager({
  syncStatus,
  offlineChanges,
  onSync,
  onResolveConflict,
  onClearOfflineData,
  onToggleOfflineMode,
  onExportData,
}: SyncManagerProps) {
  const [showConflicts, setShowConflicts] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [syncInterval, setSyncInterval] = useState(30) // seconds

  // Auto-sync when online
  useEffect(() => {
    if (!autoSync || !syncStatus.isOnline || syncStatus.syncInProgress) return

    const interval = setInterval(() => {
      if (syncStatus.pendingChanges > 0) {
        onSync()
      }
    }, syncInterval * 1000)

    return () => clearInterval(interval)
  }, [
    autoSync,
    syncStatus.isOnline,
    syncStatus.syncInProgress,
    syncStatus.pendingChanges,
    syncInterval,
    onSync,
  ])

  const handleManualSync = async () => {
    try {
      await onSync()
      toast.success("All changes have been synchronized")
    } catch {
      toast.error("Unable to sync changes. Please try again.")
    }
  }

  const getStoragePercentage = () => {
    return (syncStatus.storageUsed / syncStatus.storageLimit) * 100
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getConflictDescription = (conflict: SyncConflict) => {
    switch (conflict.field) {
      case "title":
        return `Task title changed: "${conflict.localVersion}" vs "${conflict.serverVersion}"`
      case "completed":
        return `Task completion status: ${conflict.localVersion ? "completed" : "pending"} vs ${conflict.serverVersion ? "completed" : "pending"}`
      case "dueDate":
        return `Due date changed: ${conflict.localVersion || "none"} vs ${conflict.serverVersion || "none"}`
      default:
        return `${conflict.field} has conflicting changes`
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div
                className={`text-2xl font-bold ${syncStatus.isOnline ? "text-green-600" : "text-red-600"}`}
              >
                {syncStatus.isOnline ? "Online" : "Offline"}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Connection</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{syncStatus.pendingChanges}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{syncStatus.conflicts.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Conflicts</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString() : "Never"}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Last Sync</div>
            </div>
          </div>

          {/* Sync Progress */}
          {syncStatus.syncInProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Synchronizing...
                </span>
                <span>{Math.round(syncStatus.syncProgress)}%</span>
              </div>
              <Progress value={syncStatus.syncProgress} className="h-2" />
            </div>
          )}

          {/* Offline Status Alert */}
          {!syncStatus.isOnline && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You're currently offline. Changes will be saved locally and synced when connection
                is restored.
                {syncStatus.offlineCapable
                  ? " Offline mode is active."
                  : " Some features may be limited."}
              </AlertDescription>
            </Alert>
          )}

          {/* Conflicts Alert */}
          {syncStatus.conflicts.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                {syncStatus.conflicts.length} sync conflicts need your attention.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-600"
                  onClick={() => setShowConflicts(true)}
                >
                  Resolve now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleManualSync}
              disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
              className="flex-1"
            >
              {syncStatus.syncInProgress ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button onClick={onExportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Local Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Storage Used</span>
              <span>
                {formatBytes(syncStatus.storageUsed)} / {formatBytes(syncStatus.storageLimit)}
              </span>
            </div>
            <Progress value={getStoragePercentage()} className="h-2" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {Math.round(getStoragePercentage())}% of available offline storage used
            </div>
          </div>

          {getStoragePercentage() > 80 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                Storage is running low. Consider clearing old offline data or exporting your data.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={onClearOfflineData} variant="outline" size="sm">
              Clear Offline Data
            </Button>
            <Button
              onClick={() => onToggleOfflineMode(!syncStatus.offlineCapable)}
              variant="outline"
              size="sm"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {syncStatus.offlineCapable ? "Disable" : "Enable"} Offline Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes */}
      {offlineChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Changes ({offlineChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {offlineChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        change.type === "create"
                          ? "default"
                          : change.type === "update"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {change.type}
                    </Badge>
                    <div>
                      <span className="text-sm font-medium">{change.entity}</span>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {change.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {change.synced ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Conflicts */}
      {showConflicts && syncStatus.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Sync Conflicts ({syncStatus.conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus.conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="border border-orange-200 dark:border-orange-800 rounded-lg p-4"
              >
                <div className="mb-3">
                  <h4 className="font-medium text-sm mb-1">
                    {conflict.type.charAt(0).toUpperCase() + conflict.type.slice(1)} Conflict
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getConflictDescription(conflict)}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Conflict occurred: {conflict.timestamp.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Your Version (Local)
                    </h5>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {typeof conflict.localVersion === "object"
                        ? JSON.stringify(conflict.localVersion, null, 2)
                        : String(conflict.localVersion)}
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border">
                    <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Server Version
                    </h5>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      {typeof conflict.serverVersion === "object"
                        ? JSON.stringify(conflict.serverVersion, null, 2)
                        : String(conflict.serverVersion)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => onResolveConflict(conflict.id, "local")}
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Use Local
                  </Button>
                  <Button
                    onClick={() => onResolveConflict(conflict.id, "server")}
                    size="sm"
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    Use Server
                  </Button>
                  <Button
                    onClick={() => onResolveConflict(conflict.id, "merge")}
                    size="sm"
                    variant="outline"
                  >
                    Merge Both
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto Sync</label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Automatically sync changes when online
              </p>
            </div>
            <Button
              variant={autoSync ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoSync(!autoSync)}
            >
              {autoSync ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Interval</label>
            <div className="flex gap-2">
              {[15, 30, 60, 300].map((seconds) => (
                <Button
                  key={seconds}
                  variant={syncInterval === seconds ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSyncInterval(seconds)}
                >
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Sync Statistics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Total Syncs:</span>
                <span className="ml-2 font-medium">247</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Failed Syncs:</span>
                <span className="ml-2 font-medium">3</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Data Transferred:</span>
                <span className="ml-2 font-medium">2.4 MB</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Avg Sync Time:</span>
                <span className="ml-2 font-medium">1.2s</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
