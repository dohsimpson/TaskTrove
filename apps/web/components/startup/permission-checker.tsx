"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, FileText, DatabaseBackup } from "lucide-react"
import { StartupAlert } from "./startup-alert"
import { API_ROUTES } from "@/lib/types"
import { useAtomValue } from "jotai"
import { queryClientAtom } from "@tasktrove/atoms/data/base/query"

interface HealthCheckResponse {
  status: "healthy" | "error" | "needs_initialization" | "needs_migration"
  message: string
  errors?: Array<{ path: string; error: string; details: string }>
  details?: string
  dataFileCheck?: {
    exists: boolean
    needsInitialization?: boolean
    needsMigration?: boolean
    error?: string
    details?: string
  }
  migrationInfo?: {
    currentVersion: string
    targetVersion: string
    needsMigration: boolean
  }
  timestamp: string
}

export function PermissionChecker() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const queryClient = useAtomValue(queryClientAtom)

  const checkHealth = async () => {
    setIsChecking(true)
    try {
      const response = await fetch(API_ROUTES.HEALTH)
      const data: HealthCheckResponse = await response.json()
      setHealthStatus(data)
    } catch (error) {
      setHealthStatus({
        status: "error",
        message: `Failed to check system health: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsChecking(false)
    }
  }

  const initializeDataFile = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(API_ROUTES.DATA_INITIALIZE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        // Invalidate all queries to refresh data after initialization
        queryClient.invalidateQueries()
        await checkHealth()
      } else {
        setHealthStatus({
          status: "error",
          message: data.message || "Failed to initialize data file",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      setHealthStatus({
        status: "error",
        message: `Failed to initialize data file: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const migrateDataFile = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(API_ROUTES.DATA_MIGRATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        await checkHealth()
        window.location.reload()
      } else {
        setHealthStatus({
          status: "error",
          message: data.message || "Failed to migrate data file",
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      setHealthStatus({
        status: "error",
        message: `Failed to migrate data file: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  // Don't show anything if healthy
  if (healthStatus?.status === "healthy") {
    return null
  }

  // Show loading state
  if (isChecking) {
    console.log("Checking system health...")
    return null
  }

  // Show migration prompt
  if (healthStatus?.status === "needs_migration" && healthStatus.migrationInfo) {
    return (
      <StartupAlert
        icon={DatabaseBackup}
        title="Data Migration Available"
        variant="info"
        actions={{
          primary: {
            label: "Migrate Now",
            onClick: migrateDataFile,
            loading: isProcessing,
            loadingLabel: "Migrating...",
            confirmDialog: {
              title: "Confirm Data Migration",
              description: (
                <div>
                  This will migrate your TaskTrove data from version{" "}
                  {healthStatus.migrationInfo.currentVersion} to{" "}
                  {healthStatus.migrationInfo.targetVersion}.
                  <br />
                  <br />
                  <strong>Are you ready to proceed?</strong>
                </div>
              ),
              confirmLabel: "Start Migration",
            },
          },
        }}
        showConfirmDialog={showConfirmDialog}
        onConfirmDialogChange={setShowConfirmDialog}
      >
        <p className="text-sm">
          Your data needs to be migrated from version {healthStatus.migrationInfo.currentVersion} to{" "}
          {healthStatus.migrationInfo.targetVersion}.
        </p>
        <p className="text-sm mt-2">
          This migration will update your data files to support new features. We recommend{" "}
          <a
            href="https://docs.tasktrove.io/backup"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 dark:hover:text-blue-200"
          >
            backing up your data
          </a>{" "}
          before proceeding.
          <br />
          Learn more about{" "}
          <a
            href="https://docs.tasktrove.io/upgrading"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 dark:hover:text-blue-200"
          >
            upgrading TaskTrove
          </a>{" "}
          or see{" "}
          <a
            href="https://docs.tasktrove.io/troubleshooting"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 dark:hover:text-blue-200"
          >
            troubleshooting
          </a>{" "}
          if you encounter issues.
        </p>
      </StartupAlert>
    )
  }

  // Show data file initialization prompt
  if (healthStatus?.status === "needs_initialization") {
    return (
      <StartupAlert
        icon={FileText}
        title="First Time Setup Required"
        variant="warning"
        actions={{
          primary: {
            label: "Initialize",
            onClick: initializeDataFile,
            loading: isProcessing,
            loadingLabel: "Initializing...",
            confirmDialog: {
              title: "Confirm Data Initialization",
              description: (
                <div>
                  This will create a new data file for TaskTrove. If you have existing TaskTrove
                  data, it may be permanently overwritten and cannot be recovered.
                  <br />
                  <br />
                  Are you sure you want to continue?
                </div>
              ),
              confirmLabel: "Initialize Data File",
              confirmVariant: "destructive",
            },
          },
          recheck: {
            onClick: checkHealth,
            loading: isChecking,
          },
        }}
        links={[
          { href: "https://docs.tasktrove.io/troubleshooting", label: "Troubleshooting Guide" },
          { href: "https://docs.tasktrove.io/backup", label: "Backup guide" },
        ]}
        showConfirmDialog={showConfirmDialog}
        onConfirmDialogChange={setShowConfirmDialog}
      >
        <p className="text-sm">
          ⚠️ Warning: Initializing will create a new data file and may permanently overwrite
          existing TaskTrove data. Back up your data first if you have any existing tasks, projects,
          or settings.
        </p>
      </StartupAlert>
    )
  }

  // Show error state
  if (healthStatus?.status === "error") {
    return (
      <StartupAlert
        icon={AlertTriangle}
        title="Permission Error"
        variant="destructive"
        actions={{
          recheck: {
            onClick: checkHealth,
            loading: isChecking,
          },
        }}
        links={[
          { href: "https://docs.tasktrove.io/troubleshooting", label: "Troubleshooting Guide" },
        ]}
      >
        <span className="text-sm">
          Unable to access data directory. Check volume mounts and permissions.
        </span>
      </StartupAlert>
    )
  }

  return null
}
