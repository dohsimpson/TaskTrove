"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DEFAULT_DATA_DIR } from "@/lib/constants/defaults"

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
      <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          📂 First Time Setup
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-4 text-yellow-700 dark:text-yellow-300">
          <div>
            <strong>Welcome to TaskTrove!</strong> This appears to be your first time running the
            application.
          </div>

          <div className="text-sm">{healthStatus.dataFileCheck?.details}</div>

          <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-md text-sm">
            <div className="font-medium mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Important Notes:
            </div>
            <ul className="space-y-1 list-disc list-inside">
              <li>This will create a new data.json file in your {DEFAULT_DATA_DIR} directory</li>
              <li>This will only work if no data file currently exists (safe initialization)</li>
              <li>Your data should be stored in the mounted volume for persistence</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => initializeDataFile()}
              disabled={isInitializing || isChecking}
              size="sm"
            >
              {isInitializing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <FileText className="h-3 w-3 mr-2" />
                  Initialize Data File
                </>
              )}
            </Button>
            <Button
              onClick={checkHealth}
              disabled={isChecking || isInitializing}
              variant="outline"
              size="sm"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Retry Check
                </>
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Show error state
  if (healthStatus?.status === "error") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>🚨 TaskTrove Permission Error</AlertTitle>
        <AlertDescription className="mt-2 space-y-4">
          <div>
            <strong>Unable to start TaskTrove properly.</strong>
          </div>

          {healthStatus.errors && (
            <div className="space-y-2">
              {healthStatus.errors.map((error, index) => (
                <div key={index} className="border-l-2 border-red-400 pl-4">
                  <div className="font-medium">
                    ❌ {error.path}: {error.error}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{error.details}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md text-sm">
            <div className="font-medium mb-2">💡 Common solutions:</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>Check that volumes are properly mounted</li>
              <li>Ensure the host directory has correct permissions (chmod 755)</li>
              <li>Verify the container user ID matches the host user ID</li>
            </ul>

            <div className="mt-3">
              <div className="font-medium">📚 Docker run example:</div>
              <code className="block mt-1 bg-black text-green-400 p-2 rounded text-xs">
                docker run -v ./{DEFAULT_DATA_DIR}:/app/{DEFAULT_DATA_DIR} -p 3000:3000
                dohsimpson/tasktrove
              </code>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={checkHealth} disabled={isChecking} variant="outline" size="sm">
              {isChecking ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Retry Check
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
