import { NextResponse } from "next/server"
import { runBackup } from "@/lib/backup"
import { withMutexProtection } from "@/lib/utils/api-mutex"
import { withAuthentication } from "@/lib/middleware/auth"
import { withApiVersion } from "@/lib/middleware/api-version"
import { withApiLogging, type EnhancedRequest } from "@/lib/middleware/api-logger"
import { ApiErrorCode, ErrorResponse, API_ROUTES } from "@/lib/types"

async function createBackup(_request: EnhancedRequest) {
  try {
    console.log("Manual backup triggered via API...")
    await runBackup()

    return NextResponse.json({
      success: true,
      message: "Backup completed successfully",
    })
  } catch (error) {
    console.error("Manual backup failed:", error)

    const errorResponse: ErrorResponse = {
      code: ApiErrorCode.BACKUP_FAILED,
      error: "Backup failed",
      message: error instanceof Error ? error.message : "Unknown error occurred during backup",
    }

    return NextResponse.json<ErrorResponse>(errorResponse, { status: 500 })
  }
}

export const POST = withApiVersion(
  withMutexProtection(
    withAuthentication(
      withApiLogging(createBackup, {
        endpoint: API_ROUTES.BACKUP,
        module: "api-v1-backup",
      }),
    ),
  ),
)
