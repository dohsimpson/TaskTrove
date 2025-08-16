"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface HealthCheckResponse {
  status: "healthy" | "error" | "needs_initialization"
  message: string
  errors?: Array<{ path: string; error: string; details: string }>
  details?: string
  dataFileCheck?: {
    exists: boolean
    needsInitialization?: boolean
    error?: string
    details?: string
  }
  timestamp: string
}

export function PermissionChecker() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const checkHealth = async () => {
    setIsChecking(true)
    try {
      const response = await fetch("/api/health")
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
    setIsInitializing(true)
    try {
      const response = await fetch("/api/data/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (response.ok) {
        // Re-check health after initialization
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
      setIsInitializing(false)
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
    // return (
    //   <Alert className="mb-4">
    //     <RefreshCw className="h-4 w-4 animate-spin" />
    //     <AlertTitle>Checking System Health</AlertTitle>
    //     <AlertDescription>Verifying permissions and system requirements...</AlertDescription>
    //   </Alert>
    // )
  }

  // Show data file initialization prompt
  if (healthStatus?.status === "needs_initialization") {
    return (
      <>
        <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            First Time Setup Required
          </AlertTitle>
          <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
            <div className="space-y-3">
              <div>
                <p className="text-sm">
                  ⚠️ Warning: Initializing will create a new data file and may permanently overwrite
                  existing TaskTrove data. Back up your data first if you have any existing tasks,
                  projects, or settings.
                </p>
                <p className="text-sm mt-1">
                  <a
                    href="https://docs.tasktrove.io/troubleshooting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-600 dark:hover:text-yellow-200"
                  >
                    Troubleshooting Guide
                  </a>
                  {" • "}
                  <a
                    href="https://docs.tasktrove.io/backup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-600 dark:hover:text-yellow-200"
                  >
                    Backup guide
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isInitializing || isChecking}
                  size="sm"
                  variant="outline"
                >
                  {isInitializing ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Initialize"
                  )}
                </Button>
                <Button
                  onClick={checkHealth}
                  disabled={isChecking || isInitializing}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      <span>Recheck</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Data Initialization</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new data file for TaskTrove. If you have existing TaskTrove data,
                it may be permanently overwritten and cannot be recovered.
                <br />
                <br />
                <strong>Make sure you have backed up any existing data before proceeding.</strong>
                <br />
                <br />
                Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="outline"
                  className="border border-red-600 text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent cursor-pointer"
                  onClick={() => {
                    setShowConfirmDialog(false)
                    initializeDataFile()
                  }}
                >
                  Initialize Data File
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Show error state
  if (healthStatus?.status === "error") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">Permission Error</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col">
          <div className="space-y-3">
            <span className="text-sm">
              Unable to access data directory. Check volume mounts and permissions.{" "}
              <a
                href="https://docs.tasktrove.io/troubleshooting"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-300"
              >
                Troubleshooting Guide
              </a>
            </span>
            <Button
              onClick={checkHealth}
              disabled={isChecking}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span>Recheck</span>
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
