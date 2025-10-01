import { NextResponse } from "next/server"
import { checkStartupPermissions, formatPermissionErrors } from "@/lib/startup-checks"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withApiLogging, type EnhancedRequest } from "@/lib/middleware/api-logger"
import {
  withApiVersion,
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
} from "@/lib/middleware/api-version"
import { withAuthentication } from "@/lib/middleware/auth"
import { API_ROUTES } from "@/lib/types"

async function healthCheck(_request: EnhancedRequest) {
  try {
    const permissionResult = await checkStartupPermissions()

    if (permissionResult.success) {
      // Check if migration is needed
      if (permissionResult.dataFileCheck.needsMigration) {
        return NextResponse.json({
          status: "needs_migration",
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
          message: "Data file needs to be migrated",
          dataFileCheck: permissionResult.dataFileCheck,
          migrationInfo: permissionResult.dataFileCheck.migrationInfo,
          timestamp: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        status: "healthy",
        apiVersion: CURRENT_API_VERSION,
        supportedVersions: SUPPORTED_API_VERSIONS,
        message: "All permission checks passed",
        timestamp: new Date().toISOString(),
      })
    } else {
      // Handle data file initialization case
      if (permissionResult.dataFileCheck.needsInitialization) {
        return NextResponse.json({
          status: "needs_initialization",
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
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
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
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
        apiVersion: CURRENT_API_VERSION,
        supportedVersions: SUPPORTED_API_VERSIONS,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export const GET = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(healthCheck, {
        endpoint: API_ROUTES.HEALTH,
        module: "api-v1-health",
      }),
    ),
  ),
)
