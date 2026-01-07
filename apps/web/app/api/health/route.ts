import { NextResponse } from "next/server"
import { checkStartupPermissions, formatPermissionErrors } from "@/lib/startup-checks"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withApiLogging } from "@/lib/middleware/api-logger"
import {
  withApiVersion,
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
} from "@/lib/middleware/api-version"
import { API_ROUTES } from "@tasktrove/types/constants"
import type { HealthCheckResponse } from "@tasktrove/types/api-responses"
import { safeReadDataFile } from "@/lib/utils/safe-file-operations"
import { getAppVersion } from "@/lib/utils/version"
import { isPro } from "@/lib/utils/env"

export type HealthPreCheck = (
  permissionResult: Awaited<ReturnType<typeof checkStartupPermissions>>,
) => Promise<NextResponse | null> | NextResponse | null

export async function runHealthCheck(options: { preCheck?: HealthPreCheck } = {}) {
  try {
    const permissionResult = await checkStartupPermissions()
    const edition = isPro() ? "pro" : "base"
    const versionInfo = await getAppVersion()
    const serverVersion = versionInfo.version
    const preCheckResponse = options.preCheck ? await options.preCheck(permissionResult) : null

    if (preCheckResponse) {
      return preCheckResponse
    }

    if (permissionResult.success) {
      // Check if migration is needed
      if (permissionResult.dataFileCheck.needsMigration) {
        const payload: HealthCheckResponse = {
          status: "needs_migration",
          edition,
          serverVersion,
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
          message: "Data file needs to be migrated",
          dataFileCheck: permissionResult.dataFileCheck,
          migrationInfo: permissionResult.dataFileCheck.migrationInfo,
          timestamp: new Date().toISOString(),
        }
        return NextResponse.json<HealthCheckResponse>(payload)
      }

      const validatedDataFile = await safeReadDataFile()
      if (!validatedDataFile) {
        const payload: HealthCheckResponse = {
          status: "error",
          edition,
          serverVersion,
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
          message: "Data file validation failed",
          timestamp: new Date().toISOString(),
          migrationInfo: permissionResult.dataFileCheck.migrationInfo,
        }
        return NextResponse.json<HealthCheckResponse>(payload, { status: 500 })
      }

      const payload: HealthCheckResponse = {
        status: "healthy",
        edition,
        serverVersion,
        apiVersion: CURRENT_API_VERSION,
        supportedVersions: SUPPORTED_API_VERSIONS,
        message: "All permission checks passed",
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json<HealthCheckResponse>(payload)
    } else {
      // Handle data file initialization case
      if (permissionResult.dataFileCheck.needsInitialization) {
        const payload: HealthCheckResponse = {
          status: "needs_initialization",
          edition,
          serverVersion,
          apiVersion: CURRENT_API_VERSION,
          supportedVersions: SUPPORTED_API_VERSIONS,
          message: "Data file needs to be initialized",
          dataFileCheck: permissionResult.dataFileCheck,
          timestamp: new Date().toISOString(),
        }
        return NextResponse.json<HealthCheckResponse>(payload)
      }

      // Log errors to server console for Docker logs
      const errorMessage = formatPermissionErrors(permissionResult.errors)
      console.error("\n" + errorMessage)

      const payload: HealthCheckResponse = {
        status: "error",
        edition,
        serverVersion,
        apiVersion: CURRENT_API_VERSION,
        supportedVersions: SUPPORTED_API_VERSIONS,
        message: "Permission check failed",
        errors: permissionResult.errors,
        details: errorMessage,
        timestamp: new Date().toISOString(),
      }
      return NextResponse.json<HealthCheckResponse>(payload, { status: 500 })
    }
  } catch (error) {
    const errorMessage = `Health check failed: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMessage)
    const versionInfo = await getAppVersion()

    const payload: HealthCheckResponse = {
      status: "error",
      edition: isPro() ? "pro" : "base",
      serverVersion: versionInfo.version,
      apiVersion: CURRENT_API_VERSION,
      supportedVersions: SUPPORTED_API_VERSIONS,
      message: errorMessage,
      timestamp: new Date().toISOString(),
    }
    return NextResponse.json<HealthCheckResponse>(payload, { status: 500 })
  }
}

export const GET = withApiVersion(
  withMutexProtection(
    withApiLogging(() => runHealthCheck(), {
      endpoint: API_ROUTES.HEALTH,
      module: "api-v1-health",
    }),
  ),
)
