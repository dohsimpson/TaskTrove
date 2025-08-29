import { NextResponse } from "next/server"
import { checkStartupPermissions, formatPermissionErrors } from "@/lib/startup-checks"
import { withMutexProtection } from "@/lib/utils/api-mutex"

async function healthCheck() {
  try {
    const permissionResult = await checkStartupPermissions()

    if (permissionResult.success) {
      // Check if migration is needed
      if (permissionResult.dataFileCheck.needsMigration) {
        return NextResponse.json({
          status: "needs_migration",
          message: "Data file needs to be migrated",
          dataFileCheck: permissionResult.dataFileCheck,
          migrationInfo: permissionResult.dataFileCheck.migrationInfo,
          timestamp: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        status: "healthy",
        message: "All permission checks passed",
        timestamp: new Date().toISOString(),
      })
    } else {
      // Handle data file initialization case
      if (permissionResult.dataFileCheck.needsInitialization) {
        return NextResponse.json({
          status: "needs_initialization",
          message: "Data file needs to be initialized",
          dataFileCheck: permissionResult.dataFileCheck,
          timestamp: new Date().toISOString(),
        })
      }

      // Log errors to server console for Docker logs
      const errorMessage = formatPermissionErrors(permissionResult.errors)
      console.error("\n" + errorMessage)

      return NextResponse.json(
        {
          status: "error",
          message: "Permission check failed",
          errors: permissionResult.errors,
          details: errorMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    const errorMessage = `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMessage)

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export const GET = withMutexProtection(healthCheck)
